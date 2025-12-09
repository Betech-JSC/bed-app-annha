import api from "./api";

export interface RevenueSummary {
  project: {
    id: number;
    name: string;
    code: string;
  };
  revenue: {
    contract_value: number;
    paid_payments: number;
    total_revenue: number;
  };
  costs: {
    by_category: {
      construction_materials: number;
      concrete: number;
      labor: number;
      equipment: number;
      transportation: number;
      other: number;
    };
    additional_costs: number;
    total_costs: number;
  };
  profit: {
    amount: number;
    margin: number;
  };
}

export interface Cost {
  id: number;
  uuid: string;
  project_id: number;
  category:
  | "construction_materials"
  | "concrete"
  | "labor"
  | "equipment"
  | "transportation"
  | "other";
  name: string;
  amount: number;
  description?: string;
  cost_date: string;
  status:
  | "draft"
  | "pending_management_approval"
  | "pending_accountant_approval"
  | "approved"
  | "rejected";
  created_by: number;
  management_approved_by?: number;
  management_approved_at?: string;
  accountant_approved_by?: number;
  accountant_approved_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
  creator?: any;
  management_approver?: any;
  accountant_approver?: any;
  category_label?: string;
}

export interface CreateCostData {
  category: Cost["category"];
  name: string;
  amount: number;
  description?: string;
  cost_date: string;
}

export interface RevenueDashboard {
  kpi: {
    revenue: number;
    costs: number;
    profit: number;
    profit_margin: number;
  };
  charts: {
    monthly_costs: Array<{ period: string; amount: number }>;
    monthly_profit: Array<{
      period: string;
      revenue: number;
      costs: number;
      profit: number;
    }>;
  };
}

export interface CostsByCategory {
  grouped: Array<{
    category: string;
    category_label: string;
    total: number;
    count: number;
    items: Cost[];
  }>;
  summary: {
    total_amount: number;
    total_count: number;
  };
}

export const revenueApi = {
  // Lấy tổng hợp doanh thu, chi phí, lợi nhuận
  getProjectSummary: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/revenue/summary`);
    return response.data;
  },

  // Lấy dashboard KPI
  getDashboard: async (
    projectId: string | number,
    params?: { period?: "all" | "month" | "quarter" | "year" }
  ) => {
    const response = await api.get(`/projects/${projectId}/revenue/dashboard`, {
      params,
    });
    return response.data;
  },

  // Lấy chi phí theo nhóm
  getCostsByCategory: async (
    projectId: string | number,
    params?: {
      category?: string;
      status?: string;
    }
  ) => {
    const response = await api.get(
      `/projects/${projectId}/revenue/costs-by-category`,
      { params }
    );
    return response.data;
  },
};

export const costApi = {
  // Lấy danh sách chi phí
  getCosts: async (
    projectId: string | number,
    params?: {
      category?: string;
      status?: string;
      search?: string;
      page?: number;
    }
  ) => {
    const response = await api.get(`/projects/${projectId}/costs`, { params });
    return response.data;
  },

  // Tạo chi phí mới
  createCost: async (
    projectId: string | number,
    data: CreateCostData
  ) => {
    const response = await api.post(`/projects/${projectId}/costs`, data);
    return response.data;
  },

  // Cập nhật chi phí
  updateCost: async (
    projectId: string | number,
    costId: string | number,
    data: Partial<CreateCostData>
  ) => {
    const response = await api.put(
      `/projects/${projectId}/costs/${costId}`,
      data
    );
    return response.data;
  },

  // Xóa chi phí
  deleteCost: async (projectId: string | number, costId: string | number) => {
    const response = await api.delete(
      `/projects/${projectId}/costs/${costId}`
    );
    return response.data;
  },

  // Submit để Ban điều hành duyệt
  submitCost: async (projectId: string | number, costId: string | number) => {
    const response = await api.post(
      `/projects/${projectId}/costs/${costId}/submit`
    );
    return response.data;
  },

  // Ban điều hành duyệt
  approveByManagement: async (
    projectId: string | number,
    costId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/costs/${costId}/approve-management`
    );
    return response.data;
  },

  // Kế toán xác nhận
  approveByAccountant: async (
    projectId: string | number,
    costId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/costs/${costId}/approve-accountant`
    );
    return response.data;
  },

  // Từ chối
  rejectCost: async (
    projectId: string | number,
    costId: string | number,
    reason: string
  ) => {
    const response = await api.post(
      `/projects/${projectId}/costs/${costId}/reject`,
      { rejected_reason: reason }
    );
    return response.data;
  },
};
