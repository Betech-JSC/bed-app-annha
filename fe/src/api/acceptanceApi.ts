import api from "./api";

export interface AcceptanceItem {
  id: number;
  uuid: string;
  acceptance_stage_id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  acceptance_status: "not_started" | "pending" | "approved" | "rejected";
  notes?: string;
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  order: number;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  is_completed?: boolean;
  can_accept?: boolean;
  approver?: any;
  rejector?: any;
  attachments?: any[];
}

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
  items?: AcceptanceItem[];
  is_completed?: boolean;
  completion_percentage?: number;
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


  // ==================================================================
  // ACCEPTANCE ITEMS
  // ==================================================================

  // Get items for a stage
  getItems: async (
    projectId: string | number,
    stageId: string | number
  ) => {
    const response = await api.get(
      `/projects/${projectId}/acceptance/${stageId}/items`
    );
    return response.data;
  },

  // Create item
  createItem: async (
    projectId: string | number,
    stageId: string | number,
    data: {
      name: string;
      description?: string;
      start_date: string;
      end_date: string;
      notes?: string;
      order?: number;
    }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items`,
      data
    );
    return response.data;
  },

  // Update item
  updateItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    data: Partial<{
      name: string;
      description?: string;
      start_date: string;
      end_date: string;
      notes?: string;
      order?: number;
    }>
  ) => {
    const response = await api.put(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}`,
      data
    );
    return response.data;
  },

  // Delete item
  deleteItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.delete(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}`
    );
    return response.data;
  },

  // Approve item
  approveItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    notes?: string
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/approve`,
      { notes }
    );
    return response.data;
  },

  // Reject item
  rejectItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    rejection_reason: string
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/reject`,
      { rejection_reason }
    );
    return response.data;
  },

  // Reset item acceptance
  resetItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/reset`
    );
    return response.data;
  },

  // Reorder items
  reorderItems: async (
    projectId: string | number,
    stageId: string | number,
    items: Array<{ id: number; order: number }>
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/reorder`,
      { items }
    );
    return response.data;
  },

  // Attach files to item
  attachItemFiles: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    attachmentIds: number[]
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/attach-files`,
      { attachment_ids: attachmentIds }
    );
    return response.data;
  },
};
