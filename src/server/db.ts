import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'gas_cylinders.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cylinders (
      id TEXT PRIMARY KEY,
      serial_number TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      gas_type TEXT NOT NULL,
      gas_grade TEXT NOT NULL,
      capacity_liters REAL NOT NULL,
      working_pressure_bar REAL NOT NULL,
      tare_weight_kg REAL NOT NULL,
      status TEXT NOT NULL,
      current_location TEXT NOT NULL,
      current_customer_id TEXT,
      current_order_id TEXT,
      last_refill_date TEXT,
      last_refill_batch TEXT,
      last_inspection_date TEXT,
      next_inspection_date TEXT NOT NULL,
      is_safety_flagged INTEGER DEFAULT 0,
      flag_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      city TEXT NOT NULL,
      category TEXT NOT NULL,
      active_cylinder_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_staff_id TEXT NOT NULL,
      assigned_staff_name TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      notes TEXT,
      dispatched_at TEXT,
      delivered_at TEXT,
      failed_reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_cylinder_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      cylinder_id TEXT NOT NULL,
      gas_type TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      return_condition TEXT,
      returned_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refill_logs (
      id TEXT PRIMARY KEY,
      cylinder_id TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      gas_type TEXT NOT NULL,
      fill_pressure_bar REAL NOT NULL,
      purity_percentage REAL NOT NULL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      refill_date TEXT NOT NULL,
      result TEXT NOT NULL,
      failure_reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspections_maintenance (
      id TEXT PRIMARY KEY,
      cylinder_id TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      technician_name TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      completed_date TEXT,
      test_result TEXT NOT NULL,
      certificate_number TEXT,
      leak_detected INTEGER DEFAULT 0,
      issue_description TEXT NOT NULL,
      action_taken TEXT,
      next_due_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cylinder_events (
      id TEXT PRIMARY KEY,
      cylinder_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  const passwordHash = bcrypt.hashSync('gas12345', 10);
  const now = new Date().toISOString();

  // 1. Seed standard role accounts
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('USR-001', 'admin@cylindertrack.io', passwordHash, 'Sarah Jenkins', 'Admin', now);
  insertUser.run('USR-002', 'inventory@cylindertrack.io', passwordHash, 'Marcus Vance', 'Inventory Manager', now);
  insertUser.run('USR-003', 'delivery@cylindertrack.io', passwordHash, 'Dave Rodriguez', 'Delivery Staff', now);
  insertUser.run('USR-004', 'tech@cylindertrack.io', passwordHash, 'Elena Rostova', 'Technician', now);

  // 2. Seed Customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, code, name, company, email, phone, delivery_address, city, category, active_cylinder_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCustomer.run('CUST-101', 'C-MED-01', 'Dr. Alistair Grant', 'Metropolitan Memorial Hospital', 'procurement@metromemorial.org', '+1 555-019-4821', '800 Mercy Avenue, Loading Dock B', 'Metro City', 'Hospital / Healthcare', 4, now);
  insertCustomer.run('CUST-102', 'C-IND-02', 'Arthur Pendelton', 'Apex Precision Metal Works', 'orders@apexmetals.com', '+1 555-014-9932', '1440 Industrial Parkway, Gate 3', 'East Industrial Zone', 'Industrial Fabrication', 3, now);
  insertCustomer.run('CUST-103', 'C-BEV-03', 'Chloe Montgomery', 'Craft Craft Beverage Distillers', 'bar@craftdistillers.com', '+1 555-017-3310', '42 Fermentation Way', 'Harbor District', 'Beverage & Hospitality', 2, now);
  insertCustomer.run('CUST-104', 'C-LAB-04', 'Prof. Kenji Sato', 'BioGen Cryo & Genomics Research', 'lab-ops@biogen-cryo.edu', '+1 555-012-7721', '90 University Science Park, Wing C', 'Innovation Corridor', 'Research Lab', 2, now);
  insertCustomer.run('CUST-105', 'C-AUT-05', 'Jack Callahan', 'Callahan Advanced Auto Body', 'jack@callahanauto.net', '+1 555-018-6204', '310 Motor Speedway Blvd', 'North Hills', 'Automotive Workshop', 0, now);

  // 3. Seed Cylinders
  const insertCylinder = db.prepare(`
    INSERT INTO cylinders (
      id, serial_number, barcode, gas_type, gas_grade, capacity_liters, working_pressure_bar, tare_weight_kg,
      status, current_location, current_customer_id, current_order_id, last_refill_date, last_refill_batch,
      last_inspection_date, next_inspection_date, is_safety_flagged, flag_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO cylinder_events (id, cylinder_id, event_type, title, description, performed_by, role, location, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const cylindersData = [
    // Filled & Ready at Central Depot
    {
      id: 'CYL-O2-101',
      sn: 'SN-O2-8801',
      barcode: 'BAR-8801-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 52.5,
      status: 'filled_ready',
      loc: 'Central Depot - Bay A1',
      cust: null,
      order: null,
      lastRefill: '2026-10-20',
      batch: 'BAT-2026-O2-104',
      lastInsp: '2026-01-15',
      nextInsp: '2027-01-15',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-O2-102',
      sn: 'SN-O2-8802',
      barcode: 'BAR-8802-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 52.8,
      status: 'filled_ready',
      loc: 'Central Depot - Bay A1',
      cust: null,
      order: null,
      lastRefill: '2026-10-22',
      batch: 'BAT-2026-O2-108',
      lastInsp: '2025-11-10',
      nextInsp: '2026-11-10',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-AR-201',
      sn: 'SN-AR-9101',
      barcode: 'BAR-9101-AR',
      gas: 'Argon',
      grade: 'Industrial',
      cap: 47,
      wp: 200,
      tare: 50.2,
      status: 'filled_ready',
      loc: 'Central Depot - Bay B2',
      cust: null,
      order: null,
      lastRefill: '2026-10-18',
      batch: 'BAT-2026-AR-089',
      lastInsp: '2026-03-01',
      nextInsp: '2027-03-01',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-N2-301',
      sn: 'SN-N2-4411',
      barcode: 'BAR-4411-N2',
      gas: 'Nitrogen',
      grade: 'Ultra High Purity',
      cap: 50,
      wp: 300,
      tare: 58.0,
      status: 'filled_ready',
      loc: 'Central Depot - Bay C1',
      cust: null,
      order: null,
      lastRefill: '2026-10-24',
      batch: 'BAT-2026-N2-115',
      lastInsp: '2025-12-05',
      nextInsp: '2026-12-05',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-CO2-401',
      sn: 'SN-CO2-3301',
      barcode: 'BAR-3301-CO2',
      gas: 'Carbon Dioxide',
      grade: 'Food Grade',
      cap: 40,
      wp: 150,
      tare: 44.5,
      status: 'filled_ready',
      loc: 'Central Depot - Bay D2',
      cust: null,
      order: null,
      lastRefill: '2026-10-21',
      batch: 'BAT-2026-CO2-072',
      lastInsp: '2026-02-18',
      nextInsp: '2027-02-18',
      flag: 0,
      reason: null
    },
    // In Refill Station
    {
      id: 'CYL-O2-103',
      sn: 'SN-O2-8803',
      barcode: 'BAR-8803-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 53.0,
      status: 'in_refill',
      loc: 'Refill Station #1',
      cust: null,
      order: null,
      lastRefill: '2026-09-12',
      batch: 'BAT-2026-O2-064',
      lastInsp: '2026-04-10',
      nextInsp: '2027-04-10',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-AC-501',
      sn: 'SN-AC-7201',
      barcode: 'BAR-7201-AC',
      gas: 'Acetylene',
      grade: 'Industrial',
      cap: 40,
      wp: 15,
      tare: 42.0,
      status: 'in_refill',
      loc: 'Refill Station #3 (Porous Mass)',
      cust: null,
      order: null,
      lastRefill: '2026-08-30',
      batch: 'BAT-2026-AC-045',
      lastInsp: '2026-05-14',
      nextInsp: '2027-05-14',
      flag: 0,
      reason: null
    },
    // Empty at Depot awaiting refill
    {
      id: 'CYL-HE-601',
      sn: 'SN-HE-1199',
      barcode: 'BAR-1199-HE',
      gas: 'Helium',
      grade: 'Ultra High Purity',
      cap: 50,
      wp: 200,
      tare: 54.2,
      status: 'empty_depot',
      loc: 'Central Depot - Empty Intake Rack',
      cust: null,
      order: null,
      lastRefill: '2026-07-15',
      batch: 'BAT-2026-HE-031',
      lastInsp: '2026-02-20',
      nextInsp: '2027-02-20',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-O2-104',
      sn: 'SN-O2-8804',
      barcode: 'BAR-8804-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 52.7,
      status: 'empty_depot',
      loc: 'Central Depot - Empty Intake Rack',
      cust: null,
      order: null,
      lastRefill: '2026-08-11',
      batch: 'BAT-2026-O2-051',
      lastInsp: '2026-01-20',
      nextInsp: '2027-01-20',
      flag: 0,
      reason: null
    },
    // In Transit with Driver
    {
      id: 'CYL-O2-105',
      sn: 'SN-O2-8805',
      barcode: 'BAR-8805-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 52.4,
      status: 'in_transit',
      loc: 'In Transit: Delivery Truck #02',
      cust: 'CUST-101',
      order: 'ORD-2026-0081',
      lastRefill: '2026-10-24',
      batch: 'BAT-2026-O2-114',
      lastInsp: '2026-03-12',
      nextInsp: '2027-03-12',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-AR-202',
      sn: 'SN-AR-9102',
      barcode: 'BAR-9102-AR',
      gas: 'Argon',
      grade: 'Industrial',
      cap: 47,
      wp: 200,
      tare: 49.8,
      status: 'in_transit',
      loc: 'In Transit: Delivery Truck #02',
      cust: 'CUST-102',
      order: 'ORD-2026-0082',
      lastRefill: '2026-10-23',
      batch: 'BAT-2026-AR-092',
      lastInsp: '2026-02-14',
      nextInsp: '2027-02-14',
      flag: 0,
      reason: null
    },
    // With Customer
    {
      id: 'CYL-O2-106',
      sn: 'SN-O2-8806',
      barcode: 'BAR-8806-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 52.6,
      status: 'with_customer',
      loc: 'Customer: Metropolitan Memorial Hospital - ICU',
      cust: 'CUST-101',
      order: 'ORD-2026-0071',
      lastRefill: '2026-10-05',
      batch: 'BAT-2026-O2-092',
      lastInsp: '2025-11-20',
      nextInsp: '2026-11-20',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-O2-107',
      sn: 'SN-O2-8807',
      barcode: 'BAR-8807-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 52.9,
      status: 'with_customer',
      loc: 'Customer: Metropolitan Memorial Hospital - ER Ward',
      cust: 'CUST-101',
      order: 'ORD-2026-0071',
      lastRefill: '2026-10-05',
      batch: 'BAT-2026-O2-092',
      lastInsp: '2025-11-20',
      nextInsp: '2026-11-20',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-AR-203',
      sn: 'SN-AR-9103',
      barcode: 'BAR-9103-AR',
      gas: 'Argon',
      grade: 'Industrial',
      cap: 47,
      wp: 200,
      tare: 50.1,
      status: 'with_customer',
      loc: 'Customer: Apex Precision Metal Works',
      cust: 'CUST-102',
      order: 'ORD-2026-0073',
      lastRefill: '2026-09-18',
      batch: 'BAT-2026-AR-081',
      lastInsp: '2025-12-10',
      nextInsp: '2026-12-10',
      flag: 0,
      reason: null
    },
    {
      id: 'CYL-CO2-402',
      sn: 'SN-CO2-3302',
      barcode: 'BAR-3302-CO2',
      gas: 'Carbon Dioxide',
      grade: 'Food Grade',
      cap: 40,
      wp: 150,
      tare: 44.2,
      status: 'with_customer',
      loc: 'Customer: Craft Craft Beverage Distillers',
      cust: 'CUST-103',
      order: 'ORD-2026-0075',
      lastRefill: '2026-09-29',
      batch: 'BAT-2026-CO2-068',
      lastInsp: '2026-01-08',
      nextInsp: '2027-01-08',
      flag: 0,
      reason: null
    },
    // Under Maintenance
    {
      id: 'CYL-LPG-701',
      sn: 'SN-LP-6501',
      barcode: 'BAR-6501-LP',
      gas: 'LPG',
      grade: 'Industrial',
      cap: 47,
      wp: 30,
      tare: 34.0,
      status: 'under_maintenance',
      loc: 'Maintenance Bay - Hydrostatic Pit',
      cust: null,
      order: null,
      lastRefill: '2026-06-10',
      batch: 'BAT-2026-LP-022',
      lastInsp: '2021-10-15',
      nextInsp: '2026-10-15', // Overdue inspection
      flag: 0,
      reason: 'Scheduled 5-year hydrostatic volumetric expansion test'
    },
    // Flagged as Leaking / Unsafe Safety Flagged!
    {
      id: 'CYL-N2-302',
      sn: 'SN-N2-4412',
      barcode: 'BAR-4412-N2',
      gas: 'Nitrogen',
      grade: 'Industrial',
      cap: 50,
      wp: 200,
      tare: 57.5,
      status: 'flagged_leaking',
      loc: 'Quarantine Chamber #1',
      cust: null,
      order: null,
      lastRefill: '2026-09-02',
      batch: 'BAT-2026-N2-094',
      lastInsp: '2025-08-10',
      nextInsp: '2026-08-10',
      flag: 1,
      reason: 'Micro-leak detected around neck valve thread during sniffer check (24 ppm helium equivalent). Locked by safety protocols.'
    },
    // Overdue for return customer cylinder
    {
      id: 'CYL-O2-108',
      sn: 'SN-O2-8808',
      barcode: 'BAR-8808-O2',
      gas: 'Oxygen',
      grade: 'Medical',
      cap: 50,
      wp: 200,
      tare: 52.3,
      status: 'with_customer',
      loc: 'Customer: Metropolitan Memorial Hospital - Annex',
      cust: 'CUST-101',
      order: 'ORD-2026-0040',
      lastRefill: '2026-07-02',
      batch: 'BAT-2026-O2-040',
      lastInsp: '2025-10-01',
      nextInsp: '2026-11-01',
      flag: 0,
      reason: null
    }
  ];

  for (const c of cylindersData) {
    insertCylinder.run(
      c.id, c.sn, c.barcode, c.gas, c.grade, c.cap, c.wp, c.tare,
      c.status, c.loc, c.cust, c.order, c.lastRefill, c.batch,
      c.lastInsp, c.nextInsp, c.flag, c.reason, '2026-01-10 08:00:00', now
    );

    // Initial event
    insertEvent.run(
      `EVT-${c.id}-01`,
      c.id,
      'Created',
      'Cylinder Commissioned',
      `Commissioned into fleet with serial ${c.sn}, capacity ${c.cap}L at ${c.wp} bar.`,
      'Sarah Jenkins',
      'Admin',
      'Central Depot',
      '2026-01-10 08:30:00'
    );

    if (c.lastRefill) {
      insertEvent.run(
        `EVT-${c.id}-02`,
        c.id,
        'Refilled',
        `Refilled with ${c.gas} (${c.grade})`,
        `Batch ${c.batch} processed at ${c.wp} bar target. Purity verified.`,
        'Marcus Vance',
        'Inventory Manager',
        'Refill Station',
        `${c.lastRefill} 14:00:00`
      );
    }

    if (c.flag === 1) {
      insertEvent.run(
        `EVT-${c.id}-03`,
        c.id,
        'Flagged_Unsafe',
        'Safety Lock Engaged - Leak Detected',
        c.reason || 'Unsafe condition detected.',
        'Elena Rostova',
        'Technician',
        'Quarantine Chamber #1',
        '2026-10-25 11:15:00'
      );
    }

    if (c.status === 'with_customer') {
      insertEvent.run(
        `EVT-${c.id}-04`,
        c.id,
        'Delivered',
        'Delivered to Customer Site',
        `Delivered under Order ${c.order} to ${c.loc}. Signature recorded.`,
        'Dave Rodriguez',
        'Delivery Staff',
        c.loc,
        '2026-10-06 10:20:00'
      );
    }
  }

  // 4. Seed Delivery Orders
  const insertOrder = db.prepare(`
    INSERT INTO delivery_orders (
      id, customer_id, customer_name, delivery_address, scheduled_date, status,
      assigned_staff_id, assigned_staff_name, vehicle_id, notes, dispatched_at, delivered_at, failed_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO delivery_cylinder_items (
      id, order_id, cylinder_id, gas_type, action, status, return_condition, returned_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Active Dispatched order
  insertOrder.run(
    'ORD-2026-0081',
    'CUST-101',
    'Metropolitan Memorial Hospital',
    '800 Mercy Avenue, Loading Dock B',
    '2026-10-27',
    'dispatched',
    'USR-003',
    'Dave Rodriguez',
    'Truck-02 (Heavy Cargo)',
    'Urgent ICU medical oxygen replenishment. Gate code: #4812.',
    '2026-10-27 07:45:00',
    null,
    null,
    '2026-10-26 16:30:00'
  );

  insertOrderItem.run('ITM-01', 'ORD-2026-0081', 'CYL-O2-105', 'Oxygen', 'deliver', 'assigned', null, null, now);

  // Delivered order
  insertOrder.run(
    'ORD-2026-0071',
    'CUST-101',
    'Metropolitan Memorial Hospital',
    '800 Mercy Avenue, Loading Dock B',
    '2026-10-06',
    'delivered',
    'USR-003',
    'Dave Rodriguez',
    'Truck-01',
    'Regular monthly hospital rotation.',
    '2026-10-06 08:00:00',
    '2026-10-06 10:20:00',
    null,
    '2026-10-05 14:00:00'
  );

  insertOrderItem.run('ITM-02', 'ORD-2026-0071', 'CYL-O2-106', 'Oxygen', 'deliver', 'delivered', null, null, '2026-10-05 14:00:00');
  insertOrderItem.run('ITM-03', 'ORD-2026-0071', 'CYL-O2-107', 'Oxygen', 'deliver', 'delivered', null, null, '2026-10-05 14:00:00');

  // Pending order
  insertOrder.run(
    'ORD-2026-0085',
    'CUST-102',
    'Apex Precision Metal Works',
    '1440 Industrial Parkway, Gate 3',
    '2026-10-28',
    'pending',
    'USR-003',
    'Dave Rodriguez',
    'Truck-03 (Flatbed)',
    'High purity Argon shielding gas for aerospace laser welding line.',
    null,
    null,
    null,
    '2026-10-26 18:00:00'
  );
  insertOrderItem.run('ITM-04', 'ORD-2026-0085', 'CYL-AR-201', 'Argon', 'deliver', 'assigned', null, null, now);

  // 5. Seed Refill Logs
  const insertRefill = db.prepare(`
    INSERT INTO refill_logs (
      id, cylinder_id, batch_number, gas_type, fill_pressure_bar, purity_percentage,
      operator_id, operator_name, refill_date, result, failure_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRefill.run('REF-901', 'CYL-O2-101', 'BAT-2026-O2-104', 'Oxygen', 200.0, 99.8, 'USR-002', 'Marcus Vance', '2026-10-20 11:30:00', 'Passed', null, '2026-10-20 11:30:00');
  insertRefill.run('REF-902', 'CYL-O2-102', 'BAT-2026-O2-108', 'Oxygen', 200.0, 99.9, 'USR-002', 'Marcus Vance', '2026-10-22 14:15:00', 'Passed', null, '2026-10-22 14:15:00');
  insertRefill.run('REF-903', 'CYL-AR-201', 'BAT-2026-AR-089', 'Argon', 200.0, 99.995, 'USR-002', 'Marcus Vance', '2026-10-18 09:40:00', 'Passed', null, '2026-10-18 09:40:00');
  insertRefill.run('REF-904', 'CYL-N2-301', 'BAT-2026-N2-115', 'Nitrogen', 300.0, 99.999, 'USR-002', 'Marcus Vance', '2026-10-24 16:00:00', 'Passed', null, '2026-10-24 16:00:00');
  insertRefill.run('REF-905', 'CYL-N2-302', 'BAT-2026-N2-094', 'Nitrogen', 185.0, 98.4, 'USR-002', 'Marcus Vance', '2026-10-25 10:50:00', 'Failed', 'Pressure drop detected during soak hold. Forwarded to technical inspection for ultrasonic sniffer test.', '2026-10-25 10:50:00');

  // 6. Seed Maintenance & Inspection Records
  const insertInsp = db.prepare(`
    INSERT INTO inspections_maintenance (
      id, cylinder_id, type, priority, technician_id, technician_name, scheduled_date,
      completed_date, test_result, certificate_number, leak_detected, issue_description,
      action_taken, next_due_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInsp.run(
    'INSP-501',
    'CYL-N2-302',
    'Sniffer Leak Test',
    'Critical',
    'USR-004',
    'Elena Rostova',
    '2026-10-25',
    '2026-10-25',
    'Failed',
    null,
    1,
    'Failed pressure hold during refill test. Sniffer detected helium trace leak around neck thread junction.',
    'Cylinder quarantined in Chamber #1. Marked with high-visibility red tag. Delivery/refill locked.',
    '2026-11-01',
    '2026-10-25 11:00:00'
  );

  insertInsp.run(
    'INSP-502',
    'CYL-LPG-701',
    'Periodic Hydrostatic Test',
    'High',
    'USR-004',
    'Elena Rostova',
    '2026-10-26',
    null,
    'Pending',
    null,
    0,
    'Mandatory 5-year water jacket hydrostatic volumetric expansion inspection due.',
    null,
    '2026-10-15',
    '2026-10-15 09:00:00'
  );

  insertInsp.run(
    'INSP-503',
    'CYL-O2-101',
    'Ultrasonic Leak Check',
    'Medium',
    'USR-004',
    'Elena Rostova',
    '2026-01-15',
    '2026-01-15',
    'Passed',
    'CERT-HYD-2026-019',
    0,
    'Annual ultrasonic wall thickness and neck valve seal testing.',
    'Wall thickness nominal (6.4mm). Valve gland re-torqued to 110 Nm.',
    '2027-01-15',
    '2026-01-15 14:00:00'
  );
}
