import api from './api';

// ==========================================
// Material Quota & Inventory API (Sprint 2 — Module 4)
// ==========================================

export interface MaterialQuotaItem {
  id: number;
  uuid: string;
  project_id: number;
  task_id: number | null;
  material_id: number;
  planned_quantity: number;
  actual_quantity: number;
  unit: string | null;
  variance_percentage: number;
  notes: string | null;
  is_exceeded: boolean;
  usage_percentage: number;
  material?: { id: number; name: string; code: string; unit: string; unit_price: number };
  task?: { id: number; name: string };
}

export interface MaterialInventoryItem {
  id: number;
  project_id: number;
  material_id: number;
  current_stock: number;
  min_stock_level: number;
  is_low_stock: boolean;
  stock_status: 'adequate' | 'low_stock' | 'out_of_stock';
  material?: { id: number; name: string; code: string; unit: string };
}

export interface MaterialWarning {
  type: 'quota_exceeded' | 'quota_warning' | 'low_stock';
  severity: 'critical' | 'high' | 'medium' | 'low';
  material: string;
  task?: string | null;
  message: string;
  planned?: number;
  actual?: number;
  usage_pct?: number;
  current?: number;
  min_level?: number;
}

export const materialQuotaApi = {
  // ===== Inventory =====
  getInventory: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/materials/inventory`);
    return response.data;
  },

  // ===== Quotas =====
  getQuotas: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/materials/quotas`);
    return response.data;
  },

  createQuota: async (projectId: string | number, data: {
    material_id: number;
    task_id?: number;
    planned_quantity: number;
    unit?: string;
    notes?: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/materials/quotas`, data);
    return response.data;
  },

  updateQuota: async (projectId: string | number, quotaId: number, data: {
    planned_quantity?: number;
    unit?: string;
    notes?: string;
  }) => {
    const response = await api.put(`/projects/${projectId}/materials/quotas/${quotaId}`, data);
    return response.data;
  },

  // ===== Warnings =====
  getWarnings: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/materials/warnings`);
    return response.data;
  },

  // ===== Import/Export =====
  importMaterial: async (projectId: string | number, data: {
    material_id: number;
    quantity: number;
    unit_price?: number;
    supplier_id?: number;
    reference_number?: string;
    transaction_date?: string;
    warehouse_location?: string;
    batch_number?: string;
    notes?: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/materials/import`, data);
    return response.data;
  },

  exportMaterial: async (projectId: string | number, data: {
    material_id: number;
    quantity: number;
    unit_price?: number;
    reference_number?: string;
    transaction_date?: string;
    warehouse_location?: string;
    batch_number?: string;
    notes?: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/materials/export`, data);
    return response.data;
  },

  // ===== History =====
  getHistory: async (projectId: string | number, materialId?: number) => {
    const params: Record<string, any> = {};
    if (materialId) params.material_id = materialId;
    const response = await api.get(`/projects/${projectId}/materials/history`, { params });
    return response.data;
  },

  // ===== Sync =====
  syncInventory: async (projectId: string | number) => {
    const response = await api.post(`/projects/${projectId}/materials/sync-inventory`);
    return response.data;
  },
};
