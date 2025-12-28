import api from "./api";

export interface ConstructionProgressReport {
  project: {
    id: number;
    name: string;
    code: string;
  };
  overall_progress: number;
  period: {
    from_date: string;
    to_date: string;
  };
  construction_logs: any[];
  subcontractor_progress: any[];
  weekly_statistics: Array<{
    week: string;
    week_start: string;
    week_end: string;
    average_progress: number;
    average_personnel: number;
    log_count: number;
  }>;
}

export interface MaterialProcurementReport {
  project: {
    id: number;
    name: string;
    code: string;
  };
  period: {
    from_date: string;
    to_date: string;
  };
  summary: {
    total_transactions: number;
    total_quantity: number;
    total_amount: number;
  };
  transactions: any[];
  material_statistics: any[];
  supplier_statistics: any[];
  daily_statistics: any[];
}

export interface RevenueExpenseReport {
  project: {
    id: number;
    name: string;
    code: string;
  };
  summary: {
    total_revenue: number;
    total_expenses: number;
    total_profit: number;
    profit_margin: number;
  };
  revenue_breakdown: any;
  costs_breakdown: any;
  payments: any[];
  cost_details: any[];
  monthly_statistics: Array<{
    month: string;
    month_label: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

export interface MaterialUsageReport {
  project: {
    id: number;
    name: string;
    code: string;
  };
  period: {
    from_date: string;
    to_date: string;
  };
  summary: {
    total_transactions: number;
    total_quantity: number;
    total_amount: number;
  };
  transactions: any[];
  material_statistics: any[];
  in_out_comparison: any[];
}

export interface ConstructionLogsReport {
  project: {
    id: number;
    name: string;
    code: string;
  };
  period: {
    from_date: string;
    to_date: string;
  };
  summary: {
    total_logs: number;
    average_progress: number;
    average_personnel: number;
  };
  logs: any[];
  weather_statistics: any[];
}

export interface DebtPaymentReport {
  project: {
    id: number;
    name: string;
    code: string;
  };
  summary: {
    total_subcontractor_debt: number;
    total_supplier_debt: number;
    total_debt: number;
  };
  subcontractor_debts: any[];
  supplier_debts: any[];
  project_payments: any[];
}

export const reportApi = {
  // Báo cáo tiến độ thi công
  getConstructionProgress: async (
    projectId: string | number,
    params?: { from_date?: string; to_date?: string }
  ): Promise<{ success: boolean; data: ConstructionProgressReport }> => {
    const response = await api.get(`/admin/reports/projects/${projectId}/construction-progress`, { params });
    return response.data;
  },

  // Báo cáo tiến độ mua vật liệu
  getMaterialProcurement: async (
    projectId: string | number,
    params?: { from_date?: string; to_date?: string }
  ): Promise<{ success: boolean; data: MaterialProcurementReport }> => {
    const response = await api.get(`/admin/reports/projects/${projectId}/material-procurement`, { params });
    return response.data;
  },

  // Báo cáo thu chi theo công việc
  getRevenueExpenseByWork: async (
    projectId: string | number
  ): Promise<{ success: boolean; data: any }> => {
    const response = await api.get(`/admin/reports/projects/${projectId}/revenue-expense-by-work`);
    return response.data;
  },

  // Báo cáo thu chi toàn dự án
  getProjectRevenueExpense: async (
    projectId: string | number,
    params?: { from_date?: string; to_date?: string }
  ): Promise<{ success: boolean; data: RevenueExpenseReport }> => {
    const response = await api.get(`/admin/reports/projects/${projectId}/revenue-expense`, { params });
    return response.data;
  },

  // Báo cáo vật liệu sử dụng
  getMaterialUsage: async (
    projectId: string | number,
    params?: { from_date?: string; to_date?: string }
  ): Promise<{ success: boolean; data: MaterialUsageReport }> => {
    const response = await api.get(`/admin/reports/projects/${projectId}/material-usage`, { params });
    return response.data;
  },

  // Báo cáo nhật ký thi công
  getConstructionLogs: async (
    projectId: string | number,
    params?: { from_date?: string; to_date?: string }
  ): Promise<{ success: boolean; data: ConstructionLogsReport }> => {
    const response = await api.get(`/admin/reports/projects/${projectId}/construction-logs`, { params });
    return response.data;
  },

  // Báo cáo công nợ và thanh toán
  getDebtPayment: async (
    projectId: string | number
  ): Promise<{ success: boolean; data: DebtPaymentReport }> => {
    const response = await api.get(`/admin/reports/projects/${projectId}/debt-payment`);
    return response.data;
  },
};

