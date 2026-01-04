import api from "./api";

export interface ProjectSummaryReport {
  project_id: number;
  project_name: string;
  project_code: string;
  contract_value: number;
  cost_details: {
    material_costs: number;
    equipment_rental_costs: number;
    subcontractor_costs: number;
    labor_contract_costs: number;
    salary_costs: number; // Lương - KHÔNG tính vào dự án
  };
  total_project_costs: number; // Chi phí công trình
  total_salary_costs: number; // Chi phí công ty (lương)
  total_all_costs: number; // Tổng tất cả (tham khảo)
  profit: number; // Lợi nhuận = Hợp đồng - Chi phí công trình
  profit_margin: number; // Tỷ lệ lợi nhuận (%)
}

export interface CostDetailItem {
  id: number;
  name: string;
  amount: number;
  cost_date?: string;
  description?: string;
  material?: {
    id: number;
    name: string;
    quantity: number;
    unit: string;
  };
  equipment?: {
    id: number;
    name: string;
    quantity: number;
    rental_fee: number;
  };
  subcontractor?: {
    id: number;
    name: string;
  };
  time_tracking?: {
    id: number;
    user?: {
      id: number;
      name: string;
    };
    check_in_at?: string;
  };
}

export const projectSummaryReportApi = {
  // Lấy báo cáo tổng hợp dự án
  getSummaryReport: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/summary-report`);
    return response.data;
  },

  // Lấy chi tiết chi phí theo loại
  getCostDetails: async (
    projectId: string | number,
    type: "material" | "equipment" | "subcontractor" | "labor"
  ) => {
    const response = await api.get(
      `/projects/${projectId}/summary-report/costs/${type}`
    );
    return response.data;
  },
};

