import api from "./api";

export interface BudgetItem {
  id: number;
  uuid: string;
  budget_id: number;
  cost_group_id?: number;
  name: string;
  description?: string;
  estimated_amount: number;
  remaining_amount: number;
  quantity?: number;
  unit_price?: number;
  order: number;
  cost_group?: any;
}

export interface ProjectBudget {
  id: number;
  uuid: string;
  project_id: number;
  name: string;
  version?: string;
  total_budget: number;
  estimated_cost: number;
  remaining_budget: number;
  budget_date: string;
  notes?: string;
  status: "draft" | "approved" | "active" | "archived";
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  items?: BudgetItem[];
  project?: any;
  creator?: any;
  approver?: any;
}

export interface CreateBudgetData {
  name: string;
  version?: string;
  budget_date: string;
  notes?: string;
  items: Array<{
    name: string;
    cost_group_id?: number;
    description?: string;
    estimated_amount: number;
    quantity?: number;
    unit_price?: number;
  }>;
}

export const budgetApi = {
  getBudgets: async (projectId: number, params?: {
    page?: number;
  }) => {
    const response = await api.get(`/projects/${projectId}/budgets`, { params });
    return response.data;
  },

  getBudget: async (projectId: number, id: number) => {
    const response = await api.get(`/projects/${projectId}/budgets/${id}`);
    return response.data;
  },

  compareWithActual: async (projectId: number, id: number) => {
    const response = await api.get(`/projects/${projectId}/budgets/${id}/compare`);
    return response.data;
  },

  createBudget: async (projectId: number, data: CreateBudgetData) => {
    const response = await api.post(`/projects/${projectId}/budgets`, data);
    return response.data;
  },

  updateBudget: async (projectId: number, id: number, data: Partial<CreateBudgetData>) => {
    const response = await api.put(`/projects/${projectId}/budgets/${id}`, data);
    return response.data;
  },

  deleteBudget: async (projectId: number, id: number) => {
    const response = await api.delete(`/projects/${projectId}/budgets/${id}`);
    return response.data;
  },
};

