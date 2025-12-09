import api from "./api";

export interface TimeTracking {
  id: number;
  user_id: number;
  project_id?: number;
  check_in_at: string;
  check_out_at?: string;
  check_in_location?: string;
  check_out_location?: string;
  total_hours?: number;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  user?: any;
  project?: any;
  approver?: any;
}

export interface CheckInData {
  project_id?: number;
  check_in_location?: string;
  notes?: string;
}

export interface CheckOutData {
  check_out_location?: string;
  notes?: string;
}

export const timeTrackingApi = {
  // Get all time tracking (HR only)
  getTimeTracking: async (params?: {
    user_id?: number;
    project_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  }) => {
    const response = await api.get("/hr/time-tracking", { params });
    return response.data;
  },

  // Check-in
  checkIn: async (data: CheckInData) => {
    const response = await api.post("/time-tracking/check-in", data);
    return response.data;
  },

  // Check-out
  checkOut: async (id: number, data: CheckOutData) => {
    const response = await api.put(`/time-tracking/check-out/${id}`, data);
    return response.data;
  },

  // Get my time tracking
  getMyTimeTracking: async (params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
  }) => {
    const response = await api.get("/my-time-tracking", { params });
    return response.data;
  },

  // Approve time tracking (HR only)
  approve: async (id: number) => {
    const response = await api.post(`/hr/time-tracking/${id}/approve`);
    return response.data;
  },

  // Reject time tracking (HR only)
  reject: async (id: number) => {
    const response = await api.post(`/hr/time-tracking/${id}/reject`);
    return response.data;
  },
};
