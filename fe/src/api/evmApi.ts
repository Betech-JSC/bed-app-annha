import api from "./api";

export interface ProjectEvmMetric {
  id: number;
  project_id: number;
  calculation_date: string;
  planned_value: number;
  earned_value: number;
  actual_cost: number;
  cost_performance_index?: number;
  schedule_performance_index?: number;
  cost_variance?: number;
  schedule_variance?: number;
  estimate_at_completion?: number;
  estimate_to_complete?: number;
  variance_at_completion?: number;
  budget_at_completion?: number;
  progress_percentage: number;
  notes?: string;
  calculated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface EvmAnalysis {
  status: "on_track" | "at_risk" | "off_track";
  cost_status: "on_budget" | "slightly_over" | "over_budget" | "under_budget";
  schedule_status: "on_schedule" | "slightly_delayed" | "delayed" | "ahead";
  warnings: string[];
  recommendations: string[];
  metric: ProjectEvmMetric;
  cpi?: number;
  spi?: number;
  cv?: number;
  sv?: number;
  eac?: number;
  etc?: number;
  vac?: number;
}

export const evmApi = {
  // Calculate EVM metrics
  calculateEvm: async (projectId: string | number, asOfDate?: string) => {
    const response = await api.post(`/projects/${projectId}/evm/calculate`, null, {
      params: asOfDate ? { as_of_date: asOfDate } : {},
    });
    return response.data;
  },

  // Get latest EVM metrics
  getLatestMetrics: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/evm/latest`);
    return response.data;
  },

  // Get EVM history
  getHistory: async (projectId: string | number, startDate?: string, endDate?: string) => {
    const response = await api.get(`/projects/${projectId}/evm/history`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  },

  // Analyze performance
  analyzePerformance: async (projectId: string | number): Promise<{ success: boolean; data: EvmAnalysis }> => {
    const response = await api.get(`/projects/${projectId}/evm/analyze`);
    return response.data;
  },
};


