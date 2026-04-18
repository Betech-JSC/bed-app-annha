import api from "./api";

export interface AdditionalCost {
  id: number;
  uuid: string;
  project_id: number;
  amount: number;
  description: string;
  status: "pending" | "pending_approval" | "customer_paid" | "confirmed" | "approved" | "rejected";
  proposed_by: number;
  approved_by?: number;
  approved_at?: string;
  rejected_reason?: string;
  paid_date?: string;
  actual_amount?: number;
  confirmed_by?: number;
  confirmed_at?: string;
  customer_paid_by?: number;
  customer_paid_at?: string;
  created_at?: string;
  updated_at?: string;
  proposer?: {
    id: number;
    name: string;
    email: string;
  };
  approver?: {
    id: number;
    name: string;
    email: string;
  };
  confirmer?: {
    id: number;
    name: string;
    email: string;
  };
  customer_paid_by_user?: {
    id: number;
    name: string;
    email: string;
  };
  attachments?: Array<{
    id: number;
    file_name: string;
    original_name: string;
    file_url: string;
    mime_type: string;
    type: "image" | "video" | "document";
  }>;
}

export interface CreateAdditionalCostData {
  amount: number;
  description: string;
  attachment_ids?: number[];
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

  // Get additional cost detail
  getAdditionalCost: async (projectId: string | number, costId: string | number) => {
    const response = await api.get(`/projects/${projectId}/additional-costs/${costId}`);
    return response.data;
  },

  // Attach files to additional cost
  attachFiles: async (
    projectId: string | number,
    costId: string | number,
    attachmentIds: number[]
  ) => {
    const response = await api.post(
      `/projects/${projectId}/additional-costs/${costId}/attach-files`,
      { attachment_ids: attachmentIds }
    );
    return response.data;
  },

  // Mark as paid by customer (khách hàng đánh dấu đã thanh toán)
  markAsPaidByCustomer: async (
    projectId: string | number,
    costId: string | number,
    data: {
      paid_date?: string;
      actual_amount?: number;
      attachment_ids?: number[];
    }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/additional-costs/${costId}/mark-paid-by-customer`,
      data
    );
    return response.data;
  },

  // Confirm by accountant (kế toán xác nhận đã nhận tiền)
  confirmAdditionalCost: async (projectId: string | number, costId: string | number) => {
    const response = await api.post(
      `/projects/${projectId}/additional-costs/${costId}/confirm`
    );
    return response.data;
  },

  // Delete additional cost
  deleteAdditionalCost: async (projectId: string | number, costId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/additional-costs/${costId}`);
    return response.data;
  },

  // Hoàn duyệt chi phí phát sinh
  revertToDraft: async (projectId: string | number, costId: string | number) => {
    const response = await api.post(`/projects/${projectId}/additional-costs/${costId}/revert`);
    return response.data;
  },
};
