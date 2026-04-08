import api from "./api";

export interface AssetUsage {
  id: number;
  uuid: string;
  project_id: number;
  equipment_id: number;
  asset?: {
    id: number;
    name: string;
    asset_code?: string;
    code?: string;
    category?: string;
    status?: string;
    current_value?: number;
  };
  quantity: number;
  receiver_id: number;
  receiver?: { id: number; name: string; email?: string };
  received_date: string;
  returned_date?: string;
  status: "draft" | "pending_management" | "pending_accountant" | "approved" | "in_use" | "pending_return" | "returned" | "rejected" | "pending_receive";
  rejection_reason?: string;
  notes?: string;
  created_by: number;
  creator?: { id: number; name: string; email?: string };
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

export interface AvailableAsset {
  id: number;
  name: string;
  asset_code: string;
  category?: string;
  status: string;
  quantity: number;
  remaining_quantity?: number;
  unit?: string;
  current_value?: number;
}

export const assetUsageApi = {
  // CRUD
  list: async (projectId: string | number, params?: { status?: string; page?: number }) => {
    const response = await api.get(`/projects/${projectId}/asset-usages`, { params });
    return response.data;
  },
  show: async (projectId: string | number, id: number) => {
    const response = await api.get(`/projects/${projectId}/asset-usages/${id}`);
    return response.data;
  },
  create: async (projectId: string | number, data: {
    equipment_id: number;
    quantity: number;
    receiver_id: number;
    received_date: string;
    notes?: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/asset-usages`, data);
    return response.data;
  },
  update: async (projectId: string | number, id: number, data: any) => {
    const response = await api.put(`/projects/${projectId}/asset-usages/${id}`, data);
    return response.data;
  },
  destroy: async (projectId: string | number, id: number) => {
    const response = await api.delete(`/projects/${projectId}/asset-usages/${id}`);
    return response.data;
  },
  // 3-level workflow
  submit: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/asset-usages/${id}/submit`);
    return response.data;
  },
  approveManagement: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/asset-usages/${id}/approve-management`);
    return response.data;
  },
  reject: async (projectId: string | number, id: number, reason: string) => {
    const response = await api.post(`/projects/${projectId}/asset-usages/${id}/reject`, { reason });
    return response.data;
  },
  confirmAccountant: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/asset-usages/${id}/confirm-accountant`);
    return response.data;
  },
  // Lifecycle (after approval)
  requestReturn: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/asset-usages/${id}/request-return`);
    return response.data;
  },
  confirmReturn: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/asset-usages/${id}/confirm-return`);
    return response.data;
  },
  // Available assets from company inventory
  getAvailableAssets: async (params?: { search?: string }) => {
    const response = await api.get("/admin/available-assets", { params });
    return response.data;
  },
};
