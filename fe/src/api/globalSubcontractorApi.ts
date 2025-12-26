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
  getGlobalSubcontractors: async (params?: { search?: string; category?: string }) => {
    const response = await api.get("/hr/global-subcontractors", { params });
    return response.data;
  },

  // Get single global subcontractor
  getGlobalSubcontractor: async (id: string | number) => {
    const response = await api.get(`/hr/global-subcontractors/${id}`);
    return response.data;
  },

  // Create global subcontractor
  createGlobalSubcontractor: async (data: CreateGlobalSubcontractorData) => {
    const response = await api.post("/hr/global-subcontractors", data);
    return response.data;
  },

  // Update global subcontractor
  updateGlobalSubcontractor: async (id: string | number, data: Partial<CreateGlobalSubcontractorData>) => {
    const response = await api.put(`/hr/global-subcontractors/${id}`, data);
    return response.data;
  },

  // Delete global subcontractor
  deleteGlobalSubcontractor: async (id: string | number) => {
    const response = await api.delete(`/hr/global-subcontractors/${id}`);
    return response.data;
  },
};

