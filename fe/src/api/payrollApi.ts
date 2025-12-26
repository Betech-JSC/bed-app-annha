import api from "./api";

export interface Payroll {
  id: number;
  uuid: string;
  user_id: number;
  project_id?: number;
  period_type: "daily" | "weekly" | "monthly";
  period_start: string;
  period_end: string;
  base_salary: number;
  total_hours: number;
  overtime_hours: number;
  overtime_rate: number;
  bonus_amount: number;
  deductions: number;
  gross_salary: number;
  tax: number;
  net_salary: number;
  status: "draft" | "calculated" | "approved" | "paid";
  calculated_at?: string;
  approved_by?: number;
  approved_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: any;
  approver?: any;
  project?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface CalculatePayrollData {
  user_id: number;
  project_id?: number;
  period_type: "daily" | "weekly" | "monthly";
  period_start: string;
  period_end: string;
}

export const payrollApi = {
  // Get all payroll (HR only)
  getPayroll: async (params?: {
    user_id?: number;
    project_id?: number;
    period_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  }) => {
    const response = await api.get("/hr/payroll", { params });
    return response.data;
  },

  // Calculate payroll for user (HR only)
  calculatePayroll: async (data: CalculatePayrollData) => {
    const response = await api.post("/hr/payroll/calculate", data);
    return response.data;
  },

  // Calculate payroll for all users (HR only)
  calculateAllPayroll: async (data: {
    period_type: "daily" | "weekly" | "monthly";
    period_start: string;
    period_end: string;
  }) => {
    const response = await api.post("/hr/payroll/calculate-all", data);
    return response.data;
  },

  // Get payroll by ID
  getPayrollById: async (id: number) => {
    const response = await api.get(`/hr/payroll/${id}`);
    return response.data;
  },

  // Approve payroll (HR only)
  approvePayroll: async (id: number) => {
    const response = await api.post(`/hr/payroll/${id}/approve`);
    return response.data;
  },

  // Mark as paid (HR only)
  markAsPaid: async (id: number) => {
    const response = await api.post(`/hr/payroll/${id}/pay`);
    return response.data;
  },

  // Export payroll (HR only)
  exportPayroll: async (params: {
    format: "excel" | "pdf";
    user_id?: number;
    period_start?: string;
    period_end?: string;
  }) => {
    const response = await api.get("/hr/payroll/export", { params });
    return response.data;
  },

  // Get my payroll
  getMyPayroll: async (params?: {
    status?: string;
    page?: number;
  }) => {
    const response = await api.get("/my-payroll", { params });
    return response.data;
  },
};
