import api from "./api";

export interface TeamCheckIn {
  id: number;
  team_leader_id: number;
  project_id?: number;
  work_date: string;
  shift?: string;
  team_name?: string;
  notes?: string;
  is_offline: boolean;
  synced_at?: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  team_leader?: any;
  project?: any;
  time_trackings?: any[];
}

export interface CreateTeamCheckInData {
  project_id?: number;
  work_date: string;
  shift?: string;
  team_name?: string;
  user_ids: number[];
  check_in_times?: Record<number, string>;
  notes?: string;
  is_offline?: boolean;
}

export const teamCheckInApi = {
  // Get all team check-ins
  getTeamCheckIns: async (params?: {
    team_leader_id?: number;
    project_id?: number;
    work_date?: string;
    status?: string;
    page?: number;
  }) => {
    const response = await api.get("/hr/team-check-ins", { params });
    return response.data;
  },

  // Get team check-in by ID
  getTeamCheckIn: async (id: number) => {
    const response = await api.get(`/hr/team-check-ins/${id}`);
    return response.data;
  },

  // Create team check-in
  createTeamCheckIn: async (data: CreateTeamCheckInData) => {
    const response = await api.post("/hr/team-check-ins", data);
    return response.data;
  },

  // Approve team check-in
  approve: async (id: number) => {
    const response = await api.post(`/hr/team-check-ins/${id}/approve`);
    return response.data;
  },

  // Sync offline check-in
  sync: async (id: number) => {
    const response = await api.post(`/hr/team-check-ins/${id}/sync`);
    return response.data;
  },
};

