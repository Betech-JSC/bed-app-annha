import api from "./api";

export interface ProjectRisk {
  id: number;
  uuid: string;
  project_id: number;
  title: string;
  description?: string;
  category: "schedule" | "cost" | "quality" | "scope" | "resource" | "technical" | "external" | "other";
  probability: "very_low" | "low" | "medium" | "high" | "very_high";
  impact: "very_low" | "low" | "medium" | "high" | "very_high";
  status: "identified" | "analyzed" | "mitigated" | "monitored" | "closed";
  risk_type: "threat" | "opportunity";
  mitigation_plan?: string;
  contingency_plan?: string;
  owner_id?: number;
  identified_date: string;
  target_resolution_date?: string;
  resolved_date?: string;
  identified_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  risk_score?: number;
  risk_level?: "low" | "medium" | "high" | "critical";
  owner?: any;
  identifier?: any;
  updater?: any;
}

export interface CreateProjectRiskData {
  title: string;
  description?: string;
  category: "schedule" | "cost" | "quality" | "scope" | "resource" | "technical" | "external" | "other";
  probability: "very_low" | "low" | "medium" | "high" | "very_high";
  impact: "very_low" | "low" | "medium" | "high" | "very_high";
  risk_type?: "threat" | "opportunity";
  mitigation_plan?: string;
  contingency_plan?: string;
  owner_id?: number;
  target_resolution_date?: string;
}

export const projectRiskApi = {
  // Get all risks for a project
  getRisks: async (projectId: string | number, params?: {
    status?: string;
    category?: string;
    risk_level?: string;
    active_only?: boolean;
  }) => {
    const response = await api.get(`/projects/${projectId}/risks`, { params });
    return response.data;
  },

  // Get single risk
  getRisk: async (projectId: string | number, riskId: string | number) => {
    const response = await api.get(`/projects/${projectId}/risks/${riskId}`);
    return response.data;
  },

  // Create risk
  createRisk: async (projectId: string | number, data: CreateProjectRiskData) => {
    const response = await api.post(`/projects/${projectId}/risks`, data);
    return response.data;
  },

  // Update risk
  updateRisk: async (
    projectId: string | number,
    riskId: string | number,
    data: Partial<CreateProjectRiskData & { status?: string }>
  ) => {
    const response = await api.put(`/projects/${projectId}/risks/${riskId}`, data);
    return response.data;
  },

  // Delete risk
  deleteRisk: async (projectId: string | number, riskId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/risks/${riskId}`);
    return response.data;
  },

  // Mark as resolved
  markAsResolved: async (projectId: string | number, riskId: string | number) => {
    const response = await api.post(`/projects/${projectId}/risks/${riskId}/resolve`);
    return response.data;
  },
};


