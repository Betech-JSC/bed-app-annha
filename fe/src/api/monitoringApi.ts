import api from "./api";

export interface MonitoringAlert {
  type: "delay" | "budget" | "defects" | "risk" | "change_request" | "deadline";
  severity: "low" | "medium" | "high" | "critical";
  project_id: number;
  project_name: string;
  message: string;
  days_remaining?: number;
  progress_gap?: number;
  budget_used_percentage?: number;
  overrun_amount?: number;
}

export interface DashboardData {
  total_projects: number;
  active_projects: number;
  at_risk_projects: number;
  total_alerts: number;
  alerts: MonitoringAlert[];
  overdue_tasks: Array<{
    id: number;
    name: string;
    project_id: number;
    project_name: string;
    end_date: string;
    overdue_days: number;
  }>;
  budget_alerts: MonitoringAlert[];
  summary: {
    critical_alerts: number;
    high_alerts: number;
    medium_alerts: number;
  };
}

export interface ProjectMonitoringData {
  project: {
    id: number;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
  };
  metrics: {
    progress: number;
    open_defects: number;
    high_risks: number;
    pending_changes: number;
    overdue_tasks: number;
  };
  alerts: MonitoringAlert[];
}

export const monitoringApi = {
  // Get dashboard data (all projects)
  getDashboard: async (): Promise<{ success: boolean; data: DashboardData }> => {
    const response = await api.get("/monitoring/dashboard");
    return response.data;
  },

  // Get monitoring data for a specific project
  getProjectMonitoring: async (projectId: string | number): Promise<{ success: boolean; data: ProjectMonitoringData }> => {
    const response = await api.get(`/projects/${projectId}/monitoring`);
    return response.data;
  },
};

