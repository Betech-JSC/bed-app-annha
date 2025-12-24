import api from "./api";

export interface AdditionalCost {
  id: number;
  uuid: string;
  project_id: number;
  amount: number;
  description: string;
  status: "pending_approval" | "approved" | "rejected";
  proposed_by: number;
  approved_by?: number;
  approved_at?: string;
  rejected_reason?: string;
  attachments?: any[];
}

export interface CreateAdditionalCostData {
  amount: number;
  description: string;
  attachments?: number[];
}

export const additionalCostApi = {
  // Get additional costs for project
  getAdditionalCosts: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/additional-costs`);
    return response.data;
  },

  // Create additional cost
  createAdditionalCost: async (projectId: string | number, data: CreateAdditionalCostData) => {
    const response = await api.post(`/projects/${projectId}/additional-costs`, data);
    return response.data;
  },

  // Approve additional cost
  approveAdditionalCost: async (projectId: string | number, costId: string | number) => {
    const response = await api.post(`/projects/${projectId}/additional-costs/${costId}/approve`);
    return response.data;
  },

  // Reject additional cost
  rejectAdditionalCost: async (
    projectId: string | number,
    costId: string | number,
    reason: string
  ) => {
    const response = await api.post(`/projects/${projectId}/additional-costs/${costId}/reject`, {
      rejected_reason: reason,
    });
    return response.data;
  },
};
