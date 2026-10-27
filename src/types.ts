export type UserRole = 'Admin' | 'Inventory Manager' | 'Delivery Staff' | 'Technician';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export type CylinderStatus =
  | 'empty_depot'
  | 'in_refill'
  | 'filled_ready'
  | 'in_transit'
  | 'with_customer'
  | 'under_maintenance'
  | 'flagged_leaking'
  | 'archived';

export type GasType =
  | 'Oxygen'
  | 'Nitrogen'
  | 'Argon'
  | 'Acetylene'
  | 'Carbon Dioxide'
  | 'Helium'
  | 'LPG'
  | 'Hydrogen';

export type GasGrade = 'Medical' | 'Industrial' | 'Food Grade' | 'Ultra High Purity';

export interface Cylinder {
  id: string;
  serial_number: string;
  barcode: string;
  gas_type: GasType;
  gas_grade: GasGrade;
  capacity_liters: number;
  working_pressure_bar: number;
  tare_weight_kg: number;
  status: CylinderStatus;
  current_location: string;
  current_customer_id: string | null;
  current_order_id: string | null;
  last_refill_date: string | null;
  last_refill_batch: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string;
  is_safety_flagged: number;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CylinderEvent {
  id: string;
  cylinder_id: string;
  event_type: string;
  title: string;
  description: string;
  performed_by: string;
  role: string;
  location: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  delivery_address: string;
  city: string;
  category: string;
  active_cylinder_count: number;
  live_cylinder_count?: number;
  created_at: string;
}

export type DeliveryStatus = 'pending' | 'dispatched' | 'delivered' | 'failed' | 'cancelled';

export interface DeliveryItem {
  id: string;
  order_id: string;
  cylinder_id: string;
  gas_type: string;
  action: 'deliver' | 'return';
  status: string;
  return_condition?: string | null;
  returned_at?: string | null;
  serial_number?: string;
  capacity_liters?: number;
  barcode?: string;
  gas_grade?: string;
  current_location?: string;
}

export interface DeliveryOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  delivery_address: string;
  scheduled_date: string;
  status: DeliveryStatus;
  assigned_staff_id: string;
  assigned_staff_name: string;
  vehicle_id: string;
  notes?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  failed_reason?: string | null;
  created_at: string;
  items?: DeliveryItem[];
}

export interface RefillLog {
  id: string;
  cylinder_id: string;
  batch_number: string;
  gas_type: string;
  fill_pressure_bar: number;
  purity_percentage: number;
  operator_id: string;
  operator_name: string;
  refill_date: string;
  result: 'Passed' | 'Failed';
  failure_reason?: string | null;
  created_at: string;
  serial_number?: string;
  capacity_liters?: number;
}

export interface InspectionRecord {
  id: string;
  cylinder_id: string;
  type: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  technician_id: string;
  technician_name: string;
  scheduled_date: string;
  completed_date?: string | null;
  test_result: 'Pending' | 'Passed' | 'Failed' | 'Repaired' | 'Decommissioned';
  certificate_number?: string | null;
  leak_detected: number;
  issue_description: string;
  action_taken?: string | null;
  next_due_date: string;
  created_at: string;
  serial_number?: string;
  gas_type?: string;
  cylinder_status?: string;
  current_location?: string;
}

export interface DashboardMetrics {
  totalCylinders: number;
  availableEmpty: number;
  filledReady: number;
  inRefill: number;
  inTransit: number;
  withCustomer: number;
  overdueReturns: number;
  underMaintenance: number;
  flaggedSafety: number;
  upcomingInspections: number;
  overdueInspections: number;
  activeOrders: number;
}

export interface GasBreakdownItem {
  gas_type: GasType;
  filled: number;
  empty: number;
  in_refill: number;
  with_customer: number;
  total: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  gasBreakdown: GasBreakdownItem[];
  lowStockAlerts: GasBreakdownItem[];
  criticalCylinders: Cylinder[];
  recentEvents: CylinderEvent[];
}
