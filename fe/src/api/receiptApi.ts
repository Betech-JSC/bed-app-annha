import api from "./api";

export interface Receipt {
  id: number;
  uuid: string;
  project_id?: number;
  receipt_number?: string;
  receipt_date: string;
  type: "purchase" | "expense" | "payment";
  supplier_id?: number;
  cost_id?: number;
  amount: number;
  payment_method?: string;
  description?: string;
  notes?: string;
  status: "draft" | "verified" | "cancelled";
  created_by: number;
  verified_by?: number;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  project?: any;
  supplier?: any;
  cost?: any;
  creator?: any;
  verifier?: any;
}

export interface CreateReceiptData {
  project_id?: number;
  receipt_date: string;
  type: "purchase" | "expense" | "payment";
  supplier_id?: number;
  cost_id?: number;
  amount: number;
  payment_method?: string;
  description?: string;
  notes?: string;
}

export const receiptApi = {
  getReceipts: async (params?: {
    project_id?: number;
    type?: "purchase" | "expense" | "payment";
    status?: "draft" | "verified" | "cancelled";
    page?: number;
  }) => {
    const response = await api.get("/admin/receipts", { params });
    return response.data;
  },

  getReceipt: async (id: number) => {
    const response = await api.get(`/admin/receipts/${id}`);
    return response.data;
  },

  createReceipt: async (data: CreateReceiptData) => {
    const response = await api.post("/admin/receipts", data);
    return response.data;
  },

  updateReceipt: async (id: number, data: Partial<CreateReceiptData>) => {
    const response = await api.put(`/admin/receipts/${id}`, data);
    return response.data;
  },

  verifyReceipt: async (id: number) => {
    const response = await api.post(`/admin/receipts/${id}/verify`);
    return response.data;
  },

  deleteReceipt: async (id: number) => {
    const response = await api.delete(`/admin/receipts/${id}`);
    return response.data;
  },
};

