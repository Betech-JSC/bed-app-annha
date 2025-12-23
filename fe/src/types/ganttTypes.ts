export type PhaseStatus = "planning" | "in_progress" | "completed" | "cancelled";
export type TaskStatus = "not_started" | "in_progress" | "completed" | "cancelled" | "on_hold";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type DependencyType = "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";

export interface ProjectPhase {
  id: number;
  uuid: string;
  project_id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  order: number;
  status: PhaseStatus;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  tasks?: ProjectTask[];
  creator?: any;
  updater?: any;
}

export interface ProjectTask {
  id: number;
  uuid: string;
  project_id: number;
  phase_id?: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  progress_percentage: number;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: number;
  order: number;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  phase?: ProjectPhase;
  assignedUser?: any;
  dependencies?: TaskDependency[];
  dependents?: TaskDependency[];
  creator?: any;
  updater?: any;
}

export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type: DependencyType;
  created_at: string;
  updated_at: string;
  dependsOnTask?: ProjectTask;
  task?: ProjectTask;
}

export interface CreatePhaseData {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  order?: number;
  status?: PhaseStatus;
}

export interface UpdatePhaseData extends Partial<CreatePhaseData> {
  order?: number;
}

export interface CreateTaskData {
  phase_id?: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  progress_percentage?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number;
  order?: number;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  progress_percentage?: number;
}

export interface CreateDependencyData {
  depends_on_task_id: number;
  dependency_type?: DependencyType;
}

export interface GanttData {
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  dependencies: TaskDependency[];
}

export interface ReorderPhasesData {
  phases: Array<{ id: number; order: number }>;
}

export interface ReorderTasksData {
  tasks: Array<{ id: number; order: number }>;
}

