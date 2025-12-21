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

export interface CreateAcceptanceStageData {
  name: string;
  description?: string;
  order?: number;
}

export const acceptanceApi = {
  // Get acceptance stages for project
  getStages: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/acceptance`);
    return response.data;
  },

  // Get single acceptance stage
  getStage: async (projectId: string | number, stageId: string | number) => {
    const response = await api.get(`/projects/${projectId}/acceptance/${stageId}`);
    return response.data;
  },

  // Create acceptance stage
  createStage: async (
    projectId: string | number,
    data: CreateAcceptanceStageData
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance`, data);
    return response.data;
  },

  // Update acceptance stage
  updateStage: async (
    projectId: string | number,
    stageId: string | number,
    data: Partial<CreateAcceptanceStageData>
  ) => {
    const response = await api.put(`/projects/${projectId}/acceptance/${stageId}`, data);
    return response.data;
  },

  // Delete acceptance stage
  deleteStage: async (projectId: string | number, stageId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/acceptance/${stageId}`);
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

  // Attach files to acceptance stage
  attachFiles: async (
    projectId: string | number,
    stageId: string | number,
    attachmentIds: number[]
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance/${stageId}/attach-files`, {
      attachment_ids: attachmentIds,
    });
    return response.data;
  },

  // Create default stages for project
  createDefaultStages: async (projectId: string | number) => {
    const response = await api.post(`/projects/${projectId}/acceptance/default-stages`);
    return response.data;
  },
};
