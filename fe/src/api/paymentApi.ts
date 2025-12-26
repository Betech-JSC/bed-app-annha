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
  status: "pending" | "paid" | "overdue";
  confirmed_by?: number;
  confirmed_at?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  attachments?: any[];
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

  // Confirm payment
  confirmPayment: async (projectId: string | number, paymentId: string | number, paidDate: string) => {
    const response = await api.post(`/projects/${projectId}/payments/${paymentId}/confirm`, {
      paid_date: paidDate,
    });
    return response.data;
  },
};
