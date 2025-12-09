import api from "./api";

export interface Contract {
  id: number;
  uuid: string;
  project_id: number;
  contract_value: number;
  signed_date?: string;
  status: "draft" | "pending_customer_approval" | "approved" | "rejected";
  approved_by?: number;
  approved_at?: string;
  rejected_reason?: string;
  attachments?: any[];
}

export interface CreateContractData {
  contract_value: number;
  signed_date?: string;
  status?: "draft" | "pending_customer_approval" | "approved" | "rejected";
}

export const contractApi = {
  // Get contract for project
  getContract: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/contract`);
    return response.data;
  },

  // Create/update contract
  saveContract: async (projectId: string | number, data: CreateContractData) => {
    const response = await api.post(`/projects/${projectId}/contract`, data);
    return response.data;
  },

  // Update contract
  updateContract: async (projectId: string | number, data: Partial<CreateContractData>) => {
    const response = await api.put(`/projects/${projectId}/contract`, data);
    return response.data;
  },

  // Approve contract
  approveContract: async (projectId: string | number) => {
    const response = await api.post(`/projects/${projectId}/contract/approve`);
    return response.data;
  },
};
