import api from "./api";

export interface Material {
  id: number;
  uuid: string;
  name: string;
  code?: string;
  unit: string;
  unit_price?: number;
  description?: string;
  project_id?: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialTransaction {
  id: number;
  uuid: string;
  material_id: number;
  project_id: number;
  user_id?: number;
  type: "in" | "out" | "adjustment";
  quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  material?: Material;
  project?: any;
  user?: any;
}

export interface CreateMaterialData {
  name: string;
  code?: string;
  unit: string;
  description?: string;
  unit_price: number;
  category?: string;
  status?: string;
  project_id?: number;
}

export const materialApi = {
  getMaterials: async (params?: {
    active_only?: boolean;
    search?: string;
    category?: string;
    page?: number;
  }) => {
    const response = await api.get("/admin/materials", { params });
    return response.data;
  },

  getMaterial: async (id: number) => {
    const response = await api.get(`/admin/materials/${id}`);
    return response.data;
  },

  createMaterial: async (data: CreateMaterialData) => {
    const response = await api.post("/admin/materials", data);
    return response.data;
  },

  updateMaterial: async (id: number, data: Partial<CreateMaterialData>) => {
    const response = await api.put(`/admin/materials/${id}`, data);
    return response.data;
  },

  deleteMaterial: async (id: number) => {
    const response = await api.delete(`/admin/materials/${id}`);
    return response.data;
  },

  getMaterialsByProject: async (projectId: string | number, params?: {
    search?: string;
    category?: string;
    page?: number;
  }) => {
    const response = await api.get(`/projects/${projectId}/materials`, { params });
    return response.data;
  },

  createTransaction: async (projectId: string | number, data: {
    material_id: number;
    type: "in" | "out" | "adjustment";
    quantity: number;
    transaction_date: string;
    notes?: string;
    cost_group_id?: number;
    amount?: number;
  }) => {
    const response = await api.post(`/projects/${projectId}/materials/transactions`, data);
    return response.data;
  },

  createBatchTransactions: async (projectId: string | number, data: {
    transaction_date: string;
    cost_group_id: number;
    items: {
      material_id: number;
      quantity: number;
      amount: number;
      notes?: string;
    }[];
  }) => {
    const response = await api.post(`/projects/${projectId}/materials/batch-transactions`, data);
    return response.data;
  },
};

