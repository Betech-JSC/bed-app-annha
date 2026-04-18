import api from "./api";
import { UploadedFile } from "./attachmentApi";

export interface MaterialBillItem {
    id?: number;
    material_id: number;
    quantity: number;
    unit_price: number;
    total_price?: number;
    notes?: string;
    material?: {
        name: string;
        code: string;
        unit: string;
    };
}

export interface MaterialBill {
    id: number;
    uuid: string;
    project_id: number;
    supplier_id: number;
    bill_number: string;
    bill_date: string;
    cost_group_id: number;
    total_amount: number;
    notes: string;
    status: 'draft' | 'pending_management' | 'pending_accountant' | 'approved' | 'rejected';
    created_by: number;
    management_approved_by?: number;
    management_approved_at?: string;
    accountant_approved_by?: number;
    accountant_approved_at?: string;
    rejected_reason?: string;
    created_at: string;
    updated_at: string;
    supplier?: {
        name: string;
    };
    cost_group?: {
        name: string;
    };
    creator?: {
        name: string;
    };
    management_approver?: {
        name: string;
    };
    accountant_approver?: {
        name: string;
    };
    items?: MaterialBillItem[];
    attachments?: UploadedFile[];
}

export const materialBillApi = {
    getBills: async (projectId: string, params?: any) => {
        const response = await api.get(`/projects/${projectId}/material-bills`, { params });
        return response.data;
    },

    getBill: async (projectId: string, id: string) => {
        const response = await api.get(`/projects/${projectId}/material-bills/${id}`);
        return response.data;
    },

    createBill: async (projectId: string, data: any) => {
        const response = await api.post(`/projects/${projectId}/material-bills`, data);
        return response.data;
    },

    updateBill: async (projectId: string, id: string, data: any) => {
        const response = await api.put(`/projects/${projectId}/material-bills/${id}`, data);
        return response.data;
    },

    deleteBill: async (projectId: string, id: string) => {
        const response = await api.delete(`/projects/${projectId}/material-bills/${id}`);
        return response.data;
    },

    submitBill: async (projectId: string, id: string) => {
        const response = await api.post(`/projects/${projectId}/material-bills/${id}/submit`);
        return response.data;
    },

    approveManagement: async (projectId: string, id: string) => {
        const response = await api.post(`/projects/${projectId}/material-bills/${id}/approve-management`);
        return response.data;
    },

    approveAccountant: async (projectId: string, id: string) => {
        const response = await api.post(`/projects/${projectId}/material-bills/${id}/approve-accountant`);
        return response.data;
    },

    rejectBill: async (projectId: string, id: string, reason: string) => {
        const response = await api.post(`/projects/${projectId}/material-bills/${id}/reject`, { reason });
        return response.data;
    },

    // Hoàn duyệt phiếu vật liệu về trạng thái nháp
    revertToDraft: async (projectId: string, id: string) => {
        const response = await api.post(`/projects/${projectId}/material-bills/${id}/revert`);
        return response.data;
    },
};
