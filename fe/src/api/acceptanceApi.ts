import api from "./api";
import { ProjectTask } from "@/types/ganttTypes";
import { IssueRecord } from "./issueRecordApi";

// ==================================================================
// NEW FLAT ACCEPTANCE MODEL (replaces AcceptanceStage + AcceptanceItem)
// ==================================================================

export interface Acceptance {
  id: number;
  uuid: string;
  project_id: number;
  task_id: number;
  name: string;
  description?: string;
  order: number;
  workflow_status: 'draft' | 'submitted' | 'supervisor_approved' | 'customer_approved' | 'rejected';
  notes?: string;
  submitted_by?: number;
  submitted_at?: string;
  supervisor_approved_by?: number;
  supervisor_approved_at?: string;
  customer_approved_by?: number;
  customer_approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  task?: any;
  submitter?: any;
  supervisorApprover?: any;
  customerApprover?: any;
  rejector?: any;
  attachments?: any[];
  defects?: any[];
}

export const newAcceptanceApi = {
  getAll: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/acceptances`);
    return response.data;
  },

  create: async (projectId: string | number, data: { task_id: number; name?: string; description?: string }) => {
    const response = await api.post(`/projects/${projectId}/acceptances`, data);
    return response.data;
  },

  update: async (projectId: string | number, id: number, data: { name?: string; description?: string; notes?: string }) => {
    const response = await api.put(`/projects/${projectId}/acceptances/${id}`, data);
    return response.data;
  },

  remove: async (projectId: string | number, id: number) => {
    const response = await api.delete(`/projects/${projectId}/acceptances/${id}`);
    return response.data;
  },

  supervisorApprove: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/acceptances/${id}/supervisor-approve`);
    return response.data;
  },

  customerApprove: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/acceptances/${id}/customer-approve`);
    return response.data;
  },

  reject: async (projectId: string | number, id: number, reason: string) => {
    const response = await api.post(`/projects/${projectId}/acceptances/${id}/reject`, { reason });
    return response.data;
  },

  revert: async (projectId: string | number, id: number) => {
    const response = await api.post(`/projects/${projectId}/acceptances/${id}/revert`);
    return response.data;
  },

  attachFiles: async (projectId: string | number, id: number, attachmentIds: number[]) => {
    const response = await api.post(`/projects/${projectId}/acceptances/${id}/attach-files`, { attachment_ids: attachmentIds });
    return response.data;
  },

  batchSupervisorApprove: async (projectId: string | number, parentTaskId: number) => {
    const response = await api.post(`/projects/${projectId}/acceptances/batch-supervisor-approve`, { parent_task_id: parentTaskId });
    return response.data;
  },

  batchCustomerApprove: async (projectId: string | number, parentTaskId: number) => {
    const response = await api.post(`/projects/${projectId}/acceptances/batch-customer-approve`, { parent_task_id: parentTaskId });
    return response.data;
  },
};

// ==================================================================
// ACCEPTANCE TEMPLATES (still valid — shared module)
// ==================================================================

export interface AcceptanceCriterion {
  id: number;
  acceptance_template_id: number;
  name: string;
  description?: string;
  is_critical: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface AcceptanceTemplate {
  id: number;
  name: string;
  description?: string;
  standard?: string;
  is_active: boolean;
  order: number;
  attachments?: any[];
  images?: any[];
  documents?: any[];
  criteria?: AcceptanceCriterion[];
}

// Template CRUD (still uses /acceptance-templates endpoint)
export const acceptanceTemplateApi = {
  getTemplates: async (activeOnly: boolean = true) => {
    const response = await api.get('/acceptance-templates', {
      params: { active_only: activeOnly }
    });
    return response.data;
  },

  getTemplate: async (templateId: string | number) => {
    const response = await api.get(`/acceptance-templates/${templateId}`);
    return response.data;
  },

  createTemplate: async (data: {
    name: string;
    description?: string;
    standard?: string;
    is_active?: boolean;
    order?: number;
    image_ids?: number[];
    document_ids?: number[];
    attachment_ids?: number[];
  }) => {
    const response = await api.post('/acceptance-templates', data);
    return response.data;
  },

  updateTemplate: async (
    templateId: string | number,
    data: {
      name?: string;
      description?: string;
      standard?: string;
      is_active?: boolean;
      order?: number;
      image_ids?: number[];
      document_ids?: number[];
      attachment_ids?: number[];
    }
  ) => {
    const response = await api.put(`/acceptance-templates/${templateId}`, data);
    return response.data;
  },

  deleteTemplate: async (templateId: string | number) => {
    const response = await api.delete(`/acceptance-templates/${templateId}`);
    return response.data;
  },
};

// ==================================================================
// BACKWARD COMPAT — old `acceptanceApi` callers can use this alias
// ==================================================================
export const acceptanceApi = {
  ...newAcceptanceApi,
  ...acceptanceTemplateApi,
};

