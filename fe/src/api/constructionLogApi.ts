import api from "./api";

export interface ConstructionLog {
  id: number;
  uuid: string;
  project_id: number;
  task_id?: number;
  log_date: string;
  weather?: string;
  personnel_count?: number;
  completion_percentage: number;
  notes?: string;
  // Sprint 1 enhanced fields
  shift?: 'morning' | 'afternoon' | 'night' | 'full_day';
  work_items?: any[];
  issues?: string;
  safety_notes?: string;
  delay_reason?: string;
  adjustment_id?: number;
  approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  created_by: number;
  created_at: string;
  attachments?: any[];
  task?: {
    id: number;
    name: string;
    progress_percentage: number;
  };
  creator?: { id: number; name: string };
  approver?: { id: number; name: string };
}

export interface CreateConstructionLogData {
  log_date: string;
  task_id?: number;
  weather?: string;
  personnel_count?: number;
  completion_percentage?: number;
  notes?: string;
  shift?: string;
  work_items?: any[];
  issues?: string;
  safety_notes?: string;
  delay_reason?: string;
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

  // ==================================================================
  // SPRINT 1 — ENHANCED LOG ENDPOINTS
  // ==================================================================

  // Get daily report aggregation
  getDailyReport: async (
    projectId: string | number,
    params: { date: string }
  ) => {
    const response = await api.get(
      `/projects/${projectId}/logs/daily-report`,
      { params }
    );
    return response.data;
  },

  // Approve construction log
  approveLog: async (
    projectId: string | number,
    logId: number,
    data: { status: 'approved' | 'rejected'; notes?: string }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/logs/${logId}/approve`,
      data
    );
    return response.data;
  },

  // Get progress comparison (logs vs planned)
  getProgressComparison: async (projectId: string | number) => {
    const response = await api.get(
      `/projects/${projectId}/logs/progress-comparison`
    );
    return response.data;
  },

  // Request schedule adjustment from log
  requestAdjustment: async (
    projectId: string | number,
    logId: number,
    data: {
      reason: string;
      proposed_end_date?: string;
      proposed_duration?: number;
    }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/logs/${logId}/request-adjustment`,
      data
    );
    return response.data;
  },
};
