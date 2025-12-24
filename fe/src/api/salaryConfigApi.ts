import api from "./api";

export interface EmployeeSalaryConfig {
  id: number;
  user_id: number;
  salary_type: "hourly" | "daily" | "monthly" | "project_based";
  hourly_rate?: number;
  daily_rate?: number;
  monthly_salary?: number;
  project_rate?: number;
  overtime_rate?: number;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
  user?: any;
}

export interface CreateSalaryConfigData {
  user_id: number;
  salary_type: "hourly" | "daily" | "monthly" | "project_based";
  hourly_rate?: number;
  daily_rate?: number;
  monthly_salary?: number;
  project_rate?: number;
  overtime_rate?: number;
  effective_from: string;
  effective_to?: string;
}

export const salaryConfigApi = {
  // Get all salary configs (HR only)
  getSalaryConfig: async (params?: {
    user_id?: number;
    current?: boolean;
    page?: number;
  }) => {
    const response = await api.get("/hr/salary-config", { params });
    return response.data;
  },

  // Create salary config (HR only)
  createSalaryConfig: async (data: CreateSalaryConfigData) => {
    const response = await api.post("/hr/salary-config", data);
    return response.data;
  },

  // Update salary config (HR only)
  updateSalaryConfig: async (id: number, data: Partial<CreateSalaryConfigData>) => {
    const response = await api.put(`/hr/salary-config/${id}`, data);
    return response.data;
  },

  // Delete salary config (HR only)
  deleteSalaryConfig: async (id: number) => {
    const response = await api.delete(`/hr/salary-config/${id}`);
    return response.data;
  },

  // Get current config for user
  getCurrentConfig: async (userId: number) => {
    const response = await api.get(`/hr/salary-config/user/${userId}`);
    return response.data;
  },
};
