import api from "./api";
import { ProjectTask } from "@/types/ganttTypes";
import { IssueRecord } from "./issueRecordApi";

export interface AcceptanceItem {
  id: number;
  uuid: string;
  acceptance_stage_id: number;
  task_id?: number;
  acceptance_template_id?: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  acceptance_status: "not_started" | "pending" | "approved" | "rejected";
  workflow_status: "draft" | "submitted" | "supervisor_approved" | "project_manager_approved" | "customer_approved" | "rejected";
  notes?: string;
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  submitted_by?: number;
  submitted_at?: string;
  supervisor_approved_by?: number;
  supervisor_approved_at?: string;
  project_manager_approved_by?: number;
  project_manager_approved_at?: string;
  customer_approved_by?: number;
  customer_approved_at?: string;
  order: number;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  is_completed?: boolean;
  can_accept?: boolean;
  approver?: any;
  rejector?: any;
  task?: any;
  template?: AcceptanceTemplate;
  submitter?: any;
  supervisor_approver?: any;
  project_manager_approver?: any;
  customer_approver?: any;
  attachments?: any[];
}

export interface AcceptanceTemplate {
  id: number;
  name: string;
  description?: string;
  standard?: string;
  is_active: boolean;
  order: number;
  attachments?: any[]; // Backward compatible
  images?: any[]; // Minh họa (hình ảnh)
  documents?: any[]; // Nội dung chính (PDF, Word, Excel)
}

export interface AcceptanceStage {
  id: number;
  uuid: string;
  project_id: number;
  task_id?: number; // BUSINESS RULE: Must be selected from Progress (parent progress A only)
  phase_id?: number; // BUSINESS RULE: Auto-synced from task.phase_id
  name: string;
  description?: string;
  order: number;
  is_custom: boolean;
  status:
  | "pending"
  | "supervisor_approved"
  | "project_manager_approved"
  | "customer_approved"
  | "internal_approved"
  | "design_approved"
  | "owner_approved"
  | "rejected";
  internal_approved_by?: number;
  internal_approved_at?: string;
  supervisor_approved_by?: number;
  supervisor_approved_at?: string;
  project_manager_approved_by?: number;
  project_manager_approved_at?: string;
  customer_approved_by?: number;
  customer_approved_at?: string;
  design_approved_by?: number;
  design_approved_at?: string;
  owner_approved_by?: number;
  owner_approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  defects?: any[]; // Deprecated - use issueRecords instead
  issueRecords?: IssueRecord[]; // BUSINESS RULE: Use IssueRecord instead of Defect
  task?: ProjectTask; // BUSINESS RULE: Link to parent task (A)
  phase?: any; // BUSINESS RULE: Link to phase (auto-synced from task)
  attachments?: any[];
  items?: AcceptanceItem[];
  is_completed?: boolean;
  completion_percentage?: number;
  acceptability_status?: "acceptable" | "not_acceptable"; // BUSINESS RULE: Calculated from IssueRecord status
}

