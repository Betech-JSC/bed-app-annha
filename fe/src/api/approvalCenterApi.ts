import api from './api';

// Types
export interface ApprovalItem {
    id: number;
    type: 'company_cost' | 'project_cost' | 'material_bill' | 'acceptance' | 'acceptance_supervisor' | 'acceptance_pm' | 'change_request' | 'additional_cost' | 'sub_payment' | 'contract' | 'payment' | 'sub_acceptance' | 'supplier_acceptance' | 'acceptance_item' | 'construction_log' | 'schedule_adjustment' | 'defect' | 'budget' | 'equipment_rental' | 'asset_usage';
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
    attachments?: {
        id: number;
        name: string;
        url: string;
        size: string;
    }[];
    attachments_count?: number;
    rejected_reason?: string;
    management_approved_by?: string;
    management_approved_at?: string;
    role_group?: string; // management, accountant, etc.
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
    recent_items: ApprovalItem[];
    stats: {
        pending_total: number;
        pending_amount: number;
        approved_today: number;
        rejected_today: number;
    };
    grand_total: number;
    user_roles: string[];
    budget_items_by_project?: Record<number, BudgetItemOption[]>;
}

export interface BudgetItemOption {
    id: number;
    name: string;
    budget_name: string;
    cost_group?: string;
    estimated_amount: number;
    actual_amount: number;
    remaining_amount: number;
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
    quickApprove: async (type: string, id: number, notes?: string, budgetItemId?: number): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/approval-center/quick-approve', { 
            type, id, notes,
            ...(budgetItemId ? { budget_item_id: budgetItemId } : {})
        });
        return response.data;
    },

    // Quick reject
    quickReject: async (type: string, id: number, reason: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/approval-center/quick-reject', { type, id, reason });
        return response.data;
    },
};
