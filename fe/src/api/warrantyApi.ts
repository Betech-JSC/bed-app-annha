import api from "./api";

export interface ProjectWarranty {
  id: number;
  uuid: string;
  project_id: number;
  handover_date: string;
  warranty_content: string;
  warranty_start_date: string;
  warranty_end_date: string;
  status: "draft" | "pending_customer" | "approved" | "rejected";
  created_by: number;
  approved_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  attachments?: any[];
  creator?: {
    id: number;
    name: string;
  };
  approver?: {
    id: number;
    name: string;
  } | null;
}

export interface ProjectMaintenance {
  id: number;
  uuid: string;
  project_id: number;
  maintenance_date: string;
  next_maintenance_date: string;
  status: "draft" | "pending_customer" | "approved" | "rejected";
  notes: string | null;
  created_by: number;
  approved_by: number | null;
  created_at: string;
  updated_at: string;
  attachments?: any[];
  creator?: {
    id: number;
    name: string;
  };
  approver?: {
    id: number;
    name: string;
  } | null;
}

export interface WarrantyData {
  warranties: ProjectWarranty[];
  maintenances: ProjectMaintenance[];
}

export const warrantyApi = {
  getWarranties: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/warranties`);
    return response.data;
  },

  createWarranty: async (projectId: string, data: any) => {
    const response = await api.post(`/projects/${projectId}/warranties`, data);
    return response.data;
  },

  updateWarranty: async (projectId: string, uuid: string, data: any) => {
    const response = await api.put(`/projects/${projectId}/warranties/${uuid}`, data);
    return response.data;
  },

  submitWarranty: async (projectId: string, uuid: string) => {
    const response = await api.post(`/projects/${projectId}/warranties/${uuid}/submit`);
    return response.data;
  },

  approveWarranty: async (projectId: string, uuid: string) => {
    const response = await api.post(`/projects/${projectId}/warranties/${uuid}/approve`);
    return response.data;
  },

  rejectWarranty: async (projectId: string, uuid: string) => {
    const response = await api.post(`/projects/${projectId}/warranties/${uuid}/reject`);
    return response.data;
  },

  createMaintenance: async (projectId: string, data: any) => {
    const response = await api.post(`/projects/${projectId}/maintenances`, data);
    return response.data;
  },

  updateMaintenance: async (projectId: string, uuid: string, data: any) => {
    const response = await api.put(`/projects/${projectId}/maintenances/${uuid}`, data);
    return response.data;
  },

  submitMaintenance: async (projectId: string, uuid: string) => {
    const response = await api.post(`/projects/${projectId}/maintenances/${uuid}/submit`);
    return response.data;
  },

  approveMaintenance: async (projectId: string, uuid: string) => {
    const response = await api.post(`/projects/${projectId}/maintenances/${uuid}/approve`);
    return response.data;
  },

  rejectMaintenance: async (projectId: string, uuid: string) => {
    const response = await api.post(`/projects/${projectId}/maintenances/${uuid}/reject`);
    return response.data;
  },

  destroyWarranty: async (projectId: string, uuid: string) => {
    const response = await api.delete(`/projects/${projectId}/warranties/${uuid}`);
    return response.data;
  },

  destroyMaintenance: async (projectId: string, uuid: string) => {
    const response = await api.delete(`/projects/${projectId}/maintenances/${uuid}`);
    return response.data;
  },
};
