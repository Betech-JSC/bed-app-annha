import api from "./api";

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
}

export interface CreateSubcontractorData {
  name: string;
  category?: string;
  total_quote: number;
  advance_payment?: number;
  progress_start_date?: string;
  progress_end_date?: string;
  progress_status?: "not_started" | "in_progress" | "completed" | "delayed";
}

export const subcontractorApi = {
  // Get subcontractors for project
  getSubcontractors: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/subcontractors`);
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
};
