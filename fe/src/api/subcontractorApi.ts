import api from "./api";

export interface SubcontractorItem {
  id: number;
  uuid: string;
  subcontractor_id: number;
  name: string;
  description?: string;
  unit_price: number;
  quantity: number;
  unit?: string;
  total_amount: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorPayment {
  id: number;
  uuid: string;
  subcontractor_id: number;
  project_id: number;
  work_volume_id?: number;
  payment_number: string;
  payment_stage?: string;
  amount: number;
  accepted_volume?: number;
  payment_date?: string;
  payment_method: "cash" | "bank_transfer" | "check" | "other";
  reference_number?: string;
  description?: string;
  status: "draft" | "pending_management_approval" | "pending_accountant_confirmation" | "approved" | "paid" | "rejected" | "cancelled";
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  paid_by?: number;
  paid_at?: string;
  subcontractor?: Subcontractor;
  creator?: any;
  approver?: any;
  payer?: any;
  status_label?: string;
  payment_method_label?: string;
}

export interface Subcontractor {
  id: number;
  uuid: string;
  project_id: number;
  name: string;
  category?: string;
  total_quote: number;
  advance_payment: number;
  total_paid: number;
  progress_start_date?: string;
  progress_end_date?: string;
  progress_status: "not_started" | "in_progress" | "completed" | "delayed";
  payment_status: "pending" | "partial" | "completed";
  approved_by?: number;
  approved_at?: string;
  attachments?: any[];
  items?: SubcontractorItem[];
  payments?: SubcontractorPayment[];
  remaining_amount?: number;
  payment_percentage?: number;
}

export interface CreateSubcontractorData {
  global_subcontractor_id?: number;
  name: string;
  category?: string;
  total_quote: number;
  advance_payment?: number;
  progress_start_date?: string;
  progress_end_date?: string;
  progress_status?: "not_started" | "in_progress" | "completed" | "delayed";
  attachment_ids?: number[];
  create_cost?: boolean;
  cost_group_id?: number;
  cost_date?: string;
}

export const subcontractorApi = {
  // Get subcontractors for project
  getSubcontractors: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/subcontractors`);
    return response.data;
  },

  // Get single subcontractor
  getSubcontractor: async (projectId: string | number, subcontractorId: string | number) => {
    const response = await api.get(`/projects/${projectId}/subcontractors/${subcontractorId}`);
    return response.data;
  },

  // Create subcontractor
  createSubcontractor: async (projectId: string | number, data: CreateSubcontractorData) => {
    const response = await api.post(`/projects/${projectId}/subcontractors`, data);
    return response.data;
  },

  // Update subcontractor
  updateSubcontractor: async (
    projectId: string | number,
    subcontractorId: string | number,
    data: Partial<CreateSubcontractorData>
  ) => {
    const response = await api.put(`/projects/${projectId}/subcontractors/${subcontractorId}`, data);
    return response.data;
  },

  // Delete subcontractor
  deleteSubcontractor: async (projectId: string | number, subcontractorId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/subcontractors/${subcontractorId}`);
    return response.data;
  },

  // Approve subcontractor
  approveSubcontractor: async (projectId: string | number, subcontractorId: string | number) => {
    const response = await api.post(`/projects/${projectId}/subcontractors/${subcontractorId}/approve`);
    return response.data;
  },

  // ==================================================================
  // SUBCONTRACTOR ITEMS
  // ==================================================================

  // Get items
  getItems: async (projectId: string | number, subcontractorId: string | number) => {
    const response = await api.get(`/projects/${projectId}/subcontractors/${subcontractorId}/items`);
    return response.data;
  },

  // Create item
  createItem: async (
    projectId: string | number,
    subcontractorId: string | number,
    data: {
      name: string;
      description?: string;
      unit_price: number;
      quantity: number;
      unit?: string;
      order?: number;
    }
  ) => {
    const response = await api.post(`/projects/${projectId}/subcontractors/${subcontractorId}/items`, data);
    return response.data;
  },

  // Update item
  updateItem: async (
    projectId: string | number,
    subcontractorId: string | number,
    itemId: string | number,
    data: Partial<{
      name: string;
      description?: string;
      unit_price: number;
      quantity: number;
      unit?: string;
      order?: number;
    }>
  ) => {
    const response = await api.put(`/projects/${projectId}/subcontractors/${subcontractorId}/items/${itemId}`, data);
    return response.data;
  },

  // Delete item
  deleteItem: async (
    projectId: string | number,
    subcontractorId: string | number,
    itemId: string | number
  ) => {
    const response = await api.delete(`/projects/${projectId}/subcontractors/${subcontractorId}/items/${itemId}`);
    return response.data;
  },

  // Reorder items
  reorderItems: async (
    projectId: string | number,
    subcontractorId: string | number,
    items: Array<{ id: number; order: number }>
  ) => {
    const response = await api.post(`/projects/${projectId}/subcontractors/${subcontractorId}/items/reorder`, { items });
    return response.data;
  },

  // ==================================================================
  // SUBCONTRACTOR PAYMENTS
  // ==================================================================

  // Get payments
  getPayments: async (
    projectId: string | number,
    params?: { subcontractor_id?: number; status?: string }
  ) => {
    const response = await api.get(`/projects/${projectId}/subcontractor-payments`, { params });
    return response.data;
  },

  // Get single payment
  getPayment: async (projectId: string | number, paymentId: string | number) => {
    const response = await api.get(`/projects/${projectId}/subcontractor-payments/${paymentId}`);
    return response.data;
  },

  // Create payment
  createPayment: async (
    projectId: string | number,
    data: {
      subcontractor_id: number;
      work_volume_id?: number;
      payment_stage?: string;
      amount: number;
      accepted_volume?: number;
      payment_date?: string;
      payment_method: "cash" | "bank_transfer" | "check" | "other";
      reference_number?: string;
      description?: string;
    }
  ) => {
    const response = await api.post(`/projects/${projectId}/subcontractor-payments`, data);
    return response.data;
  },

  // Update payment
  updatePayment: async (
    projectId: string | number,
    paymentId: string | number,
    data: Partial<{
      payment_stage?: string;
      amount: number;
      accepted_volume?: number;
      payment_date?: string;
      payment_method: "cash" | "bank_transfer" | "check" | "other";
      reference_number?: string;
      description?: string;
    }>
  ) => {
    const response = await api.put(`/projects/${projectId}/subcontractor-payments/${paymentId}`, data);
    return response.data;
  },

  // Delete payment
  deletePayment: async (projectId: string | number, paymentId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/subcontractor-payments/${paymentId}`);
    return response.data;
  },

  // Submit payment for approval (draft -> pending_management_approval)
  submitPayment: async (projectId: string | number, paymentId: string | number) => {
    const response = await api.post(`/projects/${projectId}/subcontractor-payments/${paymentId}/submit`);
    return response.data;
  },

  // Approve payment (pending_management_approval -> pending_accountant_confirmation)
  approvePayment: async (projectId: string | number, paymentId: string | number) => {
    const response = await api.post(`/projects/${projectId}/subcontractor-payments/${paymentId}/approve`);
    return response.data;
  },

  // Reject payment
  rejectPayment: async (projectId: string | number, paymentId: string | number, rejectionReason?: string) => {
    const response = await api.post(`/projects/${projectId}/subcontractor-payments/${paymentId}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // Mark as paid (pending_accountant_confirmation -> paid)
  markPaymentAsPaid: async (projectId: string | number, paymentId: string | number) => {
    const response = await api.post(`/projects/${projectId}/subcontractor-payments/${paymentId}/mark-paid`);
    return response.data;
  },
};