export interface CreateAcceptanceStageData {
  task_id: number; // BUSINESS RULE: REQUIRED - must be parent task (A)
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateAcceptanceStageData {
  task_id?: number; // BUSINESS RULE: Must be parent task (A)
  name?: string;
  description?: string;
  order?: number;
  acceptance_template_id?: number; // Link to acceptance template from Settings
}

export const acceptanceApi = {
  // Get acceptance stages for project
  getStages: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/acceptance`);
    return response.data;
  },

  // Get single acceptance stage
  getStage: async (projectId: string | number, stageId: string | number) => {
    const response = await api.get(`/projects/${projectId}/acceptance/${stageId}`);
    return response.data;
  },

  // Create acceptance stage
  createStage: async (
    projectId: string | number,
    data: CreateAcceptanceStageData
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance`, data);
    return response.data;
  },

  // Update acceptance stage
  updateStage: async (
    projectId: string | number,
    stageId: string | number,
    data: UpdateAcceptanceStageData
  ) => {
    const response = await api.put(`/projects/${projectId}/acceptance/${stageId}`, data);
    return response.data;
  },

  // Delete acceptance stage
  deleteStage: async (projectId: string | number, stageId: string | number) => {
    const response = await api.delete(`/projects/${projectId}/acceptance/${stageId}`);
    return response.data;
  },

  // Approve acceptance stage (Legacy)
  approveStage: async (
    projectId: string | number,
    stageId: string | number,
    approvalType: "internal" | "customer" | "design" | "owner" | "supervisor" | "project_manager"
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance/${stageId}/approve`, {
      approval_type: approvalType,
    });
    return response.data;
  },

  // Supervisor approve stage
  supervisorApproveStage: async (
    projectId: string | number,
    stageId: string | number
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance/${stageId}/supervisor-approve`);
    return response.data;
  },

  // Project manager approve stage
  projectManagerApproveStage: async (
    projectId: string | number,
    stageId: string | number
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance/${stageId}/project-manager-approve`);
    return response.data;
  },

  // Customer approve stage
  customerApproveStage: async (
    projectId: string | number,
    stageId: string | number
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance/${stageId}/customer-approve`);
    return response.data;
  },

  // Attach files to acceptance stage
  attachFiles: async (
    projectId: string | number,
    stageId: string | number,
    attachmentIds: number[]
  ) => {
    const response = await api.post(`/projects/${projectId}/acceptance/${stageId}/attach-files`, {
      attachment_ids: attachmentIds,
    });
    return response.data;
  },


  // ==================================================================
  // ACCEPTANCE ITEMS
  // ==================================================================

  // Get items for a stage
  getItems: async (
    projectId: string | number,
    stageId: string | number
  ) => {
    const response = await api.get(
      `/projects/${projectId}/acceptance/${stageId}/items`
    );
    return response.data;
  },

  // Create item
  createItem: async (
    projectId: string | number,
    stageId: string | number,
    data: {
      task_id?: number;
      acceptance_template_id?: number;
      name: string;
      description?: string;
      start_date: string;
      end_date: string;
      notes?: string;
      order?: number;
      attachment_ids?: number[];
    }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items`,
      data
    );
    return response.data;
  },

  // Update item
  updateItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    data: Partial<{
      name: string;
      description?: string;
      start_date: string;
      end_date: string;
      notes?: string;
      order?: number;
    }>
  ) => {
    const response = await api.put(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}`,
      data
    );
    return response.data;
  },

  // Delete item
  deleteItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.delete(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}`
    );
    return response.data;
  },

  // Approve item
  approveItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    notes?: string
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/approve`,
      { notes }
    );
    return response.data;
  },

  // Submit item for approval
  submitItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/submit`
    );
    return response.data;
  },

  // Supervisor approve
  supervisorApproveItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/supervisor-approve`
    );
    return response.data;
  },

  // Project manager approve
  projectManagerApproveItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/project-manager-approve`
    );
    return response.data;
  },

  // Customer approve
  customerApproveItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/customer-approve`
    );
    return response.data;
  },

  // Workflow reject
  workflowRejectItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    rejection_reason: string
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/workflow-reject`,
      { rejection_reason }
    );
    return response.data;
  },

  // Reject item
  rejectItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    rejection_reason: string
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/reject`,
      { rejection_reason }
    );
    return response.data;
  },

  // Reset item acceptance
  resetItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/reset`
    );
    return response.data;
  },

  // Reorder items
  reorderItems: async (
    projectId: string | number,
    stageId: string | number,
    items: Array<{ id: number; order: number }>
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/reorder`,
      { items }
    );
    return response.data;
  },

  // Attach files to item
  attachItemFiles: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    attachmentIds: number[]
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/attach-files`,
      { attachment_ids: attachmentIds }
    );
    return response.data;
  },

  // ==================================================================
  // ACCEPTANCE TEMPLATES
  // ==================================================================

  // Get templates
  getTemplates: async (activeOnly: boolean = true) => {
    const response = await api.get('/acceptance-templates', {
      params: { active_only: activeOnly }
    });
    return response.data;
  },

  // Get template detail
  getTemplate: async (templateId: string | number) => {
    const response = await api.get(`/acceptance-templates/${templateId}`);
    return response.data;
  },

  // Create template
  createTemplate: async (data: {
    name: string;
    description?: string;
    standard?: string;
    is_active?: boolean;
    order?: number;
    image_ids?: number[]; // Minh họa (hình ảnh)
    document_ids?: number[]; // Nội dung chính (PDF, Word, Excel)
    attachment_ids?: number[]; // Backward compatible
  }) => {
    const response = await api.post('/acceptance-templates', data);
    return response.data;
  },

  // Update template
  updateTemplate: async (
    templateId: string | number,
    data: {
      name?: string;
      description?: string;
      standard?: string;
      is_active?: boolean;
      order?: number;
      image_ids?: number[]; // Minh họa (hình ảnh)
      document_ids?: number[]; // Nội dung chính (PDF, Word, Excel)
      attachment_ids?: number[]; // Backward compatible
    }
  ) => {
    const response = await api.put(`/acceptance-templates/${templateId}`, data);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (templateId: string | number) => {
    const response = await api.delete(`/acceptance-templates/${templateId}`);
    return response.data;
  },

  // Attach files to acceptance item
  attachFilesToItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number,
    attachmentIds: number[]
  ) => {
    const response = await api.post(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/attach-files`,
      { attachment_ids: attachmentIds }
    );
    return response.data;
  },
};
