import api from './api';

// ==========================================
// Material Quota API (Cost tracking & quantity statistics)
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

export interface MaterialWarning {
  type: 'quota_exceeded' | 'quota_warning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  material: string;
  task?: string | null;
  message: string;
  planned?: number;
  actual?: number;
  usage_pct?: number;
}

export const materialQuotaApi = {
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

  // ===== Warnings (quota-based only, no stock) =====
  getWarnings: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/materials/warnings`);
    return response.data;
  },

  // ===== Usage History =====
  getHistory: async (projectId: string | number, materialId?: number) => {
    const params: Record<string, any> = {};
    if (materialId) params.material_id = materialId;
    const response = await api.get(`/projects/${projectId}/materials/history`, { params });
    return response.data;
  },
};
