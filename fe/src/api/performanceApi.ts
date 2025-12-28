import api from "./api";

export interface PerformanceKPI {
  id: number;
  uuid: string;
  evaluation_id: number;
  kpi_name: string;
  description?: string;
  target_value?: number;
  actual_value?: number;
  weight?: number;
  score?: number;
  notes?: string;
  order: number;
}

export interface PerformanceEvaluation {
  id: number;
  uuid: string;
  user_id: number;
  project_id?: number;
  evaluator_id: number;
  evaluation_period: string;
  evaluation_type: "monthly" | "quarterly" | "annual" | "project_based";
  evaluation_date: string;
  overall_score?: number;
  strengths?: string;
  weaknesses?: string;
  improvements?: string;
  goals?: string;
  comments?: string;
  status: "draft" | "submitted" | "reviewed" | "approved";
  created_by: number;
  created_at: string;
  updated_at: string;
  user?: any;
  project?: any;
  evaluator?: any;
  kpis?: PerformanceKPI[];
  creator?: any;
}

export interface CreateEvaluationData {
  user_id: number;
  project_id?: number;
  evaluation_period: string;
  evaluation_type: "monthly" | "quarterly" | "annual" | "project_based";
  evaluation_date: string;
  overall_score?: number;
  strengths?: string;
  weaknesses?: string;
  improvements?: string;
  goals?: string;
  comments?: string;
  kpis?: Array<{
    kpi_name: string;
    description?: string;
    target_value?: number;
    actual_value?: number;
    weight?: number;
    score?: number;
    notes?: string;
  }>;
}

export const performanceApi = {
  getEvaluations: async (params?: {
    user_id?: number;
    status?: string;
    evaluation_type?: string;
    project_id?: number;
    page?: number;
  }) => {
    const response = await api.get("/admin/performance/evaluations", { params });
    return response.data;
  },

  getEvaluation: async (id: number) => {
    const response = await api.get(`/admin/performance/evaluations/${id}`);
    return response.data;
  },

  createEvaluation: async (data: CreateEvaluationData) => {
    const response = await api.post("/admin/performance/evaluations", data);
    return response.data;
  },

  updateEvaluation: async (id: number, data: Partial<CreateEvaluationData>) => {
    const response = await api.put(`/admin/performance/evaluations/${id}`, data);
    return response.data;
  },
};

