import api from "./api";

export interface Kpi {
    id: number;
    project_id: number;
    user_id: number;
    title: string;
    description?: string;
    target_value: number;
    current_value: number;
    unit: string;
    status: "pending" | "completed" | "verified_success" | "verified_fail";
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

export interface CreateKpiData {
    user_id: number;
    title: string;
    description?: string;
    target_value: number;
    unit: string;
    start_date?: string;
    end_date?: string;
}

export interface UpdateKpiData {
    title?: string;
    description?: string;
    target_value?: number;
    current_value?: number;
    unit?: string;
    start_date?: string;
    end_date?: string;
}

export interface VerifyKpiData {
    status: "verified_success" | "verified_fail" | "pending";
    note?: string;
}

export const kpiApi = {
    // Get KPIs for project
    getKpis: async (projectId: string | number, params?: { user_id?: number; status?: string }) => {
        const response = await api.get(`/projects/${projectId}/kpis`, { params });
        return response.data;
    },

    // Get KPI detail
    getKpi: async (projectId: string | number, kpiId: string | number) => {
        const response = await api.get(`/projects/${projectId}/kpis/${kpiId}`);
        return response.data;
    },

    // Create KPI
    createKpi: async (projectId: string | number, data: CreateKpiData) => {
        const response = await api.post(`/projects/${projectId}/kpis`, data);
        return response.data;
    },

    // Update KPI
    updateKpi: async (projectId: string | number, kpiId: string | number, data: UpdateKpiData) => {
        const response = await api.put(`/projects/${projectId}/kpis/${kpiId}`, data);
        return response.data;
    },

    // Delete KPI
    deleteKpi: async (projectId: string | number, kpiId: string | number) => {
        const response = await api.delete(`/projects/${projectId}/kpis/${kpiId}`);
        return response.data;
    },

    // Verify KPI
    verifyKpi: async (projectId: string | number, kpiId: string | number, data: VerifyKpiData) => {
        const response = await api.post(`/projects/${projectId}/kpis/${kpiId}/verify`, data);
        return response.data;
    },
};
