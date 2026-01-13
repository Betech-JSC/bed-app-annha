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
};

