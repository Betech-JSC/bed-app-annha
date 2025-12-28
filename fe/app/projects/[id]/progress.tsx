import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { progressApi } from "@/api/progressApi";
import { ProgressChart } from "@/components";
import { ganttApi } from "@/api/ganttApi";
import { ProjectPhase, ProjectTask } from "@/types/ganttTypes";
import { constructionLogApi } from "@/api/constructionLogApi";
import { Ionicons } from "@expo/vector-icons";

interface PhaseWithProgress extends ProjectPhase {
  calculated_progress?: number;
  isDelayed?: boolean;
  lastUpdated?: string;
  needsUpdate?: boolean;
}

interface TaskWithAlerts extends ProjectTask {
  isDelayed?: boolean;
  lastUpdated?: string;
  needsUpdate?: boolean;
}

export default function ProgressScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [progressData, setProgressData] = useState<any>(null);
  const [phases, setPhases] = useState<PhaseWithProgress[]>([]);
  const [tasks, setTasks] = useState<TaskWithAlerts[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"structure" | "report">("structure");
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAllData();
  }, [id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProgress(),
        loadPhasesAndTasks(),
        loadLogs(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await progressApi.getProgress(id!);
      if (response.success) {
        setProgressData(response.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const loadPhasesAndTasks = async () => {
    try {
      const [phasesResponse, tasksResponse] = await Promise.all([
        ganttApi.getPhases(id!),
        ganttApi.getTasks(id!),
      ]);

      // Parse phases data - handle different response structures
      let phasesData: any[] = [];
      if (phasesResponse) {
        if (phasesResponse.success && phasesResponse.data) {
          phasesData = Array.isArray(phasesResponse.data) ? phasesResponse.data : [];
        } else if (Array.isArray(phasesResponse)) {
          phasesData = phasesResponse;
        } else if (phasesResponse.data && Array.isArray(phasesResponse.data)) {
          phasesData = phasesResponse.data;
        }
      }
      console.log("Loaded phases:", phasesData.length, phasesData);
      setPhases(phasesData);

      // Parse tasks data - handle different response structures
      let tasksData: any[] = [];
      if (tasksResponse) {
        if (tasksResponse.success && tasksResponse.data) {
          tasksData = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
        } else if (Array.isArray(tasksResponse)) {
          tasksData = tasksResponse;
        } else if (tasksResponse.data && Array.isArray(tasksResponse.data)) {
          tasksData = tasksResponse.data;
        }
      }
      console.log("Loaded tasks:", tasksData.length, tasksData);
      setTasks(tasksData);
    } catch (error) {
      console.error("Error loading phases and tasks:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await constructionLogApi.getLogs(id!);
      if (response.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  // Tính % hoàn thành tự động cho phase từ tasks
  const calculatePhaseProgress = (phase: ProjectPhase): number => {
    const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
    if (phaseTasks.length === 0) return 0;
    
    const totalProgress = phaseTasks.reduce((sum, task) => sum + (task.progress_percentage || 0), 0);
    return Math.round(totalProgress / phaseTasks.length);
  };

  // Kiểm tra trễ tiến độ
  const checkDelayed = (item: ProjectPhase | ProjectTask): boolean => {
    if (!item.end_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(item.end_date);
    endDate.setHours(0, 0, 0, 0);
    
    if (today > endDate) {
      // Nếu đã quá ngày kết thúc và chưa hoàn thành
      if ('status' in item) {
        return item.status !== 'completed' && (item.progress_percentage || 0) < 100;
      }
      return true;
    }
    return false;
  };

  // Kiểm tra chưa cập nhật theo ngày
  const checkNeedsUpdate = (item: ProjectPhase | ProjectTask): boolean => {
    // Tìm log gần nhất liên quan đến task này
    const relatedLogs = logs.filter(log => {
      if ('id' in item && log.task_id === item.id) {
        return true;
      }
      // Nếu là phase, kiểm tra tasks trong phase
      if ('phase_id' in item === false) {
        const phaseTasks = tasks.filter(t => t.phase_id === (item as ProjectPhase).id);
        return phaseTasks.some(t => log.task_id === t.id);
      }
      return false;
    });

    if (relatedLogs.length === 0) {
      // Chưa có log nào, cần cập nhật nếu đã bắt đầu
      if (item.start_date) {
        const startDate = new Date(item.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today >= startDate;
      }
      return false;
    }

    // Kiểm tra log gần nhất
    const latestLog = relatedLogs.sort((a, b) => 
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    )[0];

    const logDate = new Date(latestLog.log_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceUpdate = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

    // Nếu đã quá 3 ngày chưa cập nhật và đang trong thời gian thi công
    return daysSinceUpdate > 3 && item.start_date && new Date(item.start_date) <= today;
  };

  // Phases với progress và alerts
  const phasesWithProgress = useMemo(() => {
    return phases.map(phase => {
      const calculatedProgress = calculatePhaseProgress(phase);
      const isDelayed = checkDelayed(phase);
      const needsUpdate = checkNeedsUpdate(phase);
      
      return {
        ...phase,
        calculated_progress: calculatedProgress,
        isDelayed,
        needsUpdate,
      };
    });
  }, [phases, tasks, logs]);

  // Tasks với alerts
  const tasksWithAlerts = useMemo(() => {
    return tasks.map(task => {
      const isDelayed = checkDelayed(task);
      const needsUpdate = checkNeedsUpdate(task);
      
      return {
        ...task,
        isDelayed,
        needsUpdate,
      };
    });
  }, [tasks, logs]);

  // Tổng hợp cảnh báo
  const warnings = useMemo(() => {
    const delayedPhases = phasesWithProgress.filter(p => p.isDelayed);
    const delayedTasks = tasksWithAlerts.filter(t => t.isDelayed);
    const needsUpdatePhases = phasesWithProgress.filter(p => p.needsUpdate);
    const needsUpdateTasks = tasksWithAlerts.filter(t => t.needsUpdate);

    return {
      delayed: [...delayedPhases, ...delayedTasks],
      needsUpdate: [...needsUpdatePhases, ...needsUpdateTasks],
    };
  }, [phasesWithProgress, tasksWithAlerts]);

  const togglePhase = (phaseId: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tiến Độ Thi Công</Text>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "structure" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("structure")}
        >
          <Ionicons name="list-outline" size={20} color={viewMode === "structure" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeText, viewMode === "structure" && styles.viewModeTextActive]}>
            Cấu trúc tiến độ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "report" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("report")}
          >
          <Ionicons name="bar-chart-outline" size={20} color={viewMode === "report" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeText, viewMode === "report" && styles.viewModeTextActive]}>
            Báo cáo tiến độ
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "structure" ? (
        <>
          {/* Cảnh báo */}
          {(warnings.delayed.length > 0 || warnings.needsUpdate.length > 0) && (
            <View style={styles.warningsSection}>
              <Text style={styles.sectionTitle}>Cảnh báo</Text>
              
              {warnings.delayed.length > 0 && (
                <View style={styles.warningCard}>
                  <View style={[styles.warningIcon, { backgroundColor: "#EF444420" }]}>
                    <Ionicons name="warning-outline" size={24} color="#EF4444" />
                  </View>
                  <View style={styles.warningContent}>
                    <Text style={[styles.warningTitle, { color: "#EF4444" }]}>
                      Trễ tiến độ ({warnings.delayed.length})
                    </Text>
                    <Text style={styles.warningText}>
                      {warnings.delayed.slice(0, 3).map((item: any) => item.name).join(", ")}
                      {warnings.delayed.length > 3 && ` và ${warnings.delayed.length - 3} hạng mục khác`}
                    </Text>
                  </View>
                </View>
              )}

              {warnings.needsUpdate.length > 0 && (
                <View style={styles.warningCard}>
                  <View style={[styles.warningIcon, { backgroundColor: "#F59E0B20" }]}>
                    <Ionicons name="time-outline" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.warningContent}>
                    <Text style={[styles.warningTitle, { color: "#F59E0B" }]}>
                      Chưa cập nhật theo ngày ({warnings.needsUpdate.length})
                    </Text>
                    <Text style={styles.warningText}>
                      {warnings.needsUpdate.slice(0, 3).map((item: any) => item.name).join(", ")}
                      {warnings.needsUpdate.length > 3 && ` và ${warnings.needsUpdate.length - 3} hạng mục khác`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Cấu trúc tiến độ */}
          <View style={styles.structureSection}>
            <Text style={styles.sectionTitle}>Cấu trúc tiến độ</Text>
            
            {phasesWithProgress.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có hạng mục công việc</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => router.push(`/projects/${id}/construction-plan`)}
                >
                  <Text style={styles.createButtonText}>Tạo kế hoạch thi công</Text>
                </TouchableOpacity>
          </View>
        ) : (
              phasesWithProgress.map((phase) => {
                const phaseTasks = tasksWithAlerts.filter(t => t.phase_id === phase.id);
                const isExpanded = expandedPhases.has(phase.id);

                return (
                  <View key={phase.id} style={styles.phaseCard}>
                    <TouchableOpacity
                      style={styles.phaseHeader}
                      onPress={() => togglePhase(phase.id)}
                    >
                      <View style={styles.phaseHeaderLeft}>
                        <Ionicons
                          name={isExpanded ? "chevron-down" : "chevron-forward"}
                          size={20}
                          color="#6B7280"
                        />
                        <View style={styles.phaseInfo}>
                          <View style={styles.phaseNameRow}>
                            <Text style={styles.phaseName}>{phase.name}</Text>
                            {(phase.isDelayed || phase.needsUpdate) && (
                              <View style={styles.alertBadges}>
                                {phase.isDelayed && (
                                  <View style={[styles.alertBadge, { backgroundColor: "#EF444420" }]}>
                                    <Ionicons name="warning" size={12} color="#EF4444" />
                                    <Text style={[styles.alertBadgeText, { color: "#EF4444" }]}>
                                      Trễ
                                    </Text>
                                  </View>
                                )}
                                {phase.needsUpdate && (
                                  <View style={[styles.alertBadge, { backgroundColor: "#F59E0B20" }]}>
                                    <Ionicons name="time" size={12} color="#F59E0B" />
                                    <Text style={[styles.alertBadgeText, { color: "#F59E0B" }]}>
                                      Cần cập nhật
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                          <View style={styles.phaseDates}>
                            <Text style={styles.phaseDateText}>
                              {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.phaseProgressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${phase.calculated_progress || 0}%`,
                                backgroundColor: phase.isDelayed ? "#EF4444" : "#3B82F6",
                              },
                            ]}
        />
                        </View>
                        <Text style={styles.progressText}>
                          {phase.calculated_progress || 0}%
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.tasksContainer}>
                        {phaseTasks.length === 0 ? (
                          <Text style={styles.noTasksText}>Chưa có công việc</Text>
                        ) : (
                          phaseTasks.map((task) => (
                            <View key={task.id} style={styles.taskItem}>
                              <View style={styles.taskInfo}>
                                <Text style={styles.taskName}>{task.name}</Text>
                                <View style={styles.taskDetails}>
                                  <Text style={styles.taskDateText}>
                                    {formatDate(task.start_date)} - {formatDate(task.end_date)}
                                  </Text>
                                  {(task.isDelayed || task.needsUpdate) && (
                                    <View style={styles.alertBadges}>
                                      {task.isDelayed && (
                                        <View style={[styles.alertBadge, styles.alertBadgeSmall, { backgroundColor: "#EF444420" }]}>
                                          <Ionicons name="warning" size={10} color="#EF4444" />
                                        </View>
                                      )}
                                      {task.needsUpdate && (
                                        <View style={[styles.alertBadge, styles.alertBadgeSmall, { backgroundColor: "#F59E0B20" }]}>
                                          <Ionicons name="time" size={10} color="#F59E0B" />
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </View>
                              </View>
                              <View style={styles.taskProgressContainer}>
                                <View style={styles.progressBar}>
                  <View
                    style={[
                                      styles.progressFill,
                      {
                                        width: `${task.progress_percentage || 0}%`,
                                        backgroundColor: task.isDelayed ? "#EF4444" : "#10B981",
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.taskProgressText}>
                                  {task.progress_percentage || 0}%
                                </Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </>
      ) : (
        <>
          {/* Báo cáo tiến độ */}
          <View style={styles.reportSection}>
            <Text style={styles.sectionTitle}>Báo cáo tiến độ</Text>
            
            {progressData && progressData.progress ? (
              <>
                <View style={styles.chartContainer}>
                  <ProgressChart
                    progress={progressData.progress}
                    logs={progressData.logs || []}
                    type="progress"
                  />
                </View>

                {progressData.logs && progressData.logs.length > 0 && (
                  <View style={styles.chartContainer}>
                    <ProgressChart
                      progress={progressData.progress}
                      logs={progressData.logs}
                      type="line"
                    />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có dữ liệu tiến độ</Text>
              </View>
            )}

            {/* Tóm tắt cảnh báo */}
            {(warnings.delayed.length > 0 || warnings.needsUpdate.length > 0) && (
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Tóm tắt cảnh báo</Text>
                
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryIcon, { backgroundColor: "#EF444420" }]}>
                      <Ionicons name="warning-outline" size={20} color="#EF4444" />
                    </View>
                    <View style={styles.summaryContent}>
                      <Text style={styles.summaryLabel}>Trễ tiến độ</Text>
                      <Text style={styles.summaryValue}>{warnings.delayed.length} hạng mục</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: "#F59E0B20" }]}>
                    <Ionicons name="time-outline" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Chưa cập nhật</Text>
                    <Text style={styles.summaryValue}>{warnings.needsUpdate.length} hạng mục</Text>
                  </View>
              </View>
            </View>
            )}
        </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  viewModeContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  viewModeButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeTextActive: {
    color: "#FFFFFF",
  },
  warningsSection: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  structureSection: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  phaseCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  phaseHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  alertBadges: {
    flexDirection: "row",
    gap: 4,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  phaseDates: {
    marginTop: 4,
  },
  phaseDateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  phaseProgressContainer: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 80,
  },
  progressBar: {
    width: 80,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  tasksContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  noTasksText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  taskDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskDateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  taskProgressContainer: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 60,
  },
  taskProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  reportSection: {
    padding: 16,
  },
  chartContainer: {
    marginBottom: 16,
  },
  summarySection: {
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  createButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
