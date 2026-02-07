import api from './api';

export interface CompanyCost {
    id: number;
    uuid: string;
    name: string;
    amount: number;
    cost_group_id: number;
    supplier_id?: number;
    input_invoice_id?: number;
    cost_date: string;
    description?: string;
    quantity?: number;
    unit?: string;
    status: 'draft' | 'pending_management_approval' | 'pending_accountant_approval' | 'approved' | 'rejected';
    rejected_reason?: string;
    created_by: number;
    management_approved_by?: number;
    management_approved_at?: string;
    accountant_approved_by?: number;
    accountant_approved_at?: string;
    created_at: string;
    updated_at: string;
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    management_approver?: {
        id: number;
        name: string;
    };
    accountant_approver?: {
        id: number;
        name: string;
    };
    cost_group?: {
        id: number;
        name: string;
        code?: string;
    };
    supplier?: {
        id: number;
        name: string;
        contact_person?: string;
        phone?: string;
    };
    input_invoice?: {
        id: number;
        invoice_number: string;
        invoice_date: string;
        total_amount: number;
    };
    attachments?: Array<{
        id: number;
        file_url: string;
        original_name: string;
        type: string;
    }>;
}

export interface CompanyCostSummary {
    total_costs: number;
    total_amount: number;
    draft_count: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    by_cost_group: Array<{
        cost_group_id: number;
        cost_group_name: string;
        total: number;
    }>;
    by_supplier: Array<{
        supplier_id: number;
        supplier_name: string;
        total: number;
        count: number;
    }>;
}

export interface CreateCompanyCostData {
    name: string;
    amount: number;
    cost_group_id: number;
    cost_date: string;
    description?: string;
    quantity?: number;
    unit?: string;
    supplier_id?: number;
    input_invoice_id?: number;
    attachment_ids?: number[];
}

export const companyCostApi = {
    // Get list of company costs
    getCompanyCosts: async (params?: {
        status?: string;
        cost_group_id?: number;
        start_date?: string;
        end_date?: string;
        search?: string;
        page?: number;
        per_page?: number;
    }) => {
        const response = await api.get('/company-costs', { params });
        return response.data;
    },

    // Get company costs summary
    getSummary: async (params?: {
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await api.get('/company-costs/summary', { params });
        return response.data;
    },

    // Get single company cost
    getCompanyCost: async (id: number) => {
        const response = await api.get(`/company-costs/${id}`);
        return response.data;
    },

    // Create company cost
    createCompanyCost: async (data: CreateCompanyCostData) => {
        const response = await api.post('/company-costs', data);
        return response.data;
    },

    // Update company cost
    updateCompanyCost: async (id: number, data: Partial<CreateCompanyCostData>) => {
        const response = await api.put(`/company-costs/${id}`, data);
        return response.data;
    },

    // Delete company cost
    deleteCompanyCost: async (id: number) => {
        const response = await api.delete(`/company-costs/${id}`);
        return response.data;
    },

    // Submit for approval
    submitCompanyCost: async (id: number) => {
        const response = await api.post(`/company-costs/${id}/submit`);
        return response.data;
    },

    // Approve by management
    approveByManagement: async (id: number) => {
        const response = await api.post(`/company-costs/${id}/approve-management`);
        return response.data;
    },

    // Approve by accountant
    approveByAccountant: async (id: number) => {
        const response = await api.post(`/company-costs/${id}/approve-accountant`);
        return response.data;
    },

    // Reject
    rejectCompanyCost: async (id: number, reason: string) => {
        const response = await api.post(`/company-costs/${id}/reject`, { reason });
        return response.data;
    },
};
