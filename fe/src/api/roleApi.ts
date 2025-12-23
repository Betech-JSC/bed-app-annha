import api from "./api";

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: any[];
  users_count?: number;
  permissions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permission_ids?: number[];
}

export const roleApi = {
  // Get all roles
  getRoles: async () => {
    const response = await api.get("/hr/roles");
    return response.data;
  },

  // Get role by ID
  getRole: async (id: number) => {
    const response = await api.get(`/hr/roles/${id}`);
    return response.data;
  },

  // Create role
  createRole: async (data: CreateRoleData) => {
    const response = await api.post("/hr/roles", data);
    return response.data;
  },

  // Update role
  updateRole: async (id: number, data: Partial<CreateRoleData>) => {
    const response = await api.put(`/hr/roles/${id}`, data);
    return response.data;
  },

  // Delete role
  deleteRole: async (id: number) => {
    const response = await api.delete(`/hr/roles/${id}`);
    return response.data;
  },
};


