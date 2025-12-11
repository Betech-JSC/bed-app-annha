import api from "./api";

export interface PersonnelRole {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  users_count?: number;
}

export interface CreateRoleData {
  name: string;
  description?: string;
}

export interface RolePermissions {
  role: string;
  permissions: string[];
}

export const personnelRoleApi = {
  // Lấy danh sách tất cả roles
  getRoles: async () => {
    const response = await api.get("/hr/personnel-roles");
    return response.data;
  },

  // Lấy roles với số lượng sử dụng
  getRolesWithUsage: async () => {
    const response = await api.get("/hr/personnel-roles/with-usage");
    return response.data;
  },

  // Lấy thông tin chi tiết một role
  getRole: async (id: string | number) => {
    const response = await api.get(`/hr/personnel-roles/${id}`);
    return response.data;
  },

  // Tạo role mới
  createRole: async (data: CreateRoleData) => {
    const response = await api.post("/hr/personnel-roles", data);
    return response.data;
  },

  // Cập nhật role
  updateRole: async (id: string | number, data: Partial<CreateRoleData>) => {
    const response = await api.put(`/hr/personnel-roles/${id}`, data);
    return response.data;
  },

  // Xóa role
  deleteRole: async (id: string | number) => {
    const response = await api.delete(`/hr/personnel-roles/${id}`);
    return response.data;
  },

  // Lấy permissions mặc định cho một role
  getDefaultPermissions: async (roleName: string) => {
    const response = await api.get(
      `/hr/personnel-roles/permissions/${encodeURIComponent(roleName)}`
    );
    return response.data;
  },

  // Lấy tất cả permissions trong hệ thống
  getAllPermissions: async () => {
    const response = await api.get("/hr/permissions/all");
    return response.data;
  },

  // Lấy permissions của một role
  getRolePermissions: async (id: string | number) => {
    const response = await api.get(`/hr/personnel-roles/${id}/permissions`);
    return response.data;
  },

  // Sync permissions cho một role
  syncRolePermissions: async (
    id: string | number,
    permissionIds: number[]
  ) => {
    const response = await api.post(`/hr/personnel-roles/${id}/permissions`, {
      permission_ids: permissionIds,
    });
    return response.data;
  },
};
