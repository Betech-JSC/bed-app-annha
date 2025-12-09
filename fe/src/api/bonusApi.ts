import api from "./api";

export interface Bonus {
  id: number;
  uuid: string;
  user_id: number;
  project_id?: number;
  bonus_type: "performance" | "project_completion" | "manual" | "other";
  amount: number;
  calculation_method: "auto" | "manual";
  project_completion_percentage?: number;
  performance_metrics?: any;
  period_start?: string;
  period_end?: string;
  description?: string;
  status: "pending" | "approved" | "paid";
  approved_by?: number;
  approved_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  user?: any;
  project?: any;
  approver?: any;
}

export interface CreateBonusData {
  user_id: number;
  project_id?: number;
  bonus_type: "performance" | "project_completion" | "manual" | "other";
  amount: number;
  calculation_method: "auto" | "manual";
  period_start?: string;
  period_end?: string;
  description?: string;
}

export const bonusApi = {
  // Get all bonuses (HR only)
  getBonuses: async (params?: {
    user_id?: number;
    project_id?: number;
    status?: string;
    calculation_method?: string;
    page?: number;
  }) => {
    const response = await api.get("/hr/bonuses", { params });
    return response.data;
  },

  // Create bonus (HR only)
  createBonus: async (data: CreateBonusData) => {
    const response = await api.post("/hr/bonuses", data);
    return response.data;
  },

  // Update bonus (HR only)
  updateBonus: async (id: number, data: Partial<CreateBonusData>) => {
    const response = await api.put(`/hr/bonuses/${id}`, data);
    return response.data;
  },

  // Calculate bonuses from project (HR only)
  calculateFromProject: async (projectId: number) => {
    const response = await api.post(`/hr/bonuses/calculate-project/${projectId}`);
    return response.data;
  },

  // Approve bonus (HR only)
  approveBonus: async (id: number) => {
    const response = await api.post(`/hr/bonuses/${id}/approve`);
    return response.data;
  },

  // Mark as paid (HR only)
  markAsPaid: async (id: number) => {
    const response = await api.post(`/hr/bonuses/${id}/pay`);
    return response.data;
  },

  // Get my bonuses
  getMyBonuses: async (params?: {
    status?: string;
    page?: number;
  }) => {
    const response = await api.get("/my-bonuses", { params });
    return response.data;
  },
};
