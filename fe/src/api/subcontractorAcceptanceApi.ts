import api from "./api";

export interface SubcontractorAcceptance {
  id: number;
  uuid: string;
  subcontractor_id: number;
  project_id: number;
  subcontractor_contract_id?: number;
  acceptance_number?: string;
  acceptance_name: string;
  description?: string;
  acceptance_date: string;
  accepted_volume: number;
  volume_unit: string;
  accepted_amount: number;
  quality_score?: number;
  status: "pending" | "approved" | "rejected" | "partially_approved";
  notes?: string;
  rejection_reason?: string;
  accepted_by?: number;
  accepted_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  subcontractor?: any;
  project?: any;
  contract?: any;
  accepter?: any;
  rejector?: any;
}

export interface CreateSubcontractorAcceptanceData {
  subcontractor_id: number;
  project_id: number;
  subcontractor_contract_id?: number;
  acceptance_number?: string;
  acceptance_name: string;
  description?: string;
  acceptance_date: string;
  accepted_volume: number;
  volume_unit?: string;
  accepted_amount: number;
  quality_score?: number;
  notes?: string;
}

export const subcontractorAcceptanceApi = {
  // Danh sách nghiệm thu
  getAcceptances: async (params?: {
    project_id?: number;
    subcontractor_id?: number;
    status?: string;
    page?: number;
  }) => {
    const response = await api.get("/admin/subcontractor-acceptances", { params });
    return response.data;
  },

  // Chi tiết nghiệm thu
  getAcceptance: async (id: number) => {
    const response = await api.get(`/admin/subcontractor-acceptances/${id}`);
    return response.data;
  },

  // Tạo nghiệm thu
  createAcceptance: async (data: CreateSubcontractorAcceptanceData) => {
    const response = await api.post("/admin/subcontractor-acceptances", data);
    return response.data;
  },

  // Cập nhật nghiệm thu
  updateAcceptance: async (id: number, data: Partial<CreateSubcontractorAcceptanceData>) => {
    const response = await api.put(`/admin/subcontractor-acceptances/${id}`, data);
    return response.data;
  },

  // Xóa nghiệm thu
  deleteAcceptance: async (id: number) => {
    const response = await api.delete(`/admin/subcontractor-acceptances/${id}`);
    return response.data;
  },

  // Duyệt nghiệm thu
  approveAcceptance: async (id: number, notes?: string) => {
    const response = await api.post(`/admin/subcontractor-acceptances/${id}/approve`, { notes });
    return response.data;
  },

  // Từ chối nghiệm thu
  rejectAcceptance: async (id: number, rejection_reason: string) => {
    const response = await api.post(`/admin/subcontractor-acceptances/${id}/reject`, { rejection_reason });
    return response.data;
  },
};

