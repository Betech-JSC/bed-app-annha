import api from "./api";

export interface ProjectPersonnel {
  id: number;
  project_id: number;
  user_id: number;
  role:
  | "project_manager"
  | "supervisor"
  | "accountant"
  | "viewer"
  | "editor"
  | "management"
  | "team_leader"
  | "worker"
  | "guest"
  | "supervisor_guest"
  | "designer";
  permissions?: string[];
  assigned_by: number;
  assigned_at: string;
  user?: any;
  assigner?: any;
}

export interface CreatePersonnelData {
  user_id: number;
  role:
  | "project_manager"
  | "supervisor"
  | "accountant"
  | "viewer"
  | "editor"
  | "management"
  | "team_leader"
  | "worker"
  | "guest"
  | "supervisor_guest"
  | "designer";
  permissions?: string[];
}

export const personnelApi = {
  // Get personnel for project
  getPersonnel: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/personnel`);
    return response.data;
  },

  // Add personnel
  addPersonnel: async (projectId: string | number, data: CreatePersonnelData) => {
    const response = await api.post(`/projects/${projectId}/personnel`, data);
    return response.data;
  },

  // Remove personnel
  removePersonnel: async (projectId: string | number, personnelId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/personnel/${personnelId}`);
    return response.data;
  },
};
