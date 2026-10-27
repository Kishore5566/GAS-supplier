import { Cylinder, Customer, DeliveryOrder, RefillLog, InspectionRecord, CylinderEvent, DashboardData } from '../types';

const TOKEN_KEY = 'gas_cylinder_auth_token';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY)
};

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Session expired or unauthenticated
    authStorage.clearToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const data = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  async getMe() {
    return fetchWithAuth('/api/auth/me');
  },

  async getDemoUsers() {
    const res = await fetch('/api/auth/demo-users');
    return res.json();
  },

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return fetchWithAuth('/api/dashboard');
  },

  // Cylinders
  async getCylinders(filters: {
    search?: string;
    status?: string;
    gas_type?: string;
    location?: string;
    inspection_filter?: string;
  } = {}): Promise<{ cylinders: Cylinder[] }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.gas_type && filters.gas_type !== 'all') params.append('gas_type', filters.gas_type);
    if (filters.location && filters.location !== 'all') params.append('location', filters.location);
    if (filters.inspection_filter && filters.inspection_filter !== 'all') params.append('inspection_filter', filters.inspection_filter);

    return fetchWithAuth(`/api/cylinders?${params.toString()}`);
  },

  async getCylinder(id: string): Promise<{
    cylinder: Cylinder;
    events: CylinderEvent[];
    inspections: InspectionRecord[];
    refills: RefillLog[];
    deliveryHistory: any[];
    currentCustomer: Customer | null;
  }> {
    return fetchWithAuth(`/api/cylinders/${encodeURIComponent(id)}`);
  },

  async createCylinder(data: Partial<Cylinder>): Promise<{ cylinder: Cylinder }> {
    return fetchWithAuth('/api/cylinders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCylinder(id: string, data: Partial<Cylinder>): Promise<{ cylinder: Cylinder }> {
    return fetchWithAuth(`/api/cylinders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async flagSafety(id: string, reason: string, location?: string): Promise<any> {
    return fetchWithAuth(`/api/cylinders/${encodeURIComponent(id)}/flag-safety`, {
      method: 'POST',
      body: JSON.stringify({ reason, location })
    });
  },

  async clearSafety(id: string, resolution_notes: string, new_status?: string, new_location?: string): Promise<any> {
    return fetchWithAuth(`/api/cylinders/${encodeURIComponent(id)}/clear-safety`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes, new_status, new_location })
    });
  },

  async archiveCylinder(id: string, reason?: string): Promise<any> {
    return fetchWithAuth(`/api/cylinders/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Refilling
  async getRefills(): Promise<{ logs: RefillLog[]; pendingCylinders: Cylinder[] }> {
    return fetchWithAuth('/api/refills');
  },

  async startRefill(cylinder_id: string, station?: string): Promise<any> {
    return fetchWithAuth('/api/refills/start', {
      method: 'POST',
      body: JSON.stringify({ cylinder_id, station })
    });
  },

  async completeRefill(data: {
    cylinder_id: string;
    batch_number: string;
    fill_pressure_bar: number;
    purity_percentage: number;
    result: 'Passed' | 'Failed';
    failure_reason?: string;
    destination_bay?: string;
  }): Promise<any> {
    return fetchWithAuth('/api/refills/complete', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Maintenance & Inspections
  async getInspections(filters: { priority?: string; result?: string } = {}): Promise<{
    inspections: InspectionRecord[];
    cylindersNeedingInspection: Cylinder[];
  }> {
    const params = new URLSearchParams();
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.result && filters.result !== 'all') params.append('result', filters.result);
    return fetchWithAuth(`/api/inspections?${params.toString()}`);
  },

  async scheduleInspection(data: {
    cylinder_id: string;
    type: string;
    priority: string;
    scheduled_date: string;
    issue_description: string;
  }): Promise<any> {
    return fetchWithAuth('/api/inspections', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async recordInspection(id: string, data: {
    test_result: string;
    certificate_number?: string;
    leak_detected: boolean;
    action_taken?: string;
    next_due_date: string;
    return_status?: string;
  }): Promise<any> {
    return fetchWithAuth(`/api/inspections/${encodeURIComponent(id)}/record`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Customers & Deliveries
  async getCustomers(): Promise<{ customers: Customer[] }> {
    return fetchWithAuth('/api/customers');
  },

  async createCustomer(data: Partial<Customer>): Promise<{ customer: Customer }> {
    return fetchWithAuth('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getOrders(filters: { status?: string; customer_id?: string } = {}): Promise<{ orders: DeliveryOrder[] }> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.customer_id && filters.customer_id !== 'all') params.append('customer_id', filters.customer_id);
    return fetchWithAuth(`/api/orders?${params.toString()}`);
  },

  async getOrder(id: string): Promise<{ order: DeliveryOrder; items: any[] }> {
    return fetchWithAuth(`/api/orders/${encodeURIComponent(id)}`);
  },

  async createOrder(data: {
    customer_id: string;
    scheduled_date: string;
    vehicle_id: string;
    assigned_staff_name?: string;
    notes?: string;
    cylinder_ids: string[];
  }): Promise<any> {
    return fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateOrderStatus(id: string, status: string, failed_reason?: string): Promise<any> {
    return fetchWithAuth(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, failed_reason })
    });
  },

  async returnCylinder(data: {
    cylinder_id: string;
    customer_id?: string;
    order_id?: string;
    return_condition: string;
    notes?: string;
    tare_weight_check?: number;
  }): Promise<any> {
    return fetchWithAuth('/api/returns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Reports
  async getReportsSummary(): Promise<any> {
    return fetchWithAuth('/api/reports/summary');
  }
};

// CSV Export Helper
export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          let val = row[h];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return `"${val}"`;
        })
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
