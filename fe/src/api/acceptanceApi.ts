import api from "./api";

export interface AcceptanceStage {
  id: number;
  uuid: string;
  project_id: number;
  name: string;
  description?: string;
  order: number;
  is_custom: boolean;
  status:
  | "pending"
  | "internal_approved"
  | "customer_approved"
  | "design_approved"
  | "owner_approved"
  | "rejected";
  internal_approved_by?: number;
  internal_approved_at?: string;
  customer_approved_by?: number;
  customer_approved_at?: string;
  design_approved_by?: number;
  design_approved_at?: string;
  owner_approved_by?: number;
  owner_approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  defects?: any[];
  attachments?: any[];
}

export const acceptanceApi = {
  // Get acceptance stages for project
  getStages: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/acceptance`);
    return response.data;
  },

  // Approve acceptance stage
  approveStage: async (
    projectId: string | number,
    stageId: string | number,
    approvalType: "internal" | "customer" | "design" | "owner"
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance/${stageId}/approve`, {
      approval_type: approvalType,
    });
    return response.data;
  },
};
