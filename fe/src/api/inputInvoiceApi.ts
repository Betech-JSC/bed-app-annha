import api from "./api";

export interface InputInvoice {
  id: number;
  uuid: string;
  project_id?: number;
  invoice_type?: string;
  issue_date: string;
  invoice_number?: string;
  supplier_name?: string;
  amount_before_vat: number;
  vat_percentage: number;
  vat_amount: number;
  total_amount: number;
  description?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  project?: {
    id: number;
    name: string;
    code: string;
  };
  creator?: {
    id: number;
    name: string;
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

export interface CreateInputInvoiceData {
  project_id?: number;
  invoice_type?: string;
  issue_date: string;
  invoice_number?: string;
  supplier_name?: string;
  amount_before_vat: number;
  vat_percentage?: number;
  description?: string;
  notes?: string;
  attachment_ids?: number[];
}

export interface UpdateInputInvoiceData {
  project_id?: number;
  invoice_type?: string;
  issue_date?: string;
  invoice_number?: string;
  supplier_name?: string;
  amount_before_vat?: number;
  vat_percentage?: number;
  description?: string;
  notes?: string;
  attachment_ids?: number[];
}

export const inputInvoiceApi = {
  // Get all input invoices (global - không cần project)
  getAll: async (params?: {
    invoice_type?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    per_page?: number;
  }) => {
    const response = await api.get("/accounting/input-invoices", { params });
    return response.data;
  },

  // Get input invoices for project
  getByProject: async (projectId: string | number, params?: {
    invoice_type?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    per_page?: number;
  }) => {
    const response = await api.get(`/projects/${projectId}/input-invoices`, { params });
    return response.data;
  },

  // Create input invoice (global)
  create: async (data: CreateInputInvoiceData) => {
    const response = await api.post("/accounting/input-invoices", data);
    return response.data;
  },

  // Create input invoice for project
  createForProject: async (projectId: string | number, data: CreateInputInvoiceData) => {
    const response = await api.post(`/projects/${projectId}/input-invoices`, data);
    return response.data;
  },

  // Get input invoice detail
  getDetail: async (id: string | number) => {
    const response = await api.get(`/accounting/input-invoices/${id}`);
    return response.data;
  },

  // Get input invoice detail for project
  getDetailForProject: async (projectId: string | number, id: string | number) => {
    const response = await api.get(`/projects/${projectId}/input-invoices/${id}`);
    return response.data;
  },

  // Update input invoice
  update: async (id: string | number, data: UpdateInputInvoiceData) => {
    const response = await api.put(`/accounting/input-invoices/${id}`, data);
    return response.data;
  },

  // Update input invoice for project
  updateForProject: async (projectId: string | number, id: string | number, data: UpdateInputInvoiceData) => {
    const response = await api.put(`/projects/${projectId}/input-invoices/${id}`, data);
    return response.data;
  },

  // Delete input invoice
  delete: async (id: string | number) => {
    const response = await api.delete(`/accounting/input-invoices/${id}`);
    return response.data;
  },

  // Delete input invoice for project
  deleteForProject: async (projectId: string | number, id: string | number) => {
    const response = await api.delete(`/projects/${projectId}/input-invoices/${id}`);
    return response.data;
  },
};



