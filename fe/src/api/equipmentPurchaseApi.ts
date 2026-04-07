import api from "./api";

export interface EquipmentPurchaseItem {
  id?: number;
  name: string;
  code?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

export interface EquipmentPurchase {
  id: number;
  uuid: string;
  project_id: number;
  total_amount: number;
  status: "draft" | "pending_management" | "pending_accountant" | "completed" | "rejected";
  rejection_reason?: string;
  notes?: string;
  items: EquipmentPurchaseItem[];
  created_by: number;
  creator?: { id: number; name: string };
  approved_by?: number;
  approver?: { id: number; name: string };
  approved_at?: string;
  confirmed_by?: number;
  confirmer?: { id: number; name: string };
  confirmed_at?: string;
  attachments?: any[];
  created_at: string;
  updated_at: string;
}

export const equipmentPurchaseApi = {
  list: async (projectId: string | number, params?: { status?: string; page?: number }) => {
    const response = await api.get(`/projects/${projectId}/equipment-purchases`, { params });
    return response.data;
  },
  show: async (projectId: string | number, id: number) => {
    const response = await api.get(`/projects/${projectId}/equipment-purchases/${id}`);
    return response.data;
  },
  create: async (projectId: string | number, data: {
    notes?: string;
    items: { name: string; code?: string; quantity: number; unit_price: number }[];
    attachment_ids?: number[];
  }) => {
    const response = await api.post(`/projects/${projectId}/equipment-purchases`, data);
    return response.data;
  },
  update: async (projectId: string | number, id: number, data: any) => {
    const response = await api.put(`/projects/${projectId}/equipment-purchases/${id}`, data);
    return response.data;
  },
  destroy: async (projectId: string | number, id: number) => {
    const response = await api.delete(`/projects/${projectId}/equipment-purchases/${id}`);
    return response.data;
  },
  // Workflow
  submit: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-purchases/${id}/submit`);
    return response.data;
  },
  approveManagement: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-purchases/${id}/approve-management`);
    return response.data;
  },
  rejectManagement: async (projectId: string | number, id: number, reason: string) => {
    const response = await api.post(`/projects/${projectId}/equipment-purchases/${id}/reject-management`, { reason });
    return response.data;
  },
  confirmAccountant: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-purchases/${id}/confirm-accountant`);
    return response.data;
  },
};
