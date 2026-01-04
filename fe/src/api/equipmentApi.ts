import api from "./api";

export interface Equipment {
  id: number;
  uuid: string;
  name: string;
  code?: string;
  quantity: number;
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
  allocation_type: "rent" | "buy";
  quantity: number;
  start_date: string;
  end_date?: string;
  notes?: string;
  status: "active" | "completed" | "cancelled";
  // Cho MUA (buy):
  manager_id?: number;
  manager?: any;
  handover_date?: string;
  return_date?: string;
  // Cho THUÊ (rent):
  daily_rate?: number;
  rental_fee?: number;
  billing_start_date?: string;
  billing_end_date?: string;
  cost_id?: number;
  cost?: any;
  allocated_to?: number;
  allocatedTo?: any;
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
  quantity?: number;
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
    const response = await api.get("/admin/equipment", { params });
    return response.data;
  },

  getEquipmentItem: async (id: number) => {
    const response = await api.get(`/admin/equipment/${id}`);
    return response.data;
  },

  getAllocations: async (id: number, params?: {
    status?: string;
    page?: number;
  }) => {
    const response = await api.get(`/admin/equipment/${id}/allocations`, { params });
    return response.data;
  },

  getMaintenance: async (id: number, params?: {
    status?: string;
    page?: number;
  }) => {
    const response = await api.get(`/admin/equipment/${id}/maintenance`, { params });
    return response.data;
  },

  createEquipment: async (data: CreateEquipmentData) => {
    const response = await api.post("/admin/equipment", data);
    return response.data;
  },

  updateEquipment: async (id: number, data: Partial<CreateEquipmentData>) => {
    const response = await api.put(`/admin/equipment/${id}`, data);
    return response.data;
  },

  deleteEquipment: async (id: number) => {
    const response = await api.delete(`/admin/equipment/${id}`);
    return response.data;
  },

  getEquipmentByProject: async (projectId: string | number, params?: {
    search?: string;
    category?: string;
    type?: string;
    status?: string;
    page?: number;
  }) => {
    const response = await api.get(`/projects/${projectId}/equipment`, { params });
    return response.data;
  },

  createAllocation: async (projectId: string | number, data: {
    equipment_id: number;
    allocation_type: "rent" | "buy";
    quantity: number;
    start_date: string;
    end_date?: string;
    allocated_to?: number;
    notes?: string;
    // Cho MUA (buy):
    manager_id?: number;
    handover_date?: string;
    return_date?: string;
    // Cho THUÊ (rent):
    daily_rate?: number;
    rental_fee?: number;
    billing_start_date?: string;
    billing_end_date?: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/equipment/allocations`, data);
    return response.data;
  },
};

