import api from "./api";

export interface RevenueSummary {
  project: {
    id: number;
    name: string;
    code: string;
  };
  revenue: {
    contract_value: number;
    additional_costs: number; // Giá trị phát sinh
    paid_payments: number;
    remaining_payment: number; // Số tiền còn lại cần thanh toán
    total_revenue: number;
  };
  costs: {
    by_group: Array<{
      id: number | null;
      name: string;
      amount: number;
    }>;
    breakdown: {
      additional_costs: number;
      subcontractor_costs: number;
      payroll_costs: number;
      time_tracking_costs: number;
      bonus_costs: number;
      other_costs: number;
    };
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
  cost_group_id: number; // Bắt buộc - liên kết với CostGroup từ Settings
  subcontractor_id?: number;
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
  category_label?: string; // Deprecated - dùng cost_group.name thay thế
  cost_group: {
    id: number;
    name: string;
    code: string;
    description?: string;
  };
  subcontractor?: {
    id: number;
    name: string;
    category?: string;
  };
  attachments?: Array<{
    id: number;
    attachment_id: number;
    file_url: string;
    original_name: string;
    type: string;
  }>;
}

export interface CreateCostData {
  cost_group_id: number; // Bắt buộc - phải chọn từ CostGroups đã thiết lập ở Settings
  name: string;
  amount: number;
  description?: string;
  cost_date: string;
  subcontractor_id?: number; // Bắt buộc nếu cost_group liên quan đến nhà thầu phụ
  attachment_ids?: number[]; // IDs của các file đã upload
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
    monthly_revenue: Array<{ period: string; amount: number }>;
    monthly_profit: Array<{
      period: string;
      revenue: number;
      costs: number;
      profit: number;
    }>;
    costs_by_group: Array<{
      id: number | null;
      name: string;
      amount: number;
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

  // Lấy chi tiết chi phí
  getCost: async (projectId: string | number, costId: string | number) => {
    const response = await api.get(`/projects/${projectId}/costs/${costId}`);
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
