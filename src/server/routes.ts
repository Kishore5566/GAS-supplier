import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gas-cylinder-fleet-secret-key-2026';

// --- AUTH MIDDLEWARE ---
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role authorization helper
export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Permission denied. Requires one of: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

// Helper to record an immutable audit event
function recordEvent(
  cylinderId: string,
  eventType: string,
  title: string,
  description: string,
  performedBy: string,
  role: string,
  location: string
) {
  const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO cylinder_events (id, cylinder_id, event_type, title, description, performed_by, role, location, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(eventId, cylinderId, eventType, title, description, performedBy, role, location, now);
}

// --- 1. AUTH ROUTES ---
router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

router.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

router.get('/auth/demo-users', (_req: Request, res: Response) => {
  const users = db.prepare('SELECT id, email, name, role FROM users').all();
  res.json({ users });
});

// --- 2. DASHBOARD STATS ---
router.get('/dashboard', authMiddleware, (_req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const totalCylinders = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status != 'archived'").get() as any).count;
  const availableEmpty = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'empty_depot'").get() as any).count;
  const filledReady = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'filled_ready' AND is_safety_flagged = 0").get() as any).count;
  const inRefill = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'in_refill'").get() as any).count;
  const inTransit = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'in_transit'").get() as any).count;
  const withCustomer = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'with_customer'").get() as any).count;
  const underMaintenance = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE status = 'under_maintenance'").get() as any).count;
  const flaggedSafety = (db.prepare("SELECT COUNT(*) as count FROM cylinders WHERE is_safety_flagged = 1").get() as any).count;

  // Upcoming inspections (due within 30 days)
  const upcomingInspections = (db.prepare(`
    SELECT COUNT(*) as count FROM cylinders
    WHERE status != 'archived' AND next_inspection_date >= ? AND next_inspection_date <= ?
  `).get(today, in30Days) as any).count;

  // Overdue inspections (due date < today)
  const overdueInspections = (db.prepare(`
    SELECT COUNT(*) as count FROM cylinders
    WHERE status != 'archived' AND next_inspection_date < ?
  `).get(today) as any).count;

  // Overdue returns (>25 days with customer)
  const overdueReturns = (db.prepare(`
    SELECT COUNT(*) as count FROM cylinders
    WHERE status = 'with_customer' AND last_refill_date < date('now', '-25 days')
  `).get() as any).count;

  // Gas stock breakdown
  const gasBreakdown = db.prepare(`
    SELECT gas_type,
           SUM(CASE WHEN status = 'filled_ready' AND is_safety_flagged = 0 THEN 1 ELSE 0 END) as filled,
           SUM(CASE WHEN status = 'empty_depot' THEN 1 ELSE 0 END) as empty,
           SUM(CASE WHEN status = 'in_refill' THEN 1 ELSE 0 END) as in_refill,
           SUM(CASE WHEN status = 'with_customer' THEN 1 ELSE 0 END) as with_customer,
           COUNT(*) as total
    FROM cylinders
    WHERE status != 'archived'
    GROUP BY gas_type
  `).all();

  // Low stock alerts (if filled < 2 for any gas type)
  const lowStockAlerts = (gasBreakdown as any[]).filter(g => g.filled <= 1);

  // Critical inspection / safety alerts
  const criticalCylinders = db.prepare(`
    SELECT id, serial_number, gas_type, status, current_location, flag_reason, next_inspection_date, is_safety_flagged
    FROM cylinders
    WHERE is_safety_flagged = 1 OR next_inspection_date < date('now')
    ORDER BY is_safety_flagged DESC, next_inspection_date ASC
    LIMIT 6
  `).all();

  // Recent activity audit events
  const recentEvents = db.prepare(`
    SELECT * FROM cylinder_events
    ORDER BY timestamp DESC
    LIMIT 10
  `).all();

  // Active delivery orders summary
  const activeOrders = db.prepare(`
    SELECT COUNT(*) as count FROM delivery_orders
    WHERE status IN ('pending', 'dispatched')
  `).get() as any;

  res.json({
    metrics: {
      totalCylinders,
      availableEmpty,
      filledReady,
      inRefill,
      inTransit,
      withCustomer,
      overdueReturns,
      underMaintenance,
      flaggedSafety,
      upcomingInspections,
      overdueInspections,
      activeOrders: activeOrders.count
    },
    gasBreakdown,
    lowStockAlerts,
    criticalCylinders,
    recentEvents
  });
});

// --- 3. CYLINDERS CRUD & SEARCH ---
router.get('/cylinders', authMiddleware, (req: AuthRequest, res: Response) => {
  const { search, status, gas_type, location, inspection_filter } = req.query as any;

  let query = 'SELECT * FROM cylinders WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    if (status === 'flagged_safety') {
      query += ' AND is_safety_flagged = 1';
    } else {
      query += ' AND status = ?';
      params.push(status);
    }
  } else {
    // hide archived by default unless asked
    query += " AND status != 'archived'";
  }

  if (gas_type && gas_type !== 'all') {
    query += ' AND gas_type = ?';
    params.push(gas_type);
  }

  if (location && location !== 'all') {
    query += ' AND current_location LIKE ?';
    params.push(`%${location}%`);
  }

  if (inspection_filter === 'overdue') {
    query += " AND next_inspection_date < date('now')";
  } else if (inspection_filter === 'due_30_days') {
    query += " AND next_inspection_date >= date('now') AND next_inspection_date <= date('now', '+30 days')";
  }

  if (search && search.trim() !== '') {
    query += ' AND (id LIKE ? OR serial_number LIKE ? OR barcode LIKE ? OR current_location LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY is_safety_flagged DESC, id ASC';
  const cylinders = db.prepare(query).all(...params);
  res.json({ cylinders });
});

