import api from "./api";
import {
  ProjectPhase,
  ProjectTask,
  TaskDependency,
  CreatePhaseData,
  UpdatePhaseData,
  CreateTaskData,
  UpdateTaskData,
  CreateDependencyData,
  ReorderPhasesData,
  ReorderTasksData,
} from "@/types/ganttTypes";

export const ganttApi = {
  // ==================================================================
  // PHASES
  // ==================================================================

  // Get all phases for a project
  getPhases: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/phases`);
    return response.data;
  },

  // Create a new phase
  createPhase: async (projectId: string | number, data: CreatePhaseData) => {
    const response = await api.post(`/projects/${projectId}/phases`, data);
    return response.data;
  },

  // Get phase by ID
  getPhase: async (projectId: string | number, phaseId: string | number) => {
    const response = await api.get(`/projects/${projectId}/phases/${phaseId}`);
    return response.data;
  },

  // Update phase
  updatePhase: async (
    projectId: string | number,
    phaseId: string | number,
    data: UpdatePhaseData
  ) => {
    const response = await api.put(
      `/projects/${projectId}/phases/${phaseId}`,
      data
    );
    return response.data;
  },

  // Delete phase
  deletePhase: async (projectId: string | number, phaseId: string | number) => {
    const response = await api.delete(
      `/projects/${projectId}/phases/${phaseId}`
    );
    return response.data;
  },

  // Reorder phases
  reorderPhases: async (
    projectId: string | number,
    data: ReorderPhasesData
  ) => {
    const response = await api.post(
      `/projects/${projectId}/phases/reorder`,
      data
    );
    return response.data;
  },

  // ==================================================================
  // TASKS
  // ==================================================================

  // Get all tasks for a project
  getTasks: async (
    projectId: string | number,
    params?: {
      phase_id?: number | "null";
      status?: string;
      assigned_to?: number;
      leaf_only?: boolean; // Only return leaf tasks (tasks without children)
    }
  ) => {
    const response = await api.get(`/projects/${projectId}/tasks`, { 
      params: params ? { ...params, leaf_only: params.leaf_only ? 'true' : undefined } : undefined 
    });
    return response.data;
  },

  // Create a new task
  createTask: async (projectId: string | number, data: CreateTaskData) => {
    const response = await api.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  // Get task by ID
  getTask: async (projectId: string | number, taskId: string | number) => {
    const response = await api.get(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  // Update task
  updateTask: async (
    projectId: string | number,
    taskId: string | number,
    data: UpdateTaskData
  ) => {
    const response = await api.put(
      `/projects/${projectId}/tasks/${taskId}`,
      data
    );
    return response.data;
  },

  // Delete task
  deleteTask: async (projectId: string | number, taskId: string | number) => {
    const response = await api.delete(
      `/projects/${projectId}/tasks/${taskId}`
    );
    return response.data;
  },

  // Reorder tasks
  reorderTasks: async (
    projectId: string | number,
    data: ReorderTasksData
  ) => {
    const response = await api.post(
      `/projects/${projectId}/tasks/reorder`,
      data
    );
    return response.data;
  },

  // Recalculate all tasks progress
  recalculateAllTasks: async (projectId: string | number) => {
    const response = await api.post(
      `/projects/${projectId}/tasks/recalculate-all`
    );
    return response.data;
  },

  // Update task progress
  updateTaskProgress: async (
    projectId: string | number,
    taskId: string | number,
    progressPercentage: number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/progress`,
      { progress_percentage: progressPercentage }
    );
    return response.data;
  },

  // ==================================================================
  // DEPENDENCIES
  // ==================================================================

  // Create dependency
  createDependency: async (
    projectId: string | number,
    taskId: string | number,
    data: CreateDependencyData
  ) => {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/dependencies`,
      data
    );
    return response.data;
  },

  // Delete dependency
  deleteDependency: async (
    projectId: string | number,
    taskId: string | number,
    dependencyId: string | number
  ) => {
    const response = await api.delete(
      `/projects/${projectId}/tasks/${taskId}/dependencies/${dependencyId}`
    );
    return response.data;
  },

  // Validate circular dependency
  validateCircular: async (
    projectId: string | number,
    taskId: string | number,
    dependsOnTaskId: number
  ) => {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/dependencies/validate`,
      { depends_on_task_id: dependsOnTaskId }
    );
    return response.data;
  },

  // ==================================================================
  // GANTT & CPM (Sprint 1 — Module 1)
  // ==================================================================

  // Get Gantt chart aggregated data
  getGanttData: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/gantt`);
    return response.data;
  },

  // Get CPM critical path analysis
  getCPM: async (projectId: string | number) => {
    const response = await api.get(`/projects/${projectId}/gantt/cpm`);
    return response.data;
  },

  // Auto-adjust task dates after change
  autoAdjust: async (
    projectId: string | number,
    data: { task_id: number; new_duration?: number; new_start_date?: string }
  ) => {
    const response = await api.put(
      `/projects/${projectId}/gantt/auto-adjust`,
      data
    );
    return response.data;
  },

  // Get delay warnings
  getDelayWarnings: async (projectId: string | number) => {
    const response = await api.get(
      `/projects/${projectId}/gantt/delay-warnings`
    );
    return response.data;
  },

  // Get progress comparison (planned vs actual)
  getProgressComparison: async (projectId: string | number) => {
    const response = await api.get(
      `/projects/${projectId}/gantt/progress-comparison`
    );
    return response.data;
  },

  // ==================================================================
  // SCHEDULE ADJUSTMENTS (Sprint 1)
  // ==================================================================

  // List schedule adjustments
  getScheduleAdjustments: async (projectId: string | number) => {
    const response = await api.get(
      `/projects/${projectId}/schedule-adjustments`
    );
    return response.data;
  },

  // Create schedule adjustment proposal
  createScheduleAdjustment: async (
    projectId: string | number,
    data: {
      task_id: number;
      reason: string;
      proposed_start_date?: string;
      proposed_end_date?: string;
      proposed_duration?: number;
    }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/schedule-adjustments`,
      data
    );
    return response.data;
  },

  // Approve schedule adjustment
  approveScheduleAdjustment: async (
    projectId: string | number,
    adjustmentId: string | number,
    data?: { notes?: string }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/schedule-adjustments/${adjustmentId}/approve`,
      data
    );
    return response.data;
  },

  // Reject schedule adjustment
  rejectScheduleAdjustment: async (
    projectId: string | number,
    adjustmentId: string | number,
    data?: { rejection_reason?: string }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/schedule-adjustments/${adjustmentId}/reject`,
      data
    );
    return response.data;
  },

  // ==================================================================
  // WBS TEMPLATES (Sprint 1)
  // ==================================================================

  // List WBS templates
  getWbsTemplates: async () => {
    const response = await api.get("/wbs-templates");
    return response.data;
  },

  // Get WBS template detail with tree
  getWbsTemplate: async (templateId: string | number) => {
    const response = await api.get(`/wbs-templates/${templateId}`);
    return response.data;
  },

  // Import WBS template to project
  importWbsTemplate: async (
    projectId: string | number,
    data: { template_id: number; start_date: string }
  ) => {
    const response = await api.post(
      `/projects/${projectId}/tasks/import-template`,
      data
    );
    return response.data;
  },
};

