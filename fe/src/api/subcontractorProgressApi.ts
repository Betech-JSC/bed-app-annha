import api from "./api";

export interface SubcontractorProgress {
  id: number;
  uuid: string;
  subcontractor_id: number;
  project_id: number;
  subcontractor_contract_id?: number;
  progress_date: string;
  planned_progress: number;
  actual_progress: number;
  completed_volume: number;
  volume_unit: string;
  work_description?: string;
  next_week_plan?: string;
  issues_and_risks?: string;
  status: "on_schedule" | "delayed" | "ahead_of_schedule" | "at_risk";
  reported_by: number;
  verified_by?: number;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  subcontractor?: any;
  project?: any;
  contract?: any;
  reporter?: any;
  verifier?: any;
  progress_difference?: number;
  is_on_schedule?: boolean;
}

export interface CreateSubcontractorProgressData {
  subcontractor_id: number;
  project_id: number;
  subcontractor_contract_id?: number;
  progress_date: string;
  planned_progress: number;
  actual_progress: number;
  completed_volume: number;
  volume_unit?: string;
  work_description?: string;
  next_week_plan?: string;
  issues_and_risks?: string;
  status?: "on_schedule" | "delayed" | "ahead_of_schedule" | "at_risk";
}

export const subcontractorProgressApi = {
  // Danh sách tiến độ
  getProgress: async (params?: {
    project_id?: number;
    subcontractor_id?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
  }) => {
    const response = await api.get("/admin/subcontractor-progress", { params });
    return response.data;
  },

  // Chi tiết tiến độ
  getProgressDetail: async (id: number) => {
    const response = await api.get(`/admin/subcontractor-progress/${id}`);
    return response.data;
  },

  // Tạo báo cáo tiến độ
  createProgress: async (data: CreateSubcontractorProgressData) => {
    const response = await api.post("/admin/subcontractor-progress", data);
    return response.data;
  },

  // Cập nhật tiến độ
  updateProgress: async (id: number, data: Partial<CreateSubcontractorProgressData>) => {
    const response = await api.put(`/admin/subcontractor-progress/${id}`, data);
    return response.data;
  },

  // Xóa tiến độ
  deleteProgress: async (id: number) => {
    const response = await api.delete(`/admin/subcontractor-progress/${id}`);
    return response.data;
  },

  // Xác nhận tiến độ
  verifyProgress: async (id: number) => {
    const response = await api.post(`/admin/subcontractor-progress/${id}/verify`);
    return response.data;
  },
};

