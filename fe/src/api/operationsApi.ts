import api from './api';

// ===================================================================
// INTERFACES
// ===================================================================

export interface Shareholder {
    id: string;
    name: string;
    contributed_amount: number;
    share_percentage: number;
    phone?: string;
    email?: string;
    id_number?: string;
    contribution_date?: string;
    status: 'active' | 'inactive';
    notes?: string;
    created_at: string;
}

export interface CompanyAsset {
    id: string;
    code: string;
    name: string;
    category: 'computer' | 'machinery' | 'vehicle' | 'furniture' | 'other';
    purchase_price: number;
    current_value: number;
    accumulated_depreciation: number;
    useful_life_months: number;
    residual_value: number;
    purchase_date: string;
    serial_number?: string;
    brand?: string;
    location?: string;
    description?: string;
    status: 'available' | 'in_use' | 'maintenance' | 'retired';
    assigned_to?: number;
    assigned_to_user?: { id: number; name: string };
    assigned_user?: { id: number; name: string };
    created_at: string;
}

export interface OperationsDashboard {
    total_capital: number;
    project_revenue: number;
    project_costs: number;
    operations_costs: number;
    assets: {
        total: number;
        total_value: number;
        total_purchase: number;
        total_depreciation: number;
        by_status: Record<string, number>;
    };
    materials: {
        total_items: number;
        total_value: number;
        low_stock_count: number;
    };
    monthly_expenses: Array<{
        month: string;
        label: string;
        capex: number;
        opex: number;
        payroll: number;
    }>;
    top_shareholders: Shareholder[];
}

export interface AssetStats {
    total_purchase: number;
    total_value: number;
    total_depreciation: number;
    counts: Record<string, number>;
}

// ===================================================================
// API
// ===================================================================

export const operationsApi = {
    // Dashboard
    getDashboard: async () => {
        const response = await api.get('/operations/dashboard');
        return response.data;
    },

    // Shareholders
    getShareholders: async (params?: { search?: string; status?: string }) => {
        const response = await api.get('/operations/shareholders', { params });
        return response.data;
    },

    createShareholder: async (data: Partial<Shareholder>) => {
        const response = await api.post('/operations/shareholders', data);
        return response.data;
    },

    updateShareholder: async (id: string, data: Partial<Shareholder>) => {
        const response = await api.put(`/operations/shareholders/${id}`, data);
        return response.data;
    },

    deleteShareholder: async (id: string) => {
        const response = await api.delete(`/operations/shareholders/${id}`);
        return response.data;
    },

    // Assets
    getAssets: async (params?: { search?: string; category?: string; status?: string; page?: number; per_page?: number }) => {
        const response = await api.get('/operations/assets', { params });
        return response.data;
    },

    getAsset: async (id: string) => {
        const response = await api.get(`/operations/assets/${id}`);
        return response.data;
    },

    createAsset: async (data: Partial<CompanyAsset>) => {
        const response = await api.post('/operations/assets', data);
        return response.data;
    },

    updateAsset: async (id: string, data: Partial<CompanyAsset>) => {
        const response = await api.put(`/operations/assets/${id}`, data);
        return response.data;
    },

    deleteAsset: async (id: string) => {
        const response = await api.delete(`/operations/assets/${id}`);
        return response.data;
    },

    assignAsset: async (id: string, data: {
        action: 'assign' | 'return' | 'transfer' | 'repair' | 'dispose';
        user_id?: number;
        project_id?: number;
        location?: string;
        notes?: string;
    }) => {
        const response = await api.post(`/operations/assets/${id}/assign`, data);
        return response.data;
    },

    runDepreciation: async () => {
        const response = await api.post('/operations/assets/run-depreciation');
        return response.data;
    },
};
