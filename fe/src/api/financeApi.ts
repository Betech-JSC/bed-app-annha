import api from './api';

// ==========================================
// Finance API (Sprint 2 — Module 3)
// ==========================================

export const financeApi = {
  // ===== Cash Flow =====
  getCashFlow: async (projectId: string | number, from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get(`/projects/${projectId}/cash-flow`, { params });
    return response.data;
  },

  createCashFlow: async (projectId: string | number, data: {
    type: 'inflow' | 'outflow';
    category: string;
    amount: number;
    planned_date?: string;
    actual_date?: string;
    notes?: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/cash-flow`, data);
    return response.data;
  },

  // ===== Profit & Loss =====
  getProfitLoss: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/profit-loss`);
    return response.data;
  },

  // ===== Budget vs Actual =====
  getBudgetVsActual: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/budget-vs-actual`);
    return response.data;
  },

  // ===== Subcontractor Debt =====
  getSubcontractorDebt: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/subcontractor-debt`);
    return response.data;
  },

  // ===== Tax Summary =====
  getTaxSummary: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/tax-summary`);
    return response.data;
  },

  // ===== Warranty Retentions =====
  getWarrantyRetentions: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/warranty-retentions`);
    return response.data;
  },

  createWarrantyRetention: async (projectId: string | number, data: {
    subcontractor_id?: number;
    retention_amount: number;
    retention_percentage?: number;
    warranty_start_date?: string;
    warranty_end_date?: string;
    notes?: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/warranty-retentions`, data);
    return response.data;
  },

  releaseWarranty: async (projectId: string | number, retentionId: number, amount?: number) => {
    const response = await api.post(
      `/projects/${projectId}/warranty-retentions/${retentionId}/release`,
      amount ? { amount } : {}
    );
    return response.data;
  },
};
