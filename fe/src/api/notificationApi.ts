import api from "./api";

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  category: string;
  title: string;
  body: string;
  message?: string; // Backward compatibility
  data?: Record<string, any>;
  priority: "low" | "medium" | "high" | "urgent";
  action_url?: string;
  status: "read" | "unread";
  read_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  type?: string;
  category?: string;
  status?: "read" | "unread";
  unread_only?: boolean;
  priority?: "low" | "medium" | "high" | "urgent";
  search?: string;
  page?: number;
  per_page?: number;
}

export interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
}

export const notificationApi = {
  // Get all notifications with filters and pagination
  getAll: async (params?: NotificationFilters) => {
    const response = await api.get("/notifications", { params });
    return response.data;
  },

  // Get notification by ID
  getById: async (id: number) => {
    const response = await api.get(`/notifications/${id}`);
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.post("/notifications/mark-all-read");
    return response.data;
  },

  // Delete notification
  delete: async (id: number) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  // Get notification settings
  getSettings: async () => {
    const response = await api.get("/notifications/settings");
    return response.data;
  },

  // Update notification settings
  updateSettings: async (settings: Partial<NotificationSettings>) => {
    const response = await api.put("/notifications/settings", settings);
    return response.data;
  },
};
