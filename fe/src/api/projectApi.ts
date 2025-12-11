import api from "./api";

export interface Project {
  id: number;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  customer_id: number;
  project_manager_id?: number;
  start_date?: string;
  end_date?: string;
  status: "planning" | "in_progress" | "completed" | "cancelled";
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  customer?: any;
  project_manager?: any;
  contract?: any;
  progress?: any;
}

export interface CreateProjectData {
  name: string;
  code?: string;
  description?: string;
  customer_id: number;
  project_manager_id?: number;
  start_date?: string;
  end_date?: string;
  status?: "planning" | "in_progress" | "completed" | "cancelled";
}

export const projectApi = {
  // Get all projects
  getProjects: async (params?: {
    my_projects?: boolean;
    status?: string;
    search?: string;
    page?: number;
  }) => {
    const response = await api.get("/projects", { params });
    return response.data;
  },

  // Get project by ID
  getProject: async (id: string | number) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Create project
  createProject: async (data: CreateProjectData) => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  // Update project
  updateProject: async (id: string | number, data: Partial<CreateProjectData>) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  // Delete project
  deleteProject: async (id: string | number) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  // Get customers list
  getCustomers: async (params?: { search?: string }) => {
    const response = await api.get("/projects/customers", { params });
    return response.data;
  },

  // Get project managers list
  getProjectManagers: async (params?: { search?: string }) => {
    const response = await api.get("/projects/project-managers", { params });
    return response.data;
  },
};
