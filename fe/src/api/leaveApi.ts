import api from "./api";

export interface LeaveRequest {
  id: number;
  uuid: string;
  user_id: number;
  project_id?: number;
  leave_type: "annual" | "sick" | "unpaid" | "maternity" | "paternity" | "other";
  start_date: string;
  end_date: string;
  days: number;
  reason?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  user?: any;
  project?: any;
  approver?: any;
  creator?: any;
}

export interface LeaveBalance {
  id: number;
  uuid: string;
  user_id: number;
  year: number;
  leave_type: "annual" | "sick" | "unpaid" | "maternity" | "paternity" | "other";
  total_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveRequestData {
  project_id?: number;
  leave_type: "annual" | "sick" | "unpaid" | "maternity" | "paternity" | "other";
  start_date: string;
  end_date: string;
  reason?: string;
}

export const leaveApi = {
  getRequests: async (params?: {
    user_id?: number;
    status?: string;
    leave_type?: string;
    page?: number;
  }) => {
    const response = await api.get("/leave/requests", { params });
    return response.data;
  },

  createRequest: async (data: CreateLeaveRequestData) => {
    const response = await api.post("/leave/requests", data);
    return response.data;
  },

  approveRequest: async (id: number) => {
    const response = await api.post(`/leave/requests/${id}/approve`);
    return response.data;
  },

  rejectRequest: async (id: number, rejectionReason: string) => {
    const response = await api.post(`/leave/requests/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  getBalance: async (params?: {
    user_id?: number;
    year?: number;
  }) => {
    const response = await api.get("/leave/balance", { params });
    return response.data;
  },
};

