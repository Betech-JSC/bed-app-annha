import api from "./api";

export interface CostGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCostGroupData {
  code: string;
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export const costGroupApi = {
  // Get all cost groups
  getCostGroups: async () => {
    const response = await api.get("/settings/cost-groups");
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

