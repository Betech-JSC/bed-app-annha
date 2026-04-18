import api from "./api";

export interface EquipmentCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface EquipmentRental {
  id: number;
  uuid: string;
  project_id: number;
  equipment_name: string;
  equipment_category_id?: number;
  category?: EquipmentCategory;
  supplier_id?: number;
  supplier?: { id: number; name: string };
  rental_start_date: string;
  rental_end_date: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  status: "draft" | "pending_management" | "pending_accountant" | "completed" | "in_use" | "pending_return" | "returned" | "rejected";
  rejection_reason?: string;
  notes?: string;
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

export const equipmentRentalApi = {
  // CRUD
  list: async (projectId: string | number, params?: { status?: string; page?: number }) => {
    const response = await api.get(`/projects/${projectId}/equipment-rentals`, { params });
    return response.data;
  },
  show: async (projectId: string | number, id: number) => {
    const response = await api.get(`/projects/${projectId}/equipment-rentals/${id}`);
    return response.data;
  },
  create: async (projectId: string | number, data: {
    equipment_name: string;
    equipment_category_id?: number;
    supplier_id?: number;
    rental_start_date: string;
    rental_end_date: string;
    quantity: number;
    unit_price: number;
    total_cost?: number;
    notes?: string;
    attachment_ids?: number[];
  }) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals`, data);
    return response.data;
  },
  update: async (projectId: string | number, id: number, data: any) => {
    const response = await api.put(`/projects/${projectId}/equipment-rentals/${id}`, data);
    return response.data;
  },
  destroy: async (projectId: string | number, id: number) => {
    const response = await api.delete(`/projects/${projectId}/equipment-rentals/${id}`);
    return response.data;
  },
  // Workflow
  submit: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals/${id}/submit`);
    return response.data;
  },
  approveManagement: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals/${id}/approve-management`);
    return response.data;
  },
  rejectManagement: async (projectId: string | number, id: number, reason: string) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals/${id}/reject-management`, { reason });
    return response.data;
  },
  confirmAccountant: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals/${id}/confirm-accountant`);
    return response.data;
  },
  // Return lifecycle
  requestReturn: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals/${id}/request-return`);
    return response.data;
  },
  confirmReturn: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals/${id}/confirm-return`);
    return response.data;
  },

  // Hoàn duyệt phiếu thuê thiết bị về trạng thái nháp
  revertToDraft: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/equipment-rentals/${id}/revert`);
    return response.data;
  },
};
