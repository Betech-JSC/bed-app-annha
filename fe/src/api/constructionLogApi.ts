import api from "./api";

export interface ConstructionLog {
  id: number;
  uuid: string;
  project_id: number;
  log_date: string;
  weather?: string;
  personnel_count?: number;
  completion_percentage: number;
  notes?: string;
  created_by: number;
  created_at: string;
  attachments?: any[];
}

export interface CreateConstructionLogData {
  log_date: string;
  weather?: string;
  personnel_count?: number;
  completion_percentage?: number;
  notes?: string;
  attachment_ids?: number[];
}

export const constructionLogApi = {
  // Get construction logs for project
  getLogs: async (projectId: string | number, params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get(`/projects/${projectId}/logs`, { params });
    return response.data;
  },

  // Create construction log
  createLog: async (projectId: string | number, data: CreateConstructionLogData) => {
    const response = await api.post(`/projects/${projectId}/logs`, data);
    return response.data;
  },

  // Update construction log
  updateLog: async (projectId: string | number, logId: number, data: Partial<CreateConstructionLogData>) => {
    const response = await api.put(`/projects/${projectId}/logs/${logId}`, data);
    return response.data;
  },

  // Delete construction log
  deleteLog: async (projectId: string | number, logId: number) => {
    const response = await api.delete(`/projects/${projectId}/logs/${logId}`);
    return response.data;
  },
};
