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
    const response = await api.get("/settings/roles");
    return response.data;
  },

  // Get roles with usage count
  getRolesWithUsage: async () => {
    const response = await api.get("/settings/roles");
    return response.data;
  },

  // Get role by ID
  getRole: async (id: number) => {
    const response = await api.get(`/settings/roles/${id}`);
    return response.data;
  },

  // Create role
  createRole: async (data: CreateRoleData) => {
    const response = await api.post("/settings/roles", data);
    return response.data;
  },

  // Update role
  updateRole: async (id: number, data: Partial<CreateRoleData>) => {
    const response = await api.put(`/settings/roles/${id}`, data);
    return response.data;
  },

  // Delete role
  deleteRole: async (id: number) => {
    const response = await api.delete(`/settings/roles/${id}`);
    return response.data;
  },
};


