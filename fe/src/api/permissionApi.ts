import api from "./api";

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
};
