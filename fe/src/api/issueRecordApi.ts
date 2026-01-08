import api from "./api";
import { ProjectTask } from "@/types/ganttTypes";

// Forward declarations to avoid circular imports
export interface AcceptanceStage {
  id: number;
  name: string;
  [key: string]: any;
}

export interface AcceptanceItem {
  id: number;
  name: string;
  [key: string]: any;
}

export interface User {
  id: number;
  name: string;
  email?: string;
}

export interface Attachment {
  id: number;
  file_name: string;
  file_path?: string;
  file_url?: string;
  mime_type?: string;
  type?: string;
}

export interface IssueRecord {
  id: number;
  uuid: string;
  project_id: number;
  acceptance_stage_id: number;
  acceptance_item_id?: number;
  task_id?: number; // Category A (parent task)
  title: string;
  description?: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  severity: "low" | "medium" | "high" | "critical";
  resolution_notes?: string;
  resolved_at?: string;
  reported_by: number;
  assigned_to?: number;
  resolved_by?: number;
  acceptance_stage?: AcceptanceStage;
  acceptance_item?: AcceptanceItem;
  task?: ProjectTask;
  reporter?: User;
  assignee?: User;
  resolver?: User;
  attachments?: Attachment[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateIssueRecordData {
  acceptance_stage_id: number;
  acceptance_item_id?: number;
  task_id?: number;
  title: string;
  description?: string;
  severity: "low" | "medium" | "high" | "critical";
  assigned_to?: number;
}

export interface UpdateIssueRecordData {
  title?: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: "open" | "in_progress" | "completed" | "cancelled";
  assigned_to?: number;
  resolution_notes?: string;
}

export const issueRecordApi = {
  // List all issue records for a project
  getIssueRecords: async (
    projectId: string | number,
    params?: {
      status?: string;
      acceptance_stage_id?: number;
      acceptance_item_id?: number;
      task_id?: number;
    }
  ) => {
    const response = await api.get(`/projects/${projectId}/issue-records`, {
      params,
    });
    return response.data;
  },

  // Get issue records for a stage
  getByStage: async (
    projectId: string | number,
    stageId: string | number
  ) => {
    const response = await api.get(
      `/projects/${projectId}/acceptance/${stageId}/issue-records`
    );
    return response.data;
  },

  // Get issue records for an item
  getByItem: async (
    projectId: string | number,
    stageId: string | number,
    itemId: string | number
  ) => {
    const response = await api.get(
      `/projects/${projectId}/acceptance/${stageId}/items/${itemId}/issue-records`
    );
    return response.data;
  },

  // Create issue record
  create: async (
    projectId: string | number,
    data: CreateIssueRecordData
  ) => {
    const response = await api.post(
      `/projects/${projectId}/issue-records`,
      data
    );
    return response.data;
  },

  // Update issue record
  update: async (
    projectId: string | number,
    id: string | number,
    data: UpdateIssueRecordData
  ) => {
    const response = await api.put(
      `/projects/${projectId}/issue-records/${id}`,
      data
    );
    return response.data;
  },

  // Resolve issue record
  resolve: async (
    projectId: string | number,
    id: string | number,
    resolutionNotes?: string
  ) => {
    const response = await api.post(
      `/projects/${projectId}/issue-records/${id}/resolve`,
      {
        resolution_notes: resolutionNotes,
      }
    );
    return response.data;
  },

  // Delete issue record
  delete: async (projectId: string | number, id: string | number) => {
    const response = await api.delete(
      `/projects/${projectId}/issue-records/${id}`
    );
    return response.data;
  },
};
