import api from "./api";

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface UserPermissions {
  user: {
    id: number;
    name: string;
    email: string;
  };
  direct_permission_ids: number[];
  role_permission_ids: number[];
  all_permission_ids: number[];
}

export const userPermissionApi = {
  // Lấy permissions của một user
  getUserPermissions: async (userId: string | number) => {
    const response = await api.get(`/hr/users/${userId}/permissions`);
    return response.data;
  },

  // Sync permissions trực tiếp cho user
  syncUserPermissions: async (
    userId: string | number,
    permissionIds: number[]
  ) => {
    const response = await api.post(`/hr/users/${userId}/permissions`, {
      permission_ids: permissionIds,
    });
    return response.data;
  },

  // Lấy tất cả permissions (có thể dùng chung với personnelRoleApi)
  getAllPermissions: async () => {
    const response = await api.get("/hr/permissions/all");
    return response.data;
  },
};
