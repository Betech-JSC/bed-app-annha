import api from "./api";

export interface ChangeRequest {
  id: number;
  uuid: string;
  project_id: number;
  title: string;
  description: string;
  change_type: "scope" | "schedule" | "cost" | "quality" | "resource" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "implemented" | "cancelled";
  reason?: string;
  impact_analysis?: string;
  estimated_cost_impact?: number;
  estimated_schedule_impact_days?: number;
  implementation_plan?: string;
  requested_by: number;
  reviewed_by?: number;
  approved_by?: number;
  submitted_at?: string;
  reviewed_at?: string;
  approved_at?: string;
  implemented_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  requester?: any;
  reviewer?: any;
  approver?: any;
}

export interface CreateChangeRequestData {
  title: string;
  description: string;
  change_type: "scope" | "schedule" | "cost" | "quality" | "resource" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  reason?: string;
  impact_analysis?: string;
  estimated_cost_impact?: number;
  estimated_schedule_impact_days?: number;
  implementation_plan?: string;
}

export const changeRequestApi = {
  // Get all change requests for a project
  getChangeRequests: async (projectId: string | number, params?: {
    status?: string;
    change_type?: string;
    pending_only?: boolean;
  }) => {
    const response = await api.get(`/projects/${projectId}/change-requests`, { params });
    return response.data;
  },

  // Get single change request
  getChangeRequest: async (projectId: string | number, changeRequestId: string | number) => {
    const response = await api.get(`/projects/${projectId}/change-requests/${changeRequestId}`);
    return response.data;
  },

  // Create change request
  createChangeRequest: async (projectId: string | number, data: CreateChangeRequestData) => {
    const response = await api.post(`/projects/${projectId}/change-requests`, data);
    return response.data;
  },

  // Update change request
  updateChangeRequest: async (
    projectId: string | number,
    changeRequestId: string | number,
    data: Partial<CreateChangeRequestData>
  ) => {
    const response = await api.put(`/projects/${projectId}/change-requests/${changeRequestId}`, data);
    return response.data;
  },

  // Delete change request
  deleteChangeRequest: async (projectId: string | number, changeRequestId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/change-requests/${changeRequestId}`);
    return response.data;
  },

  // Submit change request
  submitChangeRequest: async (projectId: string | number, changeRequestId: string | number) => {
    const response = await api.post(`/projects/${projectId}/change-requests/${changeRequestId}/submit`);
    return response.data;
  },

  // Approve change request
  approveChangeRequest: async (projectId: string | number, changeRequestId: string | number, notes?: string) => {
    const response = await api.post(`/projects/${projectId}/change-requests/${changeRequestId}/approve`, { notes });
    return response.data;
  },

  // Reject change request
  rejectChangeRequest: async (projectId: string | number, changeRequestId: string | number, reason: string) => {
    const response = await api.post(`/projects/${projectId}/change-requests/${changeRequestId}/reject`, { reason });
    return response.data;
  },

  // Mark as implemented
  markAsImplemented: async (projectId: string | number, changeRequestId: string | number) => {
    const response = await api.post(`/projects/${projectId}/change-requests/${changeRequestId}/implement`);
    return response.data;
  },
};

