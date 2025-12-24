import api from "./api";

export interface CompanyCapital {
  amount: number;
  currency: string;
}

export interface ProjectProfit {
  id: number;
  name: string;
  code: string;
  revenue: number;
  total_costs: number;
  profit: number;
  profit_margin: number;
}

export interface ProjectProfits {
  total_profit: number;
  total_revenue: number;
  total_costs: number;
  project_count: number;
  projects: ProjectProfit[];
}

export interface FixedCosts {
  total: number;
  currency: string;
}

export interface MonthlyBreakdown {
  period: string;
  amount: number;
}

export interface SalaryCosts {
  total: number;
  count: number;
  currency: string;
  monthly_breakdown: MonthlyBreakdown[];
}

export interface Summary {
  total_revenue: number;
  total_expenses: number;
  total_project_profit: number;
  net_profit: number;
  profit_margin: number;
}

export interface MonthlyData {
  period: string;
  revenue: number;
  project_costs: number;
  salary_costs: number;
  total_costs: number;
  profit: number;
}

export interface Charts {
  monthly: MonthlyData[];
}

export interface SummaryReport {
  company_capital: CompanyCapital;
  project_profits: ProjectProfits;
  fixed_costs: FixedCosts;
  salary_costs: SalaryCosts;
  summary: Summary;
  charts: Charts;
}

export interface SummaryReportResponse {
  success: boolean;
  data: SummaryReport;
}

export const summaryReportApi = {
  // Lấy báo cáo tổng
  getSummaryReport: async (period?: "all" | "month" | "quarter" | "year") => {
    const params = period ? `?period=${period}` : "";
    const response = await api.get<SummaryReportResponse>(
      `/summary-report${params}`
    );
    return response.data;
  },

  // Cập nhật vốn công ty
  updateCompanyCapital: async (amount: number) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      data: CompanyCapital;
    }>("/summary-report/company-capital", { amount });
    return response.data;
  },

  // Cập nhật chi phí cố định
  updateFixedCosts: async (amount: number) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      data: FixedCosts;
    }>("/summary-report/fixed-costs", { amount });
    return response.data;
  },
};

