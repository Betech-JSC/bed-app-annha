import api from "./api";

export interface Defect {
  id: number;
  uuid: string;
  project_id: number;
  task_id?: number;
  acceptance_stage_id?: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "fixed" | "verified";
  expected_completion_date?: string;
  reported_by: number;
  reported_at: string;
  fixed_by?: number;
  fixed_at?: string;
  verified_by?: number;
  verified_at?: string;
  attachments?: any[];
  task?: any;
  histories?: DefectHistory[];
}

export interface DefectHistory {
  id: number;
  defect_id: number;
  action: "created" | "status_changed" | "assigned" | "updated" | "commented";
  old_status?: string;
  new_status?: string;
  comment?: string;
  user_id: number;
  user?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateDefectData {
  task_id?: number;
  acceptance_stage_id?: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  before_image_ids?: number[];
}

export const defectApi = {
  // Get defects for project
  getDefects: async (
    projectId: string | number,
    params?: { status?: string; severity?: string; acceptance_stage_id?: number }
  ) => {
    const response = await api.get(`/projects/${projectId}/defects`, { params });
    return response.data;
  },

  // Create defect
  createDefect: async (projectId: string | number, data: CreateDefectData) => {
    const response = await api.post(`/projects/${projectId}/defects`, data);
    return response.data;
  },

  // Get defect detail
  getDefect: async (projectId: string | number, defectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/defects/${defectId}`);
    return response.data;
  },

  // Update defect
  updateDefect: async (
    projectId: string | number,
    defectId: string | number,
    data: Partial<CreateDefectData & { status?: string; expected_completion_date?: string; after_image_ids?: number[] }>
  ) => {
    const response = await api.put(`/projects/${projectId}/defects/${defectId}`, data);
    return response.data;
  },
};
