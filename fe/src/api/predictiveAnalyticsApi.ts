import api from "./api";

export interface CompletionPrediction {
  predicted_date: string;
  confidence: number;
  delay_days: number;
  method: string;
  current_progress?: number;
  elapsed_days?: number;
  actual_rate?: number;
  planned_end_date?: string;
}

export interface CostPrediction {
  predicted_cost?: number;
  overrun_amount?: number;
  overrun_percentage?: number;
  confidence: number;
  method: string;
  current_cost?: number;
  budget?: number;
  cpi?: number;
  progress?: number;
}

export interface DelayRiskAnalysis {
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number;
  delay_days: number;
  predicted_date: string;
  delayed_tasks_count: number;
  recommendations: string[];
}

export interface CostRiskAnalysis {
  risk_level: "low" | "medium" | "high" | "critical" | "unknown";
  risk_score: number;
  overrun_percentage: number;
  overrun_amount?: number;
  predicted_cost?: number;
  recommendations: string[];
}

export interface PredictiveAnalysis {
  overall_risk_level: "low" | "medium" | "high" | "critical";
  overall_risk_score: number;
  completion_prediction: CompletionPrediction;
  cost_prediction: CostPrediction;
  delay_risk: DelayRiskAnalysis;
  cost_risk: CostRiskAnalysis;
  alerts: Array<{
    type: "delay" | "cost";
    severity: string;
    message: string;
  }>;
}

export const predictiveAnalyticsApi = {
  // Predict completion date
  predictCompletion: async (projectId: string | number): Promise<{ success: boolean; data: CompletionPrediction }> => {
    const response = await api.get(`/projects/${projectId}/predictions/completion`);
    return response.data;
  },

  // Predict final cost
  predictCost: async (projectId: string | number): Promise<{ success: boolean; data: CostPrediction }> => {
    const response = await api.get(`/projects/${projectId}/predictions/cost`);
    return response.data;
  },

  // Analyze delay risk
  analyzeDelayRisk: async (projectId: string | number): Promise<{ success: boolean; data: DelayRiskAnalysis }> => {
    const response = await api.get(`/projects/${projectId}/predictions/delay-risk`);
    return response.data;
  },

  // Analyze cost risk
  analyzeCostRisk: async (projectId: string | number): Promise<{ success: boolean; data: CostRiskAnalysis }> => {
    const response = await api.get(`/projects/${projectId}/predictions/cost-risk`);
    return response.data;
  },

  // Full predictive analysis
  getFullAnalysis: async (projectId: string | number): Promise<{ success: boolean; data: PredictiveAnalysis }> => {
    const response = await api.get(`/projects/${projectId}/predictions/full`);
    return response.data;
  },
};