router.get('/cylinders/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id) as any;
  if (!cylinder) {
    return res.status(404).json({ error: 'Cylinder not found' });
  }

  const events = db.prepare('SELECT * FROM cylinder_events WHERE cylinder_id = ? ORDER BY timestamp DESC').all(req.params.id);
  const inspections = db.prepare('SELECT * FROM inspections_maintenance WHERE cylinder_id = ? ORDER BY created_at DESC').all(req.params.id);
  const refills = db.prepare('SELECT * FROM refill_logs WHERE cylinder_id = ? ORDER BY created_at DESC').all(req.params.id);
  const deliveryHistory = db.prepare(`
    SELECT dci.*, o.scheduled_date, o.customer_name, o.delivery_address, o.status as order_status
    FROM delivery_cylinder_items dci
    JOIN delivery_orders o ON dci.order_id = o.id
    WHERE dci.cylinder_id = ?
    ORDER BY dci.created_at DESC
  `).all(req.params.id);

  let currentCustomer = null;
  if (cylinder.current_customer_id) {
    currentCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(cylinder.current_customer_id);
  }

  res.json({
    cylinder,
    events,
    inspections,
    refills,
    deliveryHistory,
    currentCustomer
  });
});

router.post('/cylinders', authMiddleware, requireRole(['Admin', 'Inventory Manager']), (req: AuthRequest, res: Response) => {
  const {
    id,
    serial_number,
    barcode,
    gas_type,
    gas_grade,
    capacity_liters,
    working_pressure_bar,
    tare_weight_kg,
    status = 'empty_depot',
    current_location = 'Central Depot - Intake Bay',
    next_inspection_date
  } = req.body;

  if (!id || !serial_number || !gas_type || !capacity_liters || !working_pressure_bar || !tare_weight_kg || !next_inspection_date) {
    return res.status(400).json({ error: 'All primary cylinder specifications are required' });
  }

  const finalBarcode = barcode || `BAR-${serial_number.replace(/\s+/g, '')}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO cylinders (
        id, serial_number, barcode, gas_type, gas_grade, capacity_liters, working_pressure_bar, tare_weight_kg,
        status, current_location, current_customer_id, current_order_id, last_refill_date, last_refill_batch,
        last_inspection_date, next_inspection_date, is_safety_flagged, flag_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, null, null, ?, ?, 0, null, ?, ?)
    `).run(
      id,
      serial_number,
      finalBarcode,
      gas_type,
      gas_grade || 'Industrial',
      parseFloat(capacity_liters),
      parseFloat(working_pressure_bar),
      parseFloat(tare_weight_kg),
      status,
      current_location,
      now.split('T')[0],
      next_inspection_date,
      now,
      now
    );

    recordEvent(
      id,
      'Created',
      'Cylinder Commissioned',
      `Commissioned ${gas_type} cylinder (${capacity_liters}L, ${working_pressure_bar} bar) with serial ${serial_number}.`,
      req.user!.name,
      req.user!.role,
      current_location
    );

    const created = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(id);
    res.status(201).json({ cylinder: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create cylinder. ID or Serial must be unique.' });
  }
});

router.put('/cylinders/:id', authMiddleware, requireRole(['Admin', 'Inventory Manager', 'Technician']), (req: AuthRequest, res: Response) => {
  const {
    current_location,
    tare_weight_kg,
    next_inspection_date,
    gas_grade,
    status
  } = req.body;

  const current = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id) as any;
  if (!current) {
    return res.status(404).json({ error: 'Cylinder not found' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE cylinders
    SET current_location = COALESCE(?, current_location),
        tare_weight_kg = COALESCE(?, tare_weight_kg),
        next_inspection_date = COALESCE(?, next_inspection_date),
        gas_grade = COALESCE(?, gas_grade),
        status = COALESCE(?, status),
        updated_at = ?
    WHERE id = ?
  `).run(
    current_location,
    tare_weight_kg ? parseFloat(tare_weight_kg) : null,
    next_inspection_date,
    gas_grade,
    status,
    now,
    req.params.id
  );

  recordEvent(
    req.params.id,
    'Updated',
    'Cylinder Record Modified',
    `Updated parameters: Location: ${current_location || current.current_location}, Status: ${status || current.status}.`,
    req.user!.name,
    req.user!.role,
    current_location || current.current_location
  );

  const updated = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id);
  res.json({ cylinder: updated });
});

// Safety Flagging (Leak / Damage / Critical safety lockout)
router.post('/cylinders/:id/flag-safety', authMiddleware, requireRole(['Admin', 'Technician', 'Inventory Manager', 'Delivery Staff']), (req: AuthRequest, res: Response) => {
  const { reason, location = 'Depot Quarantine' } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Reason for safety flag is required' });
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id) as any;
  if (!cylinder) {
    return res.status(404).json({ error: 'Cylinder not found' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE cylinders
    SET is_safety_flagged = 1,
        status = 'flagged_leaking',
        flag_reason = ?,
        current_location = ?,
        updated_at = ?
    WHERE id = ?
  `).run(reason, location, now, req.params.id);

  recordEvent(
    req.params.id,
    'Flagged_Unsafe',
    'Safety Lock Engaged - Unsafe Cylinder Flagged',
    reason,
    req.user!.name,
    req.user!.role,
    location
  );

  // Auto-schedule an urgent inspection
  const inspId = `INSP-${Date.now()}`;
  db.prepare(`
    INSERT INTO inspections_maintenance (
      id, cylinder_id, type, priority, technician_id, technician_name, scheduled_date,
      test_result, leak_detected, issue_description, next_due_date, created_at
    ) VALUES (?, ?, 'Ultrasonic Leak Check', 'Critical', ?, ?, ?, 'Pending', 1, ?, ?, ?)
  `).run(
    inspId,
    req.params.id,
    req.user!.id,
    req.user!.name,
    now.split('T')[0],
    `Safety Flagged: ${reason}`,
    now.split('T')[0],
    now
  );

  const updated = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id);
  res.json({ cylinder: updated, message: 'Cylinder safety flagged and locked from dispatch/refill.' });
});

