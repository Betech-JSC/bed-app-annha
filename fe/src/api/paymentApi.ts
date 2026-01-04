import api from "./api";

export interface ProjectPayment {
  id: number;
  uuid: string;
  project_id: number;
  contract_id?: number;
  payment_number: number;
  amount: number;
  notes?: string;
  due_date: string;
  paid_date?: string;
  status: "pending" | "customer_pending_approval" | "customer_approved" | "paid" | "overdue";
  confirmed_by?: number;
  confirmed_at?: string;
  customer_approved_by?: number;
  customer_approved_at?: string;
  payment_proof_uploaded_at?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  attachments?: Array<{
    id: number;
    file_name: string;
    original_name: string;
    file_url: string;
    mime_type: string;
    type: "image" | "video" | "document";
  }>;
  confirmer?: {
    id: number;
    name: string;
  };
  customer_approver?: {
    id: number;
    name: string;
  };
}

export interface CreatePaymentData {
  payment_number: number;
  amount: number;
  notes?: string;
  due_date: string;
  contract_id?: number;
}

export const paymentApi = {
  // Get payments for project
  getPayments: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/payments`);
    return response.data;
  },

  // Create payment
  createPayment: async (projectId: string | number, data: CreatePaymentData) => {
    const response = await api.post(`/projects/${projectId}/payments`, data);
    return response.data;
  },

  // Update payment
  updatePayment: async (
    projectId: string | number,
    paymentId: string | number,
    data: Partial<CreatePaymentData>
  ) => {
    const response = await api.put(`/projects/${projectId}/payments/${paymentId}`, data);
    return response.data;
  },

  // Confirm payment (kế toán)
  confirmPayment: async (projectId: string | number, paymentId: string | number, paidDate: string) => {
    const response = await api.post(`/projects/${projectId}/payments/${paymentId}/confirm`, {
      paid_date: paidDate,
    });
    return response.data;
  },

  // Upload payment proof (hình xác nhận chuyển khoản)
  uploadPaymentProof: async (projectId: string | number, paymentId: string | number, attachmentIds: number[]) => {
    const response = await api.post(`/projects/${projectId}/payments/${paymentId}/upload-proof`, {
      attachment_ids: attachmentIds,
    });
    return response.data;
  },

  // Approve by customer (khách hàng duyệt)
  approveByCustomer: async (projectId: string | number, paymentId: string | number) => {
    const response = await api.post(`/projects/${projectId}/payments/${paymentId}/approve-by-customer`);
    return response.data;
  },

  // Reject by customer (khách hàng từ chối)
  rejectByCustomer: async (projectId: string | number, paymentId: string | number, reason: string) => {
    const response = await api.post(`/projects/${projectId}/payments/${paymentId}/reject-by-customer`, {
      rejection_reason: reason,
    });
    return response.data;
  },
};
