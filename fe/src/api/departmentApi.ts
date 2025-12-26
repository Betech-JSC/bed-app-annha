import api from "./api";

export interface Department {
  id: number;
  uuid: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  manager_id?: number;
  employee_count: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  parent?: Department;
  manager?: any;
  employees?: any[];
  children?: Department[];
}

export interface CreateDepartmentData {
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  manager_id?: number;
  status?: "active" | "inactive";
}

export const departmentApi = {
  getDepartments: async (params?: {
    active_only?: boolean;
    search?: string;
    parent_id?: number;
    page?: number;
  }) => {
    const response = await api.get("/departments", { params });
    return response.data;
  },

  getDepartment: async (id: number) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  createDepartment: async (data: CreateDepartmentData) => {
    const response = await api.post("/departments", data);
    return response.data;
  },

  updateDepartment: async (id: number, data: Partial<CreateDepartmentData>) => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },

  deleteDepartment: async (id: number) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};

