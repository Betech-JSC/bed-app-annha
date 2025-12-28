import api from "./api";

export interface SubcontractorContract {
  id: number;
  uuid: string;
  subcontractor_id: number;
  project_id: number;
  global_subcontractor_id?: number;
  contract_number?: string;
  contract_name: string;
  description?: string;
  contract_date: string;
  start_date: string;
  end_date?: string;
  contract_value: number;
  advance_payment: number;
  retention: number;
  retention_percentage: number;
  payment_method: "milestone" | "progress" | "monthly" | "lump_sum";
  payment_schedule?: any;
  status: "draft" | "active" | "suspended" | "completed" | "terminated" | "cancelled";
  terms_and_conditions?: string;
  signed_by?: number;
  signed_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  subcontractor?: any;
  project?: any;
  signer?: any;
  acceptances?: any[];
  progress?: any[];
  payments?: any[];
  remaining_value?: number;
  paid_percentage?: number;
}

export interface CreateSubcontractorContractData {
  subcontractor_id: number;
  project_id: number;
  global_subcontractor_id?: number;
  contract_number?: string;
  contract_name: string;
  description?: string;
  contract_date: string;
  start_date: string;
  end_date?: string;
  contract_value: number;
  advance_payment?: number;
  retention?: number;
  retention_percentage?: number;
  payment_method: "milestone" | "progress" | "monthly" | "lump_sum";
  payment_schedule?: any;
  status?: "draft" | "active" | "suspended" | "completed" | "terminated" | "cancelled";
  terms_and_conditions?: string;
}

export const subcontractorContractApi = {
  // Danh sách hợp đồng
  getContracts: async (params?: {
    project_id?: number;
    subcontractor_id?: number;
    status?: string;
    page?: number;
  }) => {
    const response = await api.get("/admin/subcontractor-contracts", { params });
    return response.data;
  },

  // Chi tiết hợp đồng
  getContract: async (id: number) => {
    const response = await api.get(`/admin/subcontractor-contracts/${id}`);
    return response.data;
  },

  // Tạo hợp đồng
  createContract: async (data: CreateSubcontractorContractData) => {
    const response = await api.post("/admin/subcontractor-contracts", data);
    return response.data;
  },

  // Cập nhật hợp đồng
  updateContract: async (id: number, data: Partial<CreateSubcontractorContractData>) => {
    const response = await api.put(`/admin/subcontractor-contracts/${id}`, data);
    return response.data;
  },

  // Xóa hợp đồng
  deleteContract: async (id: number) => {
    const response = await api.delete(`/admin/subcontractor-contracts/${id}`);
    return response.data;
  },

  // Ký hợp đồng
  signContract: async (id: number) => {
    const response = await api.post(`/admin/subcontractor-contracts/${id}/sign`);
    return response.data;
  },
};

