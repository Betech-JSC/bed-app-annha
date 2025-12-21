import api from "./api";

export interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeStats {
  total: number;
  active: number;
  on_leave: number;
  total_hours_this_month: number;
  pending_approvals: number;
}

export const employeesApi = {
  // Get all employees (HR only)
  getEmployees: async (params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    const response = await api.get("/hr/employees", { params });
    return response.data;
  },

  // Get employee by ID
  getEmployeeById: async (id: number) => {
    const response = await api.get(`/hr/employees/${id}`);
    return response.data;
  },

  // Get employee stats
  getEmployeeStats: async (employeeId: number, params?: {
    month?: number;
    year?: number;
  }) => {
    const response = await api.get(`/hr/employees/${employeeId}/stats`, { params });
    return response.data;
  },

  // Get all employees stats (HR dashboard)
  getAllEmployeesStats: async () => {
    const response = await api.get("/hr/employees/stats");
    return response.data;
  },

  // Create new employee/user
  createEmployee: async (data: {
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
    password: string;
    role_ids?: number[];
  }) => {
    const response = await api.post("/hr/employees", data);
    return response.data;
  },

  // Update employee
  updateEmployee: async (id: number, data: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
  }>) => {
    const response = await api.put(`/hr/employees/${id}`, data);
    return response.data;
  },

  // Get user roles
  getUserRoles: async (id: number) => {
    const response = await api.get(`/hr/employees/${id}/roles`);
    return response.data;
  },

  // Sync user roles
  syncUserRoles: async (id: number, roleIds: number[]) => {
    const response = await api.post(`/hr/employees/${id}/roles`, {
      role_ids: roleIds,
    });
    return response.data;
  },
};
