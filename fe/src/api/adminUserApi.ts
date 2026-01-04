import api from "./api";

export interface SystemUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  wallet_balance?: number;
  roles?: Array<{
    id: number;
    name: string;
    description?: string;
  }>;
  created_at: string;
  deleted_at?: string;
  is_banned: boolean;
}

export interface CreateSystemUserData {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  password: string;
  role_ids?: number[];
}

export interface UpdateSystemUserData {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  password?: string;
}

export const adminUserApi = {
  // Danh sách users
  getUsers: async (params?: {
    search?: string;
    role?: string;
    status?: "active" | "banned";
    page?: number;
    per_page?: number;
  }) => {
    const response = await api.get("/admin/users", { params });
    return response.data;
  },

  // Tạo user mới
  createUser: async (data: CreateSystemUserData) => {
    const response = await api.post("/admin/users", data);
    return response.data;
  },

  // Chi tiết user
  getUser: async (id: number) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  // Cập nhật user
  updateUser: async (id: number, data: UpdateSystemUserData) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  // Lấy roles của user
  getUserRoles: async (id: number) => {
    const response = await api.get(`/admin/users/${id}/roles`);
    return response.data;
  },

  // Gán roles cho user
  syncUserRoles: async (id: number, roleIds: number[]) => {
    const response = await api.post(`/admin/users/${id}/roles`, {
      role_ids: roleIds,
    });
    return response.data;
  },

  // Khóa tài khoản
  banUser: async (id: number) => {
    const response = await api.post(`/admin/users/${id}/ban`);
    return response.data;
  },

  // Mở khóa tài khoản
  unbanUser: async (id: number) => {
    const response = await api.post(`/admin/users/${id}/unban`);
    return response.data;
  },

  // Xóa vĩnh viễn
  deleteUser: async (id: number) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};

