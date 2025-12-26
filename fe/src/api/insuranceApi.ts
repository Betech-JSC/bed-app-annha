import api from "./api";

export interface EmployeeInsurance {
  id: number;
  uuid: string;
  user_id: number;
  social_insurance_number?: string;
  health_insurance_number?: string;
  unemployment_insurance_number?: string;
  insurance_start_date?: string;
  insurance_end_date?: string;
  social_insurance_rate: number;
  health_insurance_rate: number;
  unemployment_insurance_rate: number;
  base_salary_for_insurance?: number;
  notes?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  user?: any;
}

export interface EmployeeBenefit {
  id: number;
  uuid: string;
  user_id: number;
  benefit_type: string;
  name: string;
  description?: string;
  amount: number;
  calculation_type: "fixed" | "percentage";
  start_date: string;
  end_date?: string;
  status: "active" | "inactive" | "expired";
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: any;
}

export interface CreateBenefitData {
  user_id: number;
  benefit_type: string;
  name: string;
  description?: string;
  amount: number;
  calculation_type: "fixed" | "percentage";
  start_date: string;
  end_date?: string;
  notes?: string;
}

export const insuranceApi = {
  getInsurance: async (params?: {
    user_id?: number;
  }) => {
    const response = await api.get("/insurance", { params });
    return response.data;
  },

  updateInsurance: async (data: {
    user_id: number;
    social_insurance_number?: string;
    health_insurance_number?: string;
    unemployment_insurance_number?: string;
    insurance_start_date?: string;
    insurance_end_date?: string;
    social_insurance_rate?: number;
    health_insurance_rate?: number;
    unemployment_insurance_rate?: number;
    base_salary_for_insurance?: number;
    notes?: string;
  }) => {
    const response = await api.put("/insurance", data);
    return response.data;
  },

  getBenefits: async (params?: {
    user_id?: number;
    status?: string;
    page?: number;
  }) => {
    const response = await api.get("/insurance/benefits", { params });
    return response.data;
  },

  createBenefit: async (data: CreateBenefitData) => {
    const response = await api.post("/insurance/benefits", data);
    return response.data;
  },

  updateBenefit: async (id: number, data: Partial<CreateBenefitData>) => {
    const response = await api.put(`/insurance/benefits/${id}`, data);
    return response.data;
  },

  deleteBenefit: async (id: number) => {
    const response = await api.delete(`/insurance/benefits/${id}`);
    return response.data;
  },
};

