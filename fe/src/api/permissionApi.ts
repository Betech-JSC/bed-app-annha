import api from "./api";

export interface Permission {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePermissionData {
  name: string;
  description?: string;
}

export const permissionApi = {
  // Lấy tất cả permissions của user hiện tại
  getMyPermissions: async () => {
    const response = await api.get("/permissions/my-permissions");
    return response.data;
  },

  // Kiểm tra user có permission không
  checkPermission: async (permission: string) => {
    const response = await api.get(`/permissions/check/${permission}`);
    return response.data;
  },

  // Kiểm tra permission trong một project cụ thể
  checkProjectPermission: async (
    projectId: string | number,
    permission: string
  ) => {
    const response = await api.get(
      `/permissions/project/${projectId}/check/${permission}`
    );
    return response.data;
  },

  // Lấy tất cả permissions của user trong một project
  getProjectPermissions: async (projectId: string | number) => {
    const response = await api.get(`/permissions/project/${projectId}/all`);
    return response.data;
  },

  // ===================================================================
  // PERMISSIONS MANAGEMENT (CRUD) - Require settings.manage permission
  // ===================================================================

  // Lấy danh sách tất cả permissions
  getAllPermissions: async () => {
    const response = await api.get("/settings/permissions");
    return response.data;
  },

  // Tạo permission mới
  createPermission: async (data: CreatePermissionData) => {
    const response = await api.post("/settings/permissions", data);
    return response.data;
  },

  // Cập nhật permission
  updatePermission: async (id: number, data: Partial<CreatePermissionData>) => {
    const response = await api.put(`/settings/permissions/${id}`, data);
    return response.data;
  },

  // Xóa permission
  deletePermission: async (id: number) => {
    const response = await api.delete(`/settings/permissions/${id}`);
    return response.data;
  },
};
