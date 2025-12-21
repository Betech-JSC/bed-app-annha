import api from "./api";

export interface TimeTracking {
  id: number;
  user_id: number;
  project_id?: number;
  check_in_at: string;
  check_out_at?: string;
  check_in_location?: string;
  check_out_location?: string;
  check_in_method?: "card" | "qr" | "gps" | "faceid" | "manual";
  shift?: string;
  work_date?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  qr_code?: string;
  face_id_photo?: string;
  total_hours?: number;
  is_overtime?: boolean;
  overtime_type?: "weekday" | "weekend" | "holiday";
  overtime_hours?: number;
  overtime_multiplier?: number;
  overtime_category_id?: number;
  team_check_in_id?: number;
  is_offline?: boolean;
  synced_at?: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  user?: any;
  project?: any;
  approver?: any;
  overtime_category?: any;
  team_check_in?: any;
}

export interface CheckInData {
  project_id?: number;
  check_in_location?: string;
  check_in_method?: "card" | "qr" | "gps" | "faceid" | "manual";
  shift?: string;
  work_date?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  qr_code?: string;
  face_id_photo?: string;
  is_overtime?: boolean;
  overtime_type?: "weekday" | "weekend" | "holiday";
  overtime_category_id?: number;
  notes?: string;
}

export interface CheckOutData {
  check_out_location?: string;
  check_out_latitude?: number;
  check_out_longitude?: number;
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

  // Check-in by QR code
  checkInByQR: async (data: { qr_code: string; project_id?: number }) => {
    const response = await api.post("/hr/time-tracking/check-in/qr", data);
    return response.data;
  },

  // Check-in by GPS
  checkInByGPS: async (data: {
    latitude: number;
    longitude: number;
    project_id?: number;
  }) => {
    const response = await api.post("/hr/time-tracking/check-in/gps", data);
    return response.data;
  },

  // Check-in by FaceID
  checkInByFaceID: async (data: {
    face_id_photo: string;
    project_id?: number;
  }) => {
    const response = await api.post("/hr/time-tracking/check-in/faceid", data);
    return response.data;
  },
};
