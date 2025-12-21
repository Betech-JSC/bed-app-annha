import api from "./api";

export interface EmployeeProfile {
  id: number;
  user_id: number;
  employee_code: string;
  full_name?: string;
  cccd?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  education_level?: string;
  skills?: string;
  profile_photo?: string;
  legal_documents?: number[];
  employee_type: "official" | "temporary" | "contracted" | "engineer" | "worker";
  team_name?: string;
  subcontractor_id?: number;
  user?: any;
  subcontractor?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmployeeProfileData {
  user_id: number;
  employee_code?: string;
  full_name?: string;
  cccd?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  education_level?: string;
  skills?: string;
  profile_photo?: string;
  legal_documents?: number[];
  employee_type: "official" | "temporary" | "contracted" | "engineer" | "worker";
  team_name?: string;
  subcontractor_id?: number;
}

export const employeeProfileApi = {
  // Get all employee profiles
  getProfiles: async (params?: {
    search?: string;
    employee_type?: string;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }) => {
    const response = await api.get("/hr/employee-profiles", { params });
    return response.data;
  },

  // Get profile by ID
  getProfile: async (id: number) => {
    const response = await api.get(`/hr/employee-profiles/${id}`);
    return response.data;
  },

  // Get profile by user ID
  getProfileByUserId: async (userId: number) => {
    const response = await api.get(`/hr/employee-profiles/user/${userId}`);
    return response.data;
  },

  // Create profile
  createProfile: async (data: CreateEmployeeProfileData) => {
    const response = await api.post("/hr/employee-profiles", data);
    return response.data;
  },

  // Update profile
  updateProfile: async (id: number, data: Partial<CreateEmployeeProfileData>) => {
    const response = await api.put(`/hr/employee-profiles/${id}`, data);
    return response.data;
  },

  // Delete profile
  deleteProfile: async (id: number) => {
    const response = await api.delete(`/hr/employee-profiles/${id}`);
    return response.data;
  },

  // Get statistics
  getStatistics: async () => {
    const response = await api.get("/hr/employee-profiles/statistics");
    return response.data;
  },
};