// Clear Safety Flag (Requires Technician or Admin)
router.post('/cylinders/:id/clear-safety', authMiddleware, requireRole(['Admin', 'Technician']), (req: AuthRequest, res: Response) => {
  const { resolution_notes, new_status = 'empty_depot', new_location = 'Central Depot' } = req.body;
  if (!resolution_notes) {
    return res.status(400).json({ error: 'Resolution notes are required to clear safety lock' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE cylinders
    SET is_safety_flagged = 0,
        flag_reason = NULL,
        status = ?,
        current_location = ?,
        updated_at = ?
    WHERE id = ?
  `).run(new_status, new_location, now, req.params.id);

  recordEvent(
    req.params.id,
    'Safety_Cleared',
    'Safety Lock Cleared by Technician',
    `Safety clearance approved: ${resolution_notes}`,
    req.user!.name,
    req.user!.role,
    new_location
  );

  const updated = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id);
  res.json({ cylinder: updated, message: 'Safety flag cleared. Cylinder returned to active rotation.' });
});

// Archive cylinder
router.post('/cylinders/:id/archive', authMiddleware, requireRole(['Admin']), (req: AuthRequest, res: Response) => {
  const { reason = 'Decommissioned from service' } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE cylinders
    SET status = 'archived',
        updated_at = ?
    WHERE id = ?
  `).run(now, req.params.id);

  recordEvent(
    req.params.id,
    'Archived',
    'Cylinder Decommissioned & Archived',
    reason,
    req.user!.name,
    req.user!.role,
    'Decommission Archive'
  );

  res.json({ message: 'Cylinder archived' });
});

// --- 4. REFILLING OPERATIONS ---
router.get('/refills', authMiddleware, (_req: AuthRequest, res: Response) => {
  const logs = db.prepare(`
    SELECT r.*, c.serial_number, c.capacity_liters, c.working_pressure_bar
    FROM refill_logs r
    LEFT JOIN cylinders c ON r.cylinder_id = c.id
    ORDER BY r.created_at DESC
    LIMIT 100
  `).all();

  // Cylinders currently waiting for refill or in process
  const pendingCylinders = db.prepare(`
    SELECT * FROM cylinders
    WHERE status IN ('empty_depot', 'in_refill') AND is_safety_flagged = 0
    ORDER BY status DESC, id ASC
  `).all();

  res.json({ logs, pendingCylinders });
});

// Move cylinder to Refill Bay (validation: cannot if safety flagged or inspection overdue!)
router.post('/refills/start', authMiddleware, requireRole(['Admin', 'Inventory Manager', 'Technician']), (req: AuthRequest, res: Response) => {
  const { cylinder_id, station = 'Refill Station #1' } = req.body;
  if (!cylinder_id) {
    return res.status(400).json({ error: 'Cylinder ID required' });
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(cylinder_id) as any;
  if (!cylinder) {
    return res.status(404).json({ error: 'Cylinder not found' });
  }

  // SAFETY RULE CHECK:
  if (cylinder.is_safety_flagged) {
    return res.status(400).json({
      error: `SAFETY VIOLATION: Cylinder ${cylinder.id} is safety-flagged (${cylinder.flag_reason || 'Unsafe condition'}). Refill forbidden until cleared by technician.`
    });
  }

  const today = new Date().toISOString().split('T')[0];
  if (cylinder.next_inspection_date < today) {
    return res.status(400).json({
      error: `SAFETY VIOLATION: Cylinder ${cylinder.id} is overdue for periodic inspection (due: ${cylinder.next_inspection_date}). It must pass hydrostatic/leak testing before refilling.`
    });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE cylinders
    SET status = 'in_refill',
        current_location = ?,
        updated_at = ?
    WHERE id = ?
  `).run(station, now, cylinder_id);

  recordEvent(
    cylinder_id,
    'Refill_Started',
    `Queued for Refilling at ${station}`,
    `Moved to refilling station manifold. Gas specification: ${cylinder.gas_type} (${cylinder.gas_grade}).`,
    req.user!.name,
    req.user!.role,
    station
  );

  res.json({ message: 'Cylinder moved to refill station', cylinder_id });
});

// Complete Refill process
router.post('/refills/complete', authMiddleware, requireRole(['Admin', 'Inventory Manager', 'Technician']), (req: AuthRequest, res: Response) => {
  const {
    cylinder_id,
    batch_number,
    fill_pressure_bar,
    purity_percentage,
    result = 'Passed',
    failure_reason,
    destination_bay = 'Central Depot - Ready Rack'
  } = req.body;

  if (!cylinder_id || !batch_number || !fill_pressure_bar || !purity_percentage) {
    return res.status(400).json({ error: 'Cylinder ID, Batch Number, Pressure, and Purity are required' });
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(cylinder_id) as any;
  if (!cylinder) {
    return res.status(404).json({ error: 'Cylinder not found' });
  }

  // SAFETY RULE CHECK:
  if (cylinder.is_safety_flagged) {
    return res.status(400).json({
      error: 'CRITICAL SAFETY BLOCK: Cannot complete refill on a safety-flagged cylinder.'
    });
  }

  const today = new Date().toISOString().split('T')[0];
  if (cylinder.next_inspection_date < today) {
    return res.status(400).json({
      error: 'CRITICAL SAFETY BLOCK: Cylinder inspection is overdue. Refill cannot be approved.'
    });
  }

  const refillId = `REF-${Date.now()}`;
  const now = new Date().toISOString();

  // Insert Refill log
  db.prepare(`
    INSERT INTO refill_logs (
      id, cylinder_id, batch_number, gas_type, fill_pressure_bar, purity_percentage,
      operator_id, operator_name, refill_date, result, failure_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    refillId,
    cylinder_id,
    batch_number,
    cylinder.gas_type,
    parseFloat(fill_pressure_bar),
    parseFloat(purity_percentage),
    req.user!.id,
    req.user!.name,
    now,
    result,
    failure_reason || null,
    now
  );

  if (result === 'Passed') {
    db.prepare(`
      UPDATE cylinders
      SET status = 'filled_ready',
          last_refill_date = ?,
          last_refill_batch = ?,
          current_location = ?,
          updated_at = ?
      WHERE id = ?
    `).run(today, batch_number, destination_bay, now, cylinder_id);

    recordEvent(
      cylinder_id,
      'Refilled',
      `Refill Certified - ${cylinder.gas_type}`,
      `Refill batch ${batch_number} passed at ${fill_pressure_bar} bar (${purity_percentage}% purity). Ready for delivery.`,
      req.user!.name,
      req.user!.role,
      destination_bay
    );
  } else {
    // Failed refill: flag cylinder and send to quarantine
    db.prepare(`
      UPDATE cylinders
      SET is_safety_flagged = 1,
          status = 'flagged_leaking',
          flag_reason = ?,
          current_location = 'Refill Quarantine Bay',
          updated_at = ?
      WHERE id = ?
    `).run(`Refill Failed: ${failure_reason || 'Pressure/Purity test anomaly'}`, now, cylinder_id);

    recordEvent(
      cylinder_id,
      'Refill_Failed',
      'Refill Test Failed - Quarantined',
      `Refill batch ${batch_number} rejected: ${failure_reason || 'Failed quality hold'}. Safety flag engaged.`,
      req.user!.name,
      req.user!.role,
      'Refill Quarantine Bay'
    );
  }

  res.json({ message: `Refill recorded as ${result}`, refill_id: refillId });
});

// --- 5. MAINTENANCE & LEAK INSPECTIONS ---
router.get('/inspections', authMiddleware, (req: AuthRequest, res: Response) => {
  const { priority, result } = req.query as any;

  let query = `
    SELECT im.*, c.serial_number, c.gas_type, c.status as cylinder_status, c.current_location
    FROM inspections_maintenance im
    LEFT JOIN cylinders c ON im.cylinder_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (priority && priority !== 'all') {
    query += ' AND im.priority = ?';
    params.push(priority);
  }

  if (result && result !== 'all') {
    query += ' AND im.test_result = ?';
    params.push(result);
  }

  query += " ORDER BY CASE im.test_result WHEN 'Pending' THEN 0 ELSE 1 END, im.scheduled_date DESC";
  const inspections = db.prepare(query).all(...params);

  // Cylinders needing inspection
  const cylindersNeedingInspection = db.prepare(`
    SELECT * FROM cylinders
    WHERE status != 'archived' AND (is_safety_flagged = 1 OR next_inspection_date <= date('now', '+30 days'))
    ORDER BY is_safety_flagged DESC, next_inspection_date ASC
  `).all();

  res.json({ inspections, cylindersNeedingInspection });
});

// Schedule an inspection / maintenance
router.post('/inspections', authMiddleware, requireRole(['Admin', 'Technician', 'Inventory Manager']), (req: AuthRequest, res: Response) => {
  const {
    cylinder_id,
    type,
    priority = 'Medium',
    scheduled_date,
    issue_description
  } = req.body;

  if (!cylinder_id || !type || !scheduled_date || !issue_description) {
    return res.status(400).json({ error: 'Cylinder ID, test type, scheduled date, and issue description required' });
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(cylinder_id) as any;
  if (!cylinder) {
    return res.status(404).json({ error: 'Cylinder not found' });
  }

  const inspId = `INSP-${Date.now()}`;
  const now = new Date().toISOString();

  // If priority is Critical or leak suspected, automatically engage safety flag
  const isCritical = priority === 'Critical';

  db.prepare(`
    INSERT INTO inspections_maintenance (
      id, cylinder_id, type, priority, technician_id, technician_name, scheduled_date,
      test_result, leak_detected, issue_description, next_due_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)
  `).run(
    inspId,
    cylinder_id,
    type,
    priority,
    req.user!.id,
    req.user!.name,
    scheduled_date,
    isCritical ? 1 : 0,
    issue_description,
    scheduled_date,
    now
  );

  // Move cylinder to under maintenance
  db.prepare(`
    UPDATE cylinders
    SET status = 'under_maintenance',
        current_location = 'Maintenance & Testing Workshop',
        is_safety_flagged = CASE WHEN ? = 1 THEN 1 ELSE is_safety_flagged END,
        flag_reason = CASE WHEN ? = 1 THEN ? ELSE flag_reason END,
        updated_at = ?
    WHERE id = ?
  `).run(isCritical ? 1 : 0, isCritical ? 1 : 0, `Scheduled Maintenance: ${issue_description}`, now, cylinder_id);

  recordEvent(
    cylinder_id,
    'Inspection_Scheduled',
    `Maintenance Scheduled: ${type}`,
    `Priority: ${priority}. Notes: ${issue_description}`,
    req.user!.name,
    req.user!.role,
    'Maintenance & Testing Workshop'
  );

  res.status(201).json({ message: 'Inspection scheduled', inspection_id: inspId });
});

// Record Completed Inspection / Leak Test
router.post('/inspections/:id/record', authMiddleware, requireRole(['Admin', 'Technician']), (req: AuthRequest, res: Response) => {
  const {
    test_result,
    certificate_number,
    leak_detected = false,
    action_taken,
    next_due_date,
    return_status = 'empty_depot'
  } = req.body;

  if (!test_result || !next_due_date) {
    return res.status(400).json({ error: 'Test result and next due date required' });
  }

  const inspection = db.prepare('SELECT * FROM inspections_maintenance WHERE id = ?').get(req.params.id) as any;
  if (!inspection) {
    return res.status(404).json({ error: 'Inspection record not found' });
  }

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  db.prepare(`
    UPDATE inspections_maintenance
    SET completed_date = ?,
        test_result = ?,
        certificate_number = ?,
        leak_detected = ?,
        action_taken = ?,
        next_due_date = ?,
        technician_id = ?,
        technician_name = ?
    WHERE id = ?
  `).run(
    today,
    test_result,
    certificate_number || null,
    leak_detected ? 1 : 0,
    action_taken || null,
    next_due_date,
    req.user!.id,
    req.user!.name,
    req.params.id
  );

  // Safety logic based on test outcome
  if (test_result === 'Passed' && !leak_detected) {
    // Passed test: clears safety flag, updates last inspection date and next due date
    db.prepare(`
      UPDATE cylinders
      SET is_safety_flagged = 0,
          flag_reason = NULL,
          status = ?,
          current_location = 'Central Depot - Verified Staging',
          last_inspection_date = ?,
          next_inspection_date = ?,
          updated_at = ?
      WHERE id = ?
    `).run(return_status, today, next_due_date, now, inspection.cylinder_id);

    recordEvent(
      inspection.cylinder_id,
      'Inspection_Passed',
      `Inspection Passed: ${inspection.type}`,
      `Passed inspection. Certificate: ${certificate_number || 'N/A'}. Next due: ${next_due_date}. Action: ${action_taken || 'Inspected nominal'}.`,
      req.user!.name,
      req.user!.role,
      'Central Depot'
    );
  } else if (test_result === 'Decommissioned') {
    // Cylinder is beyond repair
    db.prepare(`
      UPDATE cylinders
      SET status = 'archived',
          is_safety_flagged = 1,
          flag_reason = 'Decommissioned following failed inspection',
          current_location = 'Scrap Quarantine Yard',
          updated_at = ?
      WHERE id = ?
    `).run(now, inspection.cylinder_id);

    recordEvent(
      inspection.cylinder_id,
      'Archived',
      'Cylinder Decommissioned Permanently',
      `Failed ${inspection.type}. Condemned and removed from service fleet. ${action_taken || ''}`,
      req.user!.name,
      req.user!.role,
      'Scrap Quarantine Yard'
    );
  } else {
    // Failed or Leak Detected: keep locked down
    db.prepare(`
      UPDATE cylinders
      SET is_safety_flagged = 1,
          status = 'flagged_leaking',
          flag_reason = ?,
          current_location = 'Quarantine Leak Containment Cell',
          updated_at = ?
      WHERE id = ?
    `).run(`Inspection Failed: ${action_taken || 'Leak detected during test'}`, now, inspection.cylinder_id);

    recordEvent(
      inspection.cylinder_id,
      'Inspection_Failed',
      `Inspection Failed: ${inspection.type}`,
      `Failed safety criteria. Leak detected: ${leak_detected ? 'YES' : 'NO'}. Action: ${action_taken || 'Quarantined.'}`,
      req.user!.name,
      req.user!.role,
      'Quarantine Leak Containment Cell'
    );
  }

  res.json({ message: 'Inspection completed and cylinder status updated' });
});

// --- 6. CUSTOMERS & DELIVERY MANAGEMENT ---
router.get('/customers', authMiddleware, (_req: AuthRequest, res: Response) => {
  const customers = db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM cylinders WHERE current_customer_id = c.id AND status = 'with_customer') as live_cylinder_count
    FROM customers c
    ORDER BY c.name ASC
  `).all();
  res.json({ customers });
});

router.post('/customers', authMiddleware, requireRole(['Admin', 'Inventory Manager']), (req: AuthRequest, res: Response) => {
  const { code, name, company, email, phone, delivery_address, city, category } = req.body;
  if (!name || !company || !delivery_address) {
    return res.status(400).json({ error: 'Customer name, company, and address required' });
  }

  const custId = `CUST-${Date.now().toString().slice(-4)}`;
  const custCode = code || `C-${company.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 100)}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO customers (id, code, name, company, email, phone, delivery_address, city, category, active_cylinder_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(custId, custCode, name, company, email || '', phone || '', delivery_address, city || 'Metro Area', category || 'Industrial Fabrication', now);

    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
    res.status(201).json({ customer: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Customer code must be unique' });
  }
});

// Delivery Orders
router.get('/orders', authMiddleware, (req: AuthRequest, res: Response) => {
  const { status, customer_id } = req.query as any;

  let query = 'SELECT * FROM delivery_orders WHERE 1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (customer_id && customer_id !== 'all') {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  query += ' ORDER BY scheduled_date DESC, created_at DESC';
  const orders = db.prepare(query).all(...params) as any[];

  // Attach cylinder items to orders
  const ordersWithItems = orders.map(ord => {
    const items = db.prepare(`
      SELECT dci.*, c.serial_number, c.capacity_liters, c.barcode, c.status as current_cylinder_status
      FROM delivery_cylinder_items dci
      LEFT JOIN cylinders c ON dci.cylinder_id = c.id
      WHERE dci.order_id = ?
    `).all(ord.id);
    return { ...ord, items };
  });

  res.json({ orders: ordersWithItems });
});

router.get('/orders/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const order = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(req.params.id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const items = db.prepare(`
    SELECT dci.*, c.serial_number, c.capacity_liters, c.barcode, c.gas_grade, c.current_location
    FROM delivery_cylinder_items dci
    LEFT JOIN cylinders c ON dci.cylinder_id = c.id
    WHERE dci.order_id = ?
  `).all(req.params.id);

  res.json({ order, items });
});

// Create Delivery Order with Safety Validation
router.post('/orders', authMiddleware, requireRole(['Admin', 'Inventory Manager', 'Delivery Staff']), (req: AuthRequest, res: Response) => {
  const {
    customer_id,
    scheduled_date,
    assigned_staff_id,
    assigned_staff_name,
    vehicle_id,
    notes,
    cylinder_ids
  } = req.body;

  if (!customer_id || !scheduled_date || !cylinder_ids || !Array.isArray(cylinder_ids) || cylinder_ids.length === 0) {
    return res.status(400).json({ error: 'Customer, scheduled date, and at least one cylinder are required' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const today = new Date().toISOString().split('T')[0];

  // STRICT SAFETY VALIDATION FOR EVERY ASSIGNED CYLINDER:
  for (const cid of cylinder_ids) {
    const cyl = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(cid) as any;
    if (!cyl) {
      return res.status(400).json({ error: `Cylinder ${cid} does not exist` });
    }

    if (cyl.is_safety_flagged) {
      return res.status(400).json({
        error: `SAFETY VIOLATION: Cylinder ${cyl.id} (${cyl.serial_number}) is flagged unsafe: "${cyl.flag_reason || 'Safety lock'}". It cannot be dispatched for delivery!`
      });
    }

    if (cyl.next_inspection_date < today) {
      return res.status(400).json({
        error: `SAFETY VIOLATION: Cylinder ${cyl.id} is overdue for inspection (${cyl.next_inspection_date}). It cannot be dispatched until re-certified.`
      });
    }

    if (cyl.status !== 'filled_ready') {
      return res.status(400).json({
        error: `Cannot assign cylinder ${cyl.id}: current status is "${cyl.status}", must be "filled_ready".`
      });
    }
  }

  const orderId = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Create order
  db.prepare(`
    INSERT INTO delivery_orders (
      id, customer_id, customer_name, delivery_address, scheduled_date, status,
      assigned_staff_id, assigned_staff_name, vehicle_id, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).run(
    orderId,
    customer.id,
    customer.company,
    customer.delivery_address,
    scheduled_date,
    assigned_staff_id || req.user!.id,
    assigned_staff_name || req.user!.name,
    vehicle_id || 'Depot Fleet Truck',
    notes || null,
    now
  );

  // Attach cylinders
  for (const cid of cylinder_ids) {
    const cyl = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(cid) as any;
    const itemId = `ITM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO delivery_cylinder_items (id, order_id, cylinder_id, gas_type, action, status, created_at)
      VALUES (?, ?, ?, ?, 'deliver', 'assigned', ?)
    `).run(itemId, orderId, cid, cyl.gas_type, now);

    // Link cylinder to order
    db.prepare(`
      UPDATE cylinders
      SET current_order_id = ?,
          current_customer_id = ?,
          updated_at = ?
      WHERE id = ?
    `).run(orderId, customer.id, now, cid);

    recordEvent(
      cid,
      'Assigned_Order',
      `Assigned to Order ${orderId}`,
      `Assigned for delivery to ${customer.company} on ${scheduled_date}.`,
      req.user!.name,
      req.user!.role,
      'Central Depot - Staging'
    );
  }

  res.status(201).json({ message: 'Delivery order created', order_id: orderId });
});

// Update Order Status (Dispatched, Delivered, Failed)
router.patch('/orders/:id/status', authMiddleware, requireRole(['Admin', 'Delivery Staff', 'Inventory Manager']), (req: AuthRequest, res: Response) => {
  const { status, failed_reason, vehicle_location } = req.body;
  if (!['dispatched', 'delivered', 'failed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid delivery status' });
  }

  const order = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(req.params.id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const now = new Date().toISOString();
  const items = db.prepare("SELECT * FROM delivery_cylinder_items WHERE order_id = ? AND action = 'deliver'").all(order.id) as any[];

  if (status === 'dispatched') {
    db.prepare(`
      UPDATE delivery_orders
      SET status = 'dispatched',
          dispatched_at = ?
      WHERE id = ?
    `).run(now, order.id);

    for (const item of items) {
      db.prepare(`
        UPDATE cylinders
        SET status = 'in_transit',
            current_location = ?,
            updated_at = ?
        WHERE id = ?
      `).run(`In Transit: ${order.vehicle_id} (Driver: ${order.assigned_staff_name})`, now, item.cylinder_id);

      recordEvent(
        item.cylinder_id,
        'Dispatched',
        `Dispatched on ${order.vehicle_id}`,
        `In transit to ${order.customer_name} (${order.delivery_address}).`,
        req.user!.name,
        req.user!.role,
        order.vehicle_id
      );
    }
  } else if (status === 'delivered') {
    db.prepare(`
      UPDATE delivery_orders
      SET status = 'delivered',
          delivered_at = ?
      WHERE id = ?
    `).run(now, order.id);

    for (const item of items) {
      db.prepare(`
        UPDATE cylinders
        SET status = 'with_customer',
            current_customer_id = ?,
            current_location = ?,
            updated_at = ?
        WHERE id = ?
      `).run(order.customer_id, `Customer: ${order.customer_name} (${order.delivery_address})`, now, item.cylinder_id);

      db.prepare(`
        UPDATE delivery_cylinder_items
        SET status = 'delivered'
        WHERE id = ?
      `).run(item.id);

      recordEvent(
        item.cylinder_id,
        'Delivered',
        `Delivered to ${order.customer_name}`,
        `Accepted and signed at site. Location: ${order.delivery_address}.`,
        req.user!.name,
        req.user!.role,
        order.delivery_address
      );
    }

    // Update customer's active cylinder count
    db.prepare(`
      UPDATE customers
      SET active_cylinder_count = (SELECT COUNT(*) FROM cylinders WHERE current_customer_id = customers.id AND status = 'with_customer')
      WHERE id = ?
    `).run(order.customer_id);
  } else if (status === 'failed') {
    db.prepare(`
      UPDATE delivery_orders
      SET status = 'failed',
          failed_reason = ?
      WHERE id = ?
    `).run(failed_reason || 'Delivery attempt failed', order.id);

    // Return cylinders to depot
    for (const item of items) {
      db.prepare(`
        UPDATE cylinders
        SET status = 'filled_ready',
            current_location = 'Central Depot - Return Intake',
            updated_at = ?
        WHERE id = ?
      `).run(now, item.cylinder_id);

      recordEvent(
        item.cylinder_id,
        'Delivery_Failed',
        'Delivery Failed - Returned to Depot',
        `Attempted delivery to ${order.customer_name} failed: ${failed_reason || 'Premises closed'}. Returned to depot.`,
        req.user!.name,
        req.user!.role,
        'Central Depot'
      );
    }
  }

  res.json({ message: `Order status updated to ${status}` });
});

// RECORD CYLINDER RETURN (Return from customer to depot/inspection)
router.post('/returns', authMiddleware, requireRole(['Admin', 'Delivery Staff', 'Inventory Manager', 'Technician']), (req: AuthRequest, res: Response) => {
  const {
    cylinder_id,
    customer_id,
    order_id,
    return_condition = 'good_empty',
    notes = '',
    tare_weight_check
  } = req.body;

  if (!cylinder_id) {
    return res.status(400).json({ error: 'Cylinder ID required for return' });
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(cylinder_id) as any;
  if (!cylinder) {
    return res.status(404).json({ error: 'Cylinder not found' });
  }

  const effectiveCustId = customer_id || cylinder.current_customer_id;
  const customer = effectiveCustId ? db.prepare('SELECT * FROM customers WHERE id = ?').get(effectiveCustId) as any : null;
  const now = new Date().toISOString();

  // Log return in delivery items if order was provided
  const returnItemId = `RET-${Date.now()}`;
  db.prepare(`
    INSERT INTO delivery_cylinder_items (id, order_id, cylinder_id, gas_type, action, status, return_condition, returned_at, created_at)
    VALUES (?, ?, ?, ?, 'return', 'returned', ?, ?, ?)
  `).run(returnItemId, order_id || 'DIRECT-DEPOT-RETURN', cylinder_id, cylinder.gas_type, return_condition, now, now);

  // Determine post-return condition
  let nextStatus = 'empty_depot';
  let nextLocation = 'Central Depot - Empty Intake';
  let safetyFlagged = 0;
  let flagReason: string | null = null;

  if (return_condition === 'damaged' || return_condition === 'suspected_leak' || return_condition === 'valve_issue') {
    safetyFlagged = 1;
    nextStatus = 'flagged_leaking';
    nextLocation = 'Quarantine Intake Bay';
    flagReason = `Returned from ${customer ? customer.company : 'Customer'} with condition: ${return_condition}. Notes: ${notes}`;

    // Auto schedule urgent leak check
    const inspId = `INSP-RET-${Date.now()}`;
    db.prepare(`
      INSERT INTO inspections_maintenance (
        id, cylinder_id, type, priority, technician_id, technician_name, scheduled_date,
        test_result, leak_detected, issue_description, next_due_date, created_at
      ) VALUES (?, ?, 'Ultrasonic Leak Check', 'Critical', ?, ?, ?, 'Pending', 1, ?, ?, ?)
    `).run(
      inspId,
      cylinder_id,
      req.user!.id,
      req.user!.name,
      now.split('T')[0],
      `Customer Return Issue: ${return_condition} - ${notes}`,
      now.split('T')[0],
      now
    );
  }

  db.prepare(`
    UPDATE cylinders
    SET status = ?,
        current_location = ?,
        current_customer_id = NULL,
        current_order_id = NULL,
        is_safety_flagged = ?,
        flag_reason = ?,
        tare_weight_kg = COALESCE(?, tare_weight_kg),
        updated_at = ?
    WHERE id = ?
  `).run(
    nextStatus,
    nextLocation,
    safetyFlagged,
    flagReason,
    tare_weight_check ? parseFloat(tare_weight_check) : null,
    now,
    cylinder_id
  );

  recordEvent(
    cylinder_id,
    'Returned',
    `Returned to Depot (${return_condition})`,
    `Returned from ${customer ? customer.company : 'Customer'}. Condition: ${return_condition}. ${notes}`,
    req.user!.name,
    req.user!.role,
    nextLocation
  );

  // Update customer active cylinder count
  if (effectiveCustId) {
    db.prepare(`
      UPDATE customers
      SET active_cylinder_count = (SELECT COUNT(*) FROM cylinders WHERE current_customer_id = ? AND status = 'with_customer')
      WHERE id = ?
    `).run(effectiveCustId, effectiveCustId);
  }

  res.json({
    message: `Cylinder ${cylinder_id} return recorded successfully`,
    status: nextStatus,
    is_safety_flagged: safetyFlagged
  });
});

// --- 7. REPORTS & CSV EXPORT ---
router.get('/reports/summary', authMiddleware, (req: AuthRequest, res: Response) => {
  const { date_from, date_to } = req.query as any;

  // 1. Gas inventory breakdown
  const inventoryReport = db.prepare(`
    SELECT gas_type, gas_grade, capacity_liters,
           SUM(CASE WHEN status = 'filled_ready' THEN 1 ELSE 0 END) as filled,
           SUM(CASE WHEN status = 'empty_depot' THEN 1 ELSE 0 END) as empty,
           SUM(CASE WHEN status = 'in_refill' THEN 1 ELSE 0 END) as in_refill,
           SUM(CASE WHEN status = 'with_customer' THEN 1 ELSE 0 END) as with_customer,
           SUM(CASE WHEN status = 'under_maintenance' THEN 1 ELSE 0 END) as maintenance,
           SUM(CASE WHEN is_safety_flagged = 1 THEN 1 ELSE 0 END) as safety_flagged,
           COUNT(*) as total
    FROM cylinders
    WHERE status != 'archived'
    GROUP BY gas_type, gas_grade, capacity_liters
  `).all();

  // 2. Refill batch efficiency
  const refillReport = db.prepare(`
    SELECT gas_type,
           COUNT(*) as total_refills,
           SUM(CASE WHEN result = 'Passed' THEN 1 ELSE 0 END) as passed_refills,
           SUM(CASE WHEN result = 'Failed' THEN 1 ELSE 0 END) as failed_refills,
           ROUND(AVG(purity_percentage), 2) as avg_purity,
           ROUND(AVG(fill_pressure_bar), 1) as avg_pressure
    FROM refill_logs
    GROUP BY gas_type
  `).all();

  // 3. Inspection & Compliance report
  const complianceReport = db.prepare(`
    SELECT type,
           COUNT(*) as total_inspected,
           SUM(CASE WHEN test_result = 'Passed' THEN 1 ELSE 0 END) as passed,
           SUM(CASE WHEN test_result = 'Failed' THEN 1 ELSE 0 END) as failed,
           SUM(CASE WHEN leak_detected = 1 THEN 1 ELSE 0 END) as leaks_detected
    FROM inspections_maintenance
    GROUP BY type
  `).all();

  // 4. Delivery performance
  const deliveryReport = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM delivery_orders
    GROUP BY status
  `).all();

  // 5. Customer distribution
  const customerTurnaround = db.prepare(`
    SELECT c.company, c.category, c.city,
           (SELECT COUNT(*) FROM cylinders WHERE current_customer_id = c.id AND status = 'with_customer') as active_cylinders
    FROM customers c
    ORDER BY active_cylinders DESC
  `).all();

  res.json({
    inventoryReport,
    refillReport,
    complianceReport,
    deliveryReport,
    customerTurnaround
  });
});

export default router;
