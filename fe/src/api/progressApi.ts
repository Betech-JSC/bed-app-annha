import api from "./api";

export interface ProjectProgress {
  id: number;
  project_id: number;
  overall_percentage: number;
  calculated_from: "logs" | "subcontractors" | "manual";
  last_calculated_at?: string;
}

export const progressApi = {
  // Get progress for project
  getProgress: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/progress`);
    return response.data;
  },
};
