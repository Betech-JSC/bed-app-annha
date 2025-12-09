import api from "./api";

export interface WorkSchedule {
  id: number;
  user_id: number;
  project_id?: number;
  date: string;
  start_time: string;
  end_time: string;
  type: "work" | "leave" | "holiday" | "overtime";
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: any;
  project?: any;
}

export interface CreateWorkScheduleData {
  user_id: number;
  project_id?: number;
  date: string;
  start_time: string;
  end_time: string;
  type: "work" | "leave" | "holiday" | "overtime";
  notes?: string;
}

export const workScheduleApi = {
  // Get all work schedules
  getWorkSchedule: async (params?: {
    user_id?: number;
    project_id?: number;
    start_date?: string;
    end_date?: string;
    type?: string;
    page?: number;
  }) => {
    const response = await api.get("/hr/work-schedule", { params });
    return response.data;
  },

  // Get calendar view
  getCalendar: async (params?: {
    user_id?: number;
    project_id?: number;
    month?: number;
    year?: number;
    week_start?: string;
  }) => {
    const response = await api.get("/hr/work-schedule/calendar", { params });
    return response.data;
  },

  // Create work schedule
  createSchedule: async (data: CreateWorkScheduleData) => {
    const response = await api.post("/hr/work-schedule", data);
    return response.data;
  },

  // Update work schedule
  updateSchedule: async (id: number, data: Partial<CreateWorkScheduleData>) => {
    const response = await api.put(`/hr/work-schedule/${id}`, data);
    return response.data;
  },

  // Delete work schedule
  deleteSchedule: async (id: number) => {
    const response = await api.delete(`/hr/work-schedule/${id}`);
    return response.data;
  },
};
