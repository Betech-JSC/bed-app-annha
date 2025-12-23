import api from "./api";

export interface OvertimeRule {
  id: number;
  name: string;
  type: "weekday" | "weekend" | "holiday";
  start_time?: string;
  end_time?: string;
  multiplier: number;
  description?: string;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OvertimeCategory {
  id: number;
  name: string;
  code?: string;
  description?: string;
  default_multiplier?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOvertimeRuleData {
  name: string;
  type: "weekday" | "weekend" | "holiday";
  start_time?: string;
  end_time?: string;
  multiplier: number;
  description?: string;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string;
}

export interface CreateOvertimeCategoryData {
  name: string;
  code?: string;
  description?: string;
  default_multiplier?: number;
  is_active?: boolean;
}

export const overtimeApi = {
  // Overtime Rules
  getRules: async (params?: {
    type?: string;
    is_active?: boolean;
  }) => {
    const response = await api.get("/hr/overtime-rules", { params });
    return response.data;
  },

  createRule: async (data: CreateOvertimeRuleData) => {
    const response = await api.post("/hr/overtime-rules", data);
    return response.data;
  },

  updateRule: async (id: number, data: Partial<CreateOvertimeRuleData>) => {
    const response = await api.put(`/hr/overtime-rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id: number) => {
    const response = await api.delete(`/hr/overtime-rules/${id}`);
    return response.data;
  },

  // Overtime Categories
  getCategories: async (params?: {
    is_active?: boolean;
  }) => {
    const response = await api.get("/hr/overtime-categories", { params });
    return response.data;
  },

  createCategory: async (data: CreateOvertimeCategoryData) => {
    const response = await api.post("/hr/overtime-categories", data);
    return response.data;
  },

  updateCategory: async (
    id: number,
    data: Partial<CreateOvertimeCategoryData>
  ) => {
    const response = await api.put(`/hr/overtime-categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: number) => {
    const response = await api.delete(`/hr/overtime-categories/${id}`);
    return response.data;
  },
};


