import api from "./api";

export interface EmploymentContract {
  id: number;
  uuid: string;
  user_id: number;
  contract_type: "probation" | "fixed_term" | "indefinite" | "part_time" | "internship";
  start_date: string;
  end_date?: string;
  base_salary: number;
  job_title?: string;
  job_description?: string;
  benefits?: string;
  status: "draft" | "active" | "expired" | "terminated" | "renewed";
  terminated_date?: string;
  termination_reason?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  user?: any;
  creator?: any;
}

export interface CreateEmploymentContractData {
  user_id: number;
  contract_type: "probation" | "fixed_term" | "indefinite" | "part_time" | "internship";
  start_date: string;
  end_date?: string;
  base_salary: number;
  job_title?: string;
  job_description?: string;
  benefits?: string;
}

export const employmentContractApi = {
  getContracts: async (params?: {
    user_id?: number;
    status?: string;
    contract_type?: string;
    page?: number;
  }) => {
    const response = await api.get("/admin/employment-contracts", { params });
    return response.data;
  },

  getContract: async (id: number) => {
    const response = await api.get(`/admin/employment-contracts/${id}`);
    return response.data;
  },

  createContract: async (data: CreateEmploymentContractData) => {
    const response = await api.post("/admin/employment-contracts", data);
    return response.data;
  },

  updateContract: async (id: number, data: Partial<CreateEmploymentContractData>) => {
    const response = await api.put(`/admin/employment-contracts/${id}`, data);
    return response.data;
  },

  renewContract: async (id: number, data: {
    end_date: string;
    base_salary?: number;
  }) => {
    const response = await api.post(`/admin/employment-contracts/${id}/renew`, data);
    return response.data;
  },

  terminateContract: async (id: number, data: {
    termination_reason: string;
    terminated_date: string;
  }) => {
    const response = await api.post(`/admin/employment-contracts/${id}/terminate`, data);
    return response.data;
  },

  deleteContract: async (id: number) => {
    const response = await api.delete(`/admin/employment-contracts/${id}`);
    return response.data;
  },
};

