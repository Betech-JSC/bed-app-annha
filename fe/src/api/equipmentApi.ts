import api from "./api";

export interface Equipment {
  id: number;
  uuid: string;
  name: string;
  code?: string;
  category?: string;
  type: "owned" | "rented";
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  rental_rate_per_day?: number;
  maintenance_interval_days: number;
  status: "available" | "in_use" | "maintenance" | "retired";
  created_at: string;
  updated_at: string;
  allocations?: EquipmentAllocation[];
  maintenances?: EquipmentMaintenance[];
}

export interface EquipmentAllocation {
  id: number;
  uuid: string;
  equipment_id: number;
  project_id: number;
  start_date: string;
  end_date?: string;
  notes?: string;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  equipment?: Equipment;
  project?: any;
}

export interface EquipmentMaintenance {
  id: number;
  uuid: string;
  equipment_id: number;
  maintenance_date: string;
  description?: string;
  cost?: number;
  performed_by?: string;
  next_due_date?: string;
  created_at: string;
  updated_at: string;
  equipment?: Equipment;
}

export interface CreateEquipmentData {
  name: string;
  code?: string;
  category?: string;
  type: "owned" | "rented";
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  rental_rate_per_day?: number;
  maintenance_interval_days?: number;
  status?: "available" | "in_use" | "maintenance" | "retired";
}

export const equipmentApi = {
  getEquipment: async (params?: {
    active_only?: boolean;
    search?: string;
    category?: string;
    type?: string;
    status?: string;
    page?: number;
  }) => {
    const response = await api.get("/equipment", { params });
    return response.data;
  },

  getEquipmentItem: async (id: number) => {
    const response = await api.get(`/equipment/${id}`);
    return response.data;
  },

  getAllocations: async (id: number, params?: {
    status?: string;
    page?: number;
  }) => {
    const response = await api.get(`/equipment/${id}/allocations`, { params });
    return response.data;
  },

  getMaintenance: async (id: number, params?: {
    status?: string;
    page?: number;
  }) => {
    const response = await api.get(`/equipment/${id}/maintenance`, { params });
    return response.data;
  },

  createEquipment: async (data: CreateEquipmentData) => {
    const response = await api.post("/equipment", data);
    return response.data;
  },

  updateEquipment: async (id: number, data: Partial<CreateEquipmentData>) => {
    const response = await api.put(`/equipment/${id}`, data);
    return response.data;
  },

  deleteEquipment: async (id: number) => {
    const response = await api.delete(`/equipment/${id}`);
    return response.data;
  },
};

