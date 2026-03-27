import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ganttApi } from "@/api/ganttApi";
import { ScreenHeader, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Ionicons } from "@expo/vector-icons";

interface CPMNode {
  id: number;
  name: string;
  duration: number;
  ES: number;
  EF: number;
  LS: number;
  LF: number;
  TF: number;
  is_critical?: boolean;
}

interface DelayWarning {
  task_id: number;
  task_name: string;
  expected_progress: number;
  actual_progress: number;
  gap: number;
  delay_days: number;
  priority: "high" | "medium" | "low";
  is_parent_task: boolean;
  end_date: string;
}

interface ScheduleAdjustment {
  id: number;
  task_id: number;
  task?: { id: number; name: string };
  creator?: { id: number; name: string };
  reason: string;
  original_start?: string;
  original_end?: string;
  proposed_start?: string;
  proposed_end?: string;
  delay_days: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

type ViewMode = "cpm" | "warnings" | "comparison" | "adjustments";

export default function ScheduleAnalysisScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission } = useProjectPermissions(id);

  const [viewMode, setViewMode] = useState<ViewMode>("cpm");
  const [loading, setLoading] = useState(true);

  // CPM Data
  const [criticalTasks, setCriticalTasks] = useState<CPMNode[]>([]);
  const [allNodes, setAllNodes] = useState<CPMNode[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);

  // Warnings
  const [warnings, setWarnings] = useState<DelayWarning[]>([]);

  // Comparison
  const [comparison, setComparison] = useState<any[]>([]);

  // Adjustments
  const [adjustments, setAdjustments] = useState<ScheduleAdjustment[]>([]);

  // Permission
  const [permissionDenied, setPermissionDenied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cpmRes, warningsRes, compRes, adjRes] = await Promise.all([
        ganttApi.getCPM(id!).catch(() => null),
        ganttApi.getDelayWarnings(id!).catch(() => null),
        ganttApi.getProgressComparison(id!).catch(() => null),
        ganttApi.getScheduleAdjustments(id!).catch(() => null),
      ]);

      if (cpmRes?.data) {
        setCriticalTasks(cpmRes.data.critical_tasks || []);
        setAllNodes(cpmRes.data.all_nodes || []);
        setTotalDuration(cpmRes.data.total_duration || 0);
      }

      if (warningsRes?.data) {
        setWarnings(warningsRes.data.warnings || []);
      }

      if (compRes?.data) {
        setComparison(compRes.data.comparison || []);
      }

      if (adjRes?.data) {
        const adjData = adjRes.data.data || adjRes.data || [];
        setAdjustments(Array.isArray(adjData) ? adjData : []);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
      } else {
        console.error("Error loading schedule data:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  useFocusEffect(useCallback(() => { if (id) loadData(); }, [id, loadData]));

  const handleApproveAdjustment = async (adjId: number) => {
    Alert.alert("Xác nhận", "Duyệt hiệu chỉnh tiến độ này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Duyệt",
        onPress: async () => {
          try {
            await ganttApi.approveScheduleAdjustment(id!, adjId);
            Alert.alert("Thành công", "Đã duyệt hiệu chỉnh");
            loadData();
          } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể duyệt");
          }
        },
      },
    ]);
  };

  const handleRejectAdjustment = async (adjId: number) => {
    Alert.alert("Xác nhận", "Từ chối hiệu chỉnh tiến độ này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Từ chối",
        style: "destructive",
        onPress: async () => {
          try {
            await ganttApi.rejectScheduleAdjustment(id!, adjId);
            Alert.alert("Thành công", "Đã từ chối hiệu chỉnh");
            loadData();
          } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể từ chối");
          }
        },
      },
    ]);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "#EF4444";
      case "medium": return "#F59E0B";
      default: return "#EAB308";
    }
  };

  const fmtDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Phân tích tiến độ" showBackButton />
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Phân tích tiến độ" showBackButton />
        <PermissionDenied message="Bạn không có quyền xem phân tích tiến độ." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Phân tích tiến độ" showBackButton />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {([
          { key: "cpm", label: "Đường găng", icon: "analytics-outline" },
          { key: "warnings", label: `Cảnh báo (${warnings.length})`, icon: "warning-outline" },
          { key: "comparison", label: "KH vs TT", icon: "bar-chart-outline" },
          { key: "adjustments", label: `Hiệu chỉnh (${adjustments.filter(a => a.status === 'pending').length})`, icon: "construct-outline" },
        ] as { key: ViewMode; label: string; icon: string }[]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, viewMode === tab.key && styles.tabItemActive]}
            onPress={() => setViewMode(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={viewMode === tab.key ? "#FFF" : "#6B7280"} />
            <Text style={[styles.tabText, viewMode === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#3B82F6" />}
      >
        {/* ============ CPM VIEW ============ */}
        {viewMode === "cpm" && (
          <View style={styles.section}>
            {/* Summary Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                <Text style={[styles.statNumber, { color: "#DC2626" }]}>{criticalTasks.length}</Text>
                <Text style={styles.statLabel}>Đường găng</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                <Text style={[styles.statNumber, { color: "#2563EB" }]}>{totalDuration}</Text>
                <Text style={styles.statLabel}>Tổng ngày</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                <Text style={[styles.statNumber, { color: "#16A34A" }]}>{allNodes.filter(n => n.TF > 0).length}</Text>
                <Text style={styles.statLabel}>Có dự trữ</Text>
              </View>
            </View>

            {/* Critical Path List */}
            <Text style={styles.sectionTitle}>🔴 Critical Path</Text>
            {criticalTasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có dữ liệu đường găng</Text>
                <Text style={styles.emptySubtext}>Cần tạo task và dependency trước</Text>
              </View>
            ) : (
              criticalTasks.map((node, idx) => (
                <View key={node.id} style={styles.cpmCard}>
                  <View style={styles.cpmCardHeader}>
                    <View style={styles.cpmIndexBadge}>
                      <Text style={styles.cpmIndexText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.cpmTaskName} numberOfLines={1}>{node.name}</Text>
                    <View style={styles.cpmDurationBadge}>
                      <Text style={styles.cpmDurationText}>{node.duration}d</Text>
                    </View>
                  </View>
                  <View style={styles.cpmMetaRow}>
                    <View style={styles.cpmMetaItem}>
                      <Text style={styles.cpmMetaLabel}>ES</Text>
                      <Text style={styles.cpmMetaValue}>{node.ES}</Text>
                    </View>
                    <View style={styles.cpmMetaItem}>
                      <Text style={styles.cpmMetaLabel}>EF</Text>
                      <Text style={styles.cpmMetaValue}>{node.EF}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color="#D1D5DB" />
                    <View style={styles.cpmMetaItem}>
                      <Text style={styles.cpmMetaLabel}>LS</Text>
                      <Text style={styles.cpmMetaValue}>{node.LS}</Text>
                    </View>
                    <View style={styles.cpmMetaItem}>
                      <Text style={styles.cpmMetaLabel}>LF</Text>
                      <Text style={styles.cpmMetaValue}>{node.LF}</Text>
                    </View>
                    <View style={[styles.cpmMetaItem, { backgroundColor: "#FEF2F2" }]}>
                      <Text style={[styles.cpmMetaLabel, { color: "#DC2626" }]}>Float</Text>
                      <Text style={[styles.cpmMetaValue, { color: "#DC2626", fontWeight: "700" }]}>0</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ============ WARNINGS VIEW ============ */}
        {viewMode === "warnings" && (
          <View style={styles.section}>
            {warnings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>✅</Text>
                <Text style={styles.emptyText}>Không có cảnh báo chậm tiến độ</Text>
              </View>
            ) : (
              warnings.map((w) => (
                <View key={w.task_id} style={[styles.warningCard, { borderLeftColor: getPriorityColor(w.priority) }]}>
                  <View style={styles.warningHeader}>
                    <Text style={styles.warningTitle} numberOfLines={1}>{w.task_name}</Text>
                    <View style={[styles.warningBadge, { backgroundColor: getPriorityColor(w.priority) + "20" }]}>
                      <Text style={[styles.warningBadgeText, { color: getPriorityColor(w.priority) }]}>
                        Chậm {w.delay_days} ngày
                      </Text>
                    </View>
                  </View>
                  <View style={styles.warningProgressRow}>
                    <Text style={styles.warningProgressLabel}>
                      KH: {w.expected_progress.toFixed(1)}% — TT: {w.actual_progress.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarExpected, { width: `${Math.min(w.expected_progress, 100)}%` }]} />
                    <View style={[styles.progressBarActual, { width: `${Math.min(w.actual_progress, 100)}%` }]} />
                  </View>
                  <View style={styles.progressLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#93C5FD" }]} />
                      <Text style={styles.legendLabel}>Kế hoạch</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
                      <Text style={styles.legendLabel}>Thực tế</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ============ COMPARISON VIEW ============ */}
        {viewMode === "comparison" && (
          <View style={styles.section}>
            {comparison.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có dữ liệu so sánh</Text>
              </View>
            ) : (
              comparison.map((item) => {
                const diff = item.actual_progress - item.planned_progress;
                const isOnTrack = diff >= 0;
                return (
                  <View key={item.id} style={styles.compCard}>
                    <View style={styles.compHeader}>
                      <Text style={styles.compName} numberOfLines={1}>{item.name}</Text>
                      <View style={[styles.compBadge, { backgroundColor: isOnTrack ? "#DCFCE7" : "#FEE2E2" }]}>
                        <Ionicons
                          name={isOnTrack ? "checkmark-circle" : "alert-circle"}
                          size={14}
                          color={isOnTrack ? "#16A34A" : "#DC2626"}
                        />
                        <Text style={[styles.compBadgeText, { color: isOnTrack ? "#16A34A" : "#DC2626" }]}>
                          {isOnTrack ? "Đúng" : `Chậm ${item.delay_days}d`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.compProgressRow}>
                      <View style={styles.compCol}>
                        <Text style={styles.compLabel}>Kế hoạch</Text>
                        <Text style={styles.compValue}>{item.planned_progress.toFixed(1)}%</Text>
                      </View>
                      <View style={styles.compCol}>
                        <Text style={styles.compLabel}>Thực tế</Text>
                        <Text style={[styles.compValue, { fontWeight: "700" }]}>{item.actual_progress.toFixed(1)}%</Text>
                      </View>
                      <View style={styles.compCol}>
                        <Text style={styles.compLabel}>Chênh lệch</Text>
                        <Text style={[styles.compValue, { color: isOnTrack ? "#16A34A" : "#DC2626", fontWeight: "700" }]}>
                          {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============ ADJUSTMENTS VIEW ============ */}
        {viewMode === "adjustments" && (
          <View style={styles.section}>
            {adjustments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có đề xuất hiệu chỉnh</Text>
              </View>
            ) : (
              adjustments.map((adj) => (
                <View key={adj.id} style={styles.adjCard}>
                  <View style={styles.adjHeader}>
                    <Text style={styles.adjTaskName} numberOfLines={1}>{adj.task?.name || "—"}</Text>
                    <View style={[
                      styles.adjStatusBadge,
                      {
                        backgroundColor:
                          adj.status === "approved" ? "#DCFCE7" :
                          adj.status === "rejected" ? "#FEE2E2" : "#FEF3C7",
                      },
                    ]}>
                      <Text style={[
                        styles.adjStatusText,
                        {
                          color:
                            adj.status === "approved" ? "#16A34A" :
                            adj.status === "rejected" ? "#DC2626" : "#D97706",
                        },
                      ]}>
                        {adj.status === "approved" ? "Đã duyệt" : adj.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.adjReason} numberOfLines={2}>{adj.reason}</Text>
                  <View style={styles.adjDates}>
                    <Text style={styles.adjDateText}>
                      {fmtDate(adj.proposed_start)} → {fmtDate(adj.proposed_end)}
                    </Text>
                    {adj.delay_days > 0 && (
                      <Text style={styles.adjDelayText}>+{adj.delay_days} ngày</Text>
                    )}
                  </View>
                  {adj.status === "pending" && (
                    <View style={styles.adjActions}>
                      <TouchableOpacity
                        style={[styles.adjBtn, { backgroundColor: "#DCFCE7" }]}
                        onPress={() => handleApproveAdjustment(adj.id)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                        <Text style={[styles.adjBtnText, { color: "#16A34A" }]}>Duyệt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.adjBtn, { backgroundColor: "#FEE2E2" }]}
                        onPress={() => handleRejectAdjustment(adj.id)}
                      >
                        <Ionicons name="close-circle" size={18} color="#DC2626" />
                        <Text style={[styles.adjBtnText, { color: "#DC2626" }]}>Từ chối</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  tabBar: { backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", maxHeight: 52 },
  tabBarContent: { paddingHorizontal: 12, gap: 8, alignItems: "center", paddingVertical: 8 },
  tabItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#FFF",
  },
  tabItemActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFF" },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center",
    borderWidth: 1,
  },
  statNumber: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  // CPM
  cpmCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#FEE2E2",
  },
  cpmCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cpmIndexBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: "#DC2626",
    justifyContent: "center", alignItems: "center",
  },
  cpmIndexText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  cpmTaskName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1F2937" },
  cpmDurationBadge: {
    backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  cpmDurationText: { color: "#2563EB", fontSize: 12, fontWeight: "600" },
  cpmMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cpmMetaItem: {
    backgroundColor: "#F9FAFB", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    alignItems: "center", minWidth: 40,
  },
  cpmMetaLabel: { fontSize: 9, color: "#9CA3AF", fontWeight: "500" },
  cpmMetaValue: { fontSize: 13, color: "#1F2937", fontWeight: "600" },

  // Warnings
  warningCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
  },
  warningHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  warningTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1F2937" },
  warningBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  warningBadgeText: { fontSize: 11, fontWeight: "600" },
  warningProgressRow: { marginBottom: 8 },
  warningProgressLabel: { fontSize: 12, color: "#6B7280" },
  progressBarBg: {
    height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden",
    marginBottom: 6,
  },
  progressBarExpected: {
    position: "absolute", height: "100%", backgroundColor: "#93C5FD", borderRadius: 4,
  },
  progressBarActual: {
    position: "absolute", height: "100%", backgroundColor: "#3B82F6", borderRadius: 4,
  },
  progressLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: "#9CA3AF" },

  // Comparison
  compCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB",
  },
  compHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  compName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1F2937" },
  compBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  compBadgeText: { fontSize: 11, fontWeight: "600" },
  compProgressRow: { flexDirection: "row", gap: 12 },
  compCol: { flex: 1, alignItems: "center" },
  compLabel: { fontSize: 10, color: "#9CA3AF", marginBottom: 2 },
  compValue: { fontSize: 15, color: "#1F2937" },

  // Adjustments
  adjCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB",
  },
  adjHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  adjTaskName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1F2937" },
  adjStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adjStatusText: { fontSize: 11, fontWeight: "600" },
  adjReason: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  adjDates: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  adjDateText: { fontSize: 12, color: "#4B5563" },
  adjDelayText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  adjActions: { flexDirection: "row", gap: 10 },
  adjBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  adjBtnText: { fontSize: 13, fontWeight: "600" },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: "#6B7280", marginTop: 8 },
  emptySubtext: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
});
