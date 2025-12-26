import api from "./api";

export interface Invoice {
  id: number;
  uuid: string;
  project_id: number;
  invoice_date: string;
  due_date?: string;
  customer_id: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  description?: string;
  notes?: string;
  status: "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "cancelled";
  paid_date?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  project?: any;
  customer?: any;
  creator?: any;
}

export interface CreateInvoiceData {
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  description?: string;
  notes?: string;
}

export const invoiceApi = {
  getInvoices: async (projectId: number, params?: {
    page?: number;
  }) => {
    const response = await api.get(`/projects/${projectId}/invoices`, { params });
    return response.data;
  },

  getInvoice: async (projectId: number, id: number) => {
    const response = await api.get(`/projects/${projectId}/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (projectId: number, data: CreateInvoiceData) => {
    const response = await api.post(`/projects/${projectId}/invoices`, data);
    return response.data;
  },

  sendInvoice: async (projectId: number, id: number) => {
    const response = await api.post(`/projects/${projectId}/invoices/${id}/send`);
    return response.data;
  },

  markPaid: async (projectId: number, id: number, paidDate: string) => {
    const response = await api.post(`/projects/${projectId}/invoices/${id}/mark-paid`, {
      paid_date: paidDate,
    });
    return response.data;
  },

  updateInvoice: async (projectId: number, id: number, data: Partial<CreateInvoiceData>) => {
    const response = await api.put(`/projects/${projectId}/invoices/${id}`, data);
    return response.data;
  },

  deleteInvoice: async (projectId: number, id: number) => {
    const response = await api.delete(`/projects/${projectId}/invoices/${id}`);
    return response.data;
  },
};

