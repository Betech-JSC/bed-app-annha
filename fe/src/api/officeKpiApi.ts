import api from "./api";

export interface OfficeKpi {
    id: number;
    user_id: number;
    title: string;
    description?: string;
    target_value: number;
    current_value: number;
    unit: string;
    status: "pending" | "completed" | "verified_success" | "verified_fail";
    year?: number;
    start_date?: string;
    end_date?: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        image?: string;
    };
    creator?: {
        id: number;
        name: string;
    };
}

export interface CreateOfficeKpiData {
    user_id: number;
    title: string;
    description?: string;
    target_value: number;
    unit: string;
    year?: number;
    start_date?: string;
    end_date?: string;
}

export interface UpdateOfficeKpiData {
    title?: string;
    description?: string;
    target_value?: number;
    current_value?: number;
    unit?: string;
    year?: number;
    start_date?: string;
    end_date?: string;
}

export interface VerifyOfficeKpiData {
    status: "verified_success" | "verified_fail" | "pending";
    note?: string;
}

export const officeKpiApi = {
    // Get all office KPIs
    getKpis: async (params?: { user_id?: number; status?: string; year?: number }) => {
        const response = await api.get("/hr/kpis", { params });
        return response.data;
    },

    // Get a specific office KPI
    getKpi: async (id: number) => {
        const response = await api.get(`/hr/kpis/${id}`);
        return response.data;
    },

    // Create a new office KPI
    createKpi: async (data: CreateOfficeKpiData) => {
        const response = await api.post("/hr/kpis", data);
        return response.data;
    },

    // Update an office KPI
    updateKpi: async (id: number, data: UpdateOfficeKpiData) => {
        const response = await api.put(`/hr/kpis/${id}`, data);
        return response.data;
    },

    // Delete an office KPI
    deleteKpi: async (id: number) => {
        const response = await api.delete(`/hr/kpis/${id}`);
        return response.data;
    },

    // Verify an office KPI (manager only)
    verifyKpi: async (id: number, data: VerifyOfficeKpiData) => {
        const response = await api.post(`/hr/kpis/${id}/verify`, data);
        return response.data;
    },
};
