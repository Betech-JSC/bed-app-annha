import api from "./api";

export interface GlobalSubcontractor {
  id: number;
  name: string;
  category?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  tax_code?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGlobalSubcontractorData {
  name: string;
  category?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  tax_code?: string;
}

export const globalSubcontractorApi = {
  // Get all global subcontractors
  getGlobalSubcontractors: async (params?: { search?: string; category?: string; active_only?: boolean }) => {
    const response = await api.get("/settings/subcontractors", { params });
    return response.data;
  },

  // Get single global subcontractor
  getGlobalSubcontractor: async (id: string | number) => {
    const response = await api.get(`/settings/subcontractors/${id}`);
    return response.data;
  },

  // Create global subcontractor
  createGlobalSubcontractor: async (data: CreateGlobalSubcontractorData) => {
    const response = await api.post("/settings/subcontractors", data);
    return response.data;
  },

  // Update global subcontractor
  updateGlobalSubcontractor: async (id: string | number, data: Partial<CreateGlobalSubcontractorData>) => {
    const response = await api.put(`/settings/subcontractors/${id}`, data);
    return response.data;
  },

  // Delete global subcontractor
  deleteGlobalSubcontractor: async (id: string | number) => {
    const response = await api.delete(`/settings/subcontractors/${id}`);
    return response.data;
  },
};

