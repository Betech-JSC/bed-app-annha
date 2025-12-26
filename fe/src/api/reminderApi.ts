import api from "./api";

export interface Reminder {
  id: number;
  uuid: string;
  remindable_type: string;
  remindable_id: number;
  title: string;
  description?: string;
  reminder_type: "payment_due" | "deadline" | "maintenance" | "contract_expiry" | "leave_balance" | "custom";
  reminder_date: string;
  due_date?: string;
  status: "pending" | "sent" | "completed" | "cancelled";
  user_id?: number;
  is_recurring: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly";
  recurrence_interval: number;
  next_reminder_date?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  user?: any;
  creator?: any;
  remindable?: any;
}

export interface CreateReminderData {
  remindable_type: string;
  remindable_id: number;
  title: string;
  description?: string;
  reminder_type: "payment_due" | "deadline" | "maintenance" | "contract_expiry" | "leave_balance" | "custom";
  reminder_date: string;
  due_date?: string;
  user_id?: number;
  is_recurring?: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly";
  recurrence_interval?: number;
}

export const reminderApi = {
  getReminders: async (params?: {
    user_id?: number;
    status?: string;
    reminder_type?: string;
    upcoming?: boolean;
    page?: number;
  }) => {
    const response = await api.get("/reminders", { params });
    return response.data;
  },

  getReminder: async (id: number) => {
    const response = await api.get(`/reminders/${id}`);
    return response.data;
  },

  createReminder: async (data: CreateReminderData) => {
    const response = await api.post("/reminders", data);
    return response.data;
  },

  updateReminder: async (id: number, data: Partial<CreateReminderData>) => {
    const response = await api.put(`/reminders/${id}`, data);
    return response.data;
  },

  deleteReminder: async (id: number) => {
    const response = await api.delete(`/reminders/${id}`);
    return response.data;
  },

  sendPendingReminders: async () => {
    const response = await api.post("/reminders/send-pending");
    return response.data;
  },

  markAsSent: async (id: number) => {
    const response = await api.post(`/reminders/${id}/mark-sent`);
    return response.data;
  },
};

