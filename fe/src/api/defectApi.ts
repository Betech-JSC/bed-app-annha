import api from "./api";

export interface Defect {
  id: number;
  uuid: string;
  project_id: number;
  acceptance_stage_id?: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "fixed" | "verified";
  reported_by: number;
  reported_at: string;
  fixed_by?: number;
  fixed_at?: string;
  verified_by?: number;
  verified_at?: string;
  attachments?: any[];
}

export interface CreateDefectData {
  acceptance_stage_id?: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export const defectApi = {
  // Get defects for project
  getDefects: async (
    projectId: string | number,
    params?: { status?: string; severity?: string }
  ) => {
    const response = await api.get(`/projects/${projectId}/defects`, { params });
    return response.data;
  },

  // Create defect
  createDefect: async (projectId: string | number, data: CreateDefectData) => {
    const response = await api.post(`/projects/${projectId}/defects`, data);
    return response.data;
  },

  // Update defect
  updateDefect: async (
    projectId: string | number,
    defectId: string | number,
    data: Partial<CreateDefectData & { status?: string }>
  ) => {
    const response = await api.put(`/projects/${projectId}/defects/${defectId}`, data);
    return response.data;
  },
};
