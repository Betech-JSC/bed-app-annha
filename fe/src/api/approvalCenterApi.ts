import api from './api';

// Types
export interface ApprovalItem {
    id: number;
    type: 'company_cost' | 'project_cost' | 'material_bill' | 'acceptance' | 'change_request' | 'additional_cost' | 'sub_payment' | 'contract' | 'payment' | 'sub_acceptance' | 'supplier_acceptance';
    title: string;
    subtitle: string;
    amount: number;
    status: string;
    status_label: string;
    created_by: string;
    created_at: string;
    cost_date?: string;
    description?: string;
    project_id?: number;
    project_name?: string;
    management_approved_by?: string;
    management_approved_at?: string;
    subcontractor_name?: string;
    supplier_name?: string;
    priority?: string;
    route: string;
    can_approve: boolean;
    approval_level: string;
    // Role info — who needs to approve
    required_role: string;
    required_role_label: string;
    required_role_short: string;
    required_role_icon: string;
    required_role_color: string;
}

export interface ApprovalSummary {
    type: string;
    label: string;
    icon: string;
    color: string;
    total: number;
    pending_management?: number;
    pending_accountant?: number;
}

export interface ApprovalCenterData {
    summary: ApprovalSummary[];
    items: ApprovalItem[];
    grand_total: number;
    user_roles: string[];
}

export const approvalCenterApi = {
    // Get all pending approvals
    getApprovals: async (params?: {
        type?: string;
    }): Promise<{ success: boolean; data: ApprovalCenterData }> => {
        const response = await api.get('/approval-center', { params });
        return response.data;
    },

    // Quick approve
    quickApprove: async (type: string, id: number): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/approval-center/quick-approve', { type, id });
        return response.data;
    },

    // Quick reject
    quickReject: async (type: string, id: number, reason: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/approval-center/quick-reject', { type, id, reason });
        return response.data;
    },
};
