import api from "./api";

export interface CostGroup {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCostGroupData {
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export const costGroupApi = {
  // Get all cost groups
  getCostGroups: async (params?: { search?: string; active_only?: boolean }) => {
    const response = await api.get("/settings/cost-groups", { params });
    return response.data;
  },

  // Get single cost group
  getCostGroup: async (id: string | number) => {
    const response = await api.get(`/settings/cost-groups/${id}`);
    return response.data;
  },

  // Create cost group
  createCostGroup: async (data: CreateCostGroupData) => {
    const response = await api.post("/settings/cost-groups", data);
    return response.data;
  },

  // Update cost group
  updateCostGroup: async (id: string | number, data: Partial<CreateCostGroupData>) => {
    const response = await api.put(`/settings/cost-groups/${id}`, data);
    return response.data;
  },

  // Delete cost group
  deleteCostGroup: async (id: string | number) => {
    const response = await api.delete(`/settings/cost-groups/${id}`);
    return response.data;
  },
};

