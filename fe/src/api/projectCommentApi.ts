import api from "./api";

export interface ProjectComment {
  id: number;
  uuid: string;
  project_id: number;
  user_id: number;
  content: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  replies?: ProjectComment[];
}

export interface CreateProjectCommentData {
  content: string;
  parent_id?: number;
}

export const projectCommentApi = {
  // Lấy danh sách comments
  getComments: async (projectId: string | number, params?: {
    page?: number;
    per_page?: number;
  }) => {
    const response = await api.get(`/projects/${projectId}/comments`, { params });
    return response.data;
  },

  // Lấy comment mới nhất
  getLatestComment: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/comments/latest`);
    return response.data;
  },

  // Tạo comment mới
  createComment: async (projectId: string | number, data: CreateProjectCommentData) => {
    const response = await api.post(`/projects/${projectId}/comments`, data);
    return response.data;
  },

  // Cập nhật comment
  updateComment: async (projectId: string | number, commentId: number, data: { content: string }) => {
    const response = await api.put(`/projects/${projectId}/comments/${commentId}`, data);
    return response.data;
  },

  // Xóa comment
  deleteComment: async (projectId: string | number, commentId: number) => {
    const response = await api.delete(`/projects/${projectId}/comments/${commentId}`);
    return response.data;
  },
};




