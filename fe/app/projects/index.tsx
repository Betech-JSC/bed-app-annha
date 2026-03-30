import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { projectApi, Project } from "@/api/projectApi";
import { monitoringApi, ProjectMonitoringData } from "@/api/monitoringApi";
import { predictiveAnalyticsApi } from "@/api/predictiveAnalyticsApi";
import { projectCommentApi } from "@/api/projectCommentApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { ScreenHeader, DatePickerInput } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { NotificationBadge } from "@/components";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { BlurView } from "expo-blur";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  planning: { label: "Lập kế hoạch", color: "#6366F1", bgColor: "#EEF2FF", icon: "calendar-outline" },
  in_progress: { label: "Đang thi công", color: "#10B981", bgColor: "#ECFDF5", icon: "construct-outline" },
  completed: { label: "Hoàn thành", color: "#3B82F6", bgColor: "#EFF6FF", icon: "checkmark-circle-outline" },
  cancelled: { label: "Đã hủy", color: "#EF4444", bgColor: "#FEF2F2", icon: "close-circle-outline" },
};

const DEFAULT_STATUS = { label: "N/A", color: "#6B7280", bgColor: "#F3F4F6", icon: "help-circle-outline" };

// ─────────────────────────────────────────────────
// Project Card Component (Optimized)
// ─────────────────────────────────────────────────

const ProjectCard = React.memo(({
  item,
  monitoring,
  prediction,
  latestComment,
  onPress,
  onEdit,
  onDelete
}: {
  item: Project;
  monitoring?: ProjectMonitoringData;
  prediction?: any;
  latestComment?: any;
  onPress: () => void;
  onEdit: (e: any) => void;
  onDelete: (e: any) => void;
}) => {
  const status = STATUS_CONFIG[item.status] || DEFAULT_STATUS;
  const progressValue = item.progress?.overall_percentage || 0;

  // Risks & Warnings
  const hasDelayRisk = prediction?.delay_risk?.risk_level === 'high' || prediction?.delay_risk?.risk_level === 'critical';
  const hasCostRisk = prediction?.cost_risk?.risk_level === 'high' || prediction?.cost_risk?.risk_level === 'critical';
  const overdueTasks = monitoring?.metrics?.overdue_tasks || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Risk Indicators (Pills at top right) */}
      <View style={styles.cardBadges}>
        {hasDelayRisk && (
          <View style={[styles.badgePill, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="time" size={12} color="#EF4444" />
            <Text style={[styles.badgeText, { color: '#EF4444' }]}>Chậm</Text>
          </View>
        )}
        {overdueTasks > 0 && (
          <View style={[styles.badgePill, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="alert-circle" size={12} color="#F97316" />
            <Text style={[styles.badgeText, { color: '#F97316' }]}>{overdueTasks} Quá hạn</Text>
          </View>
        )}
      </View>

      <View style={styles.cardHeader}>
        <View style={styles.cardStatusContainer}>
          <View style={[styles.statusIcon, { backgroundColor: status.bgColor }]}>
            <Ionicons name={status.icon as any} size={20} color={status.color} />
          </View>
          <View>
            <Text style={styles.projectCode}>{item.code}</Text>
            <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <PermissionGuard permission={Permissions.PROJECT_UPDATE}>
            <TouchableOpacity style={styles.cardActionBtn} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard permission={Permissions.PROJECT_DELETE}>
            <TouchableOpacity style={styles.cardActionBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Tiến độ tổng thể</Text>
          <Text style={[styles.progressValue, { color: status.color }]}>{progressValue}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressValue}%`, backgroundColor: status.color }
            ]}
          />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerInfo}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.footerInfoText}>
            {item.start_date ? new Date(item.start_date).toLocaleDateString("vi-VN") : "N/A"}
          </Text>
        </View>

        <View style={styles.footerInfo}>
          <Ionicons name="people-outline" size={14} color="#6B7280" />
          <Text style={styles.footerInfoText}>
            {item.project_manager?.name || "Chưa gán"}
          </Text>
        </View>

        <View style={[styles.statusTag, { backgroundColor: status.bgColor }]}>
          <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Smallest Comment Preview */}
      {latestComment && (
        <View style={styles.commentLine}>
          <Ionicons name="chatbox-ellipses-outline" size={12} color="#9CA3AF" />
          <Text style={styles.commentText} numberOfLines={1}>
            <Text style={{ fontWeight: '600' }}>{latestComment.user?.name}: </Text>
            {latestComment.content}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────

export default function ProjectsListScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { unreadCount } = useUnreadCount({ autoRefresh: false });

  // Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Monitoring/Predictions (Lazy Loaded)
  const [monitoringData, setMonitoringData] = useState<Record<number, ProjectMonitoringData>>({});
  const [predictions, setPredictions] = useState<Record<number, any>>({});
  const [latestComments, setLatestComments] = useState<Record<number, any>>({});

  // Filter States
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    year: null as number | null,
    status: null as string | null,
    hasRisk: false,
    minProgress: 0,
  });

  // Animation
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProjects();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  const loadProjects = async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await projectApi.getProjects();
      if (response.success) {
        const list = response.data?.data || response.data || [];
        setProjects(list);
      }
    } catch (error) {
      console.error("[ProjectsList] Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─────────────────────────────────────────────────
  // Advanced filtering logic (memoized)
  // ─────────────────────────────────────────────────
  useEffect(() => {
    let list = [...projects];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    if (activeFilters.status) {
      list = list.filter(p => p.status === activeFilters.status);
    }

    if (activeFilters.year) {
      list = list.filter(p => {
        if (!p.start_date) return false;
        return new Date(p.start_date).getFullYear() === activeFilters.year;
      });
    }

    if (activeFilters.minProgress > 0) {
      list = list.filter(p => (p.progress?.overall_percentage || 0) >= activeFilters.minProgress);
    }

    setFilteredProjects(list);
  }, [projects, searchText, activeFilters]);

  // ─────────────────────────────────────────────────
  // Lazy data loading for visible items
  // ─────────────────────────────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const visibleIds = viewableItems.map((item: any) => item.item.id);
    loadExtraDataForIds(visibleIds);
  }).current;

  const loadExtraDataForIds = async (ids: number[]) => {
    // Only load what's missing
    const idsToLoad = ids.filter(id => !monitoringData[id]);
    if (idsToLoad.length === 0) return;

    idsToLoad.forEach(async (id) => {
      try {
        const [monitoring, pred, comment] = await Promise.all([
          monitoringApi.getProjectMonitoring(id).catch(() => null),
          predictiveAnalyticsApi.getFullAnalysis(id).catch(() => null),
          projectCommentApi.getLatestComment(id).catch(() => null),
        ]);

        if (monitoring?.success) setMonitoringData(prev => ({ ...prev, [id]: monitoring.data }));
        if (pred?.success) setPredictions(prev => ({ ...prev, [id]: pred.data }));
        if (comment?.success) setLatestComments(prev => ({ ...prev, [id]: comment.data }));
      } catch (err) {
        // Silent fail for extra data
      }
    });
  };

  // ─────────────────────────────────────────────────
  // Interaction Handlers
  // ─────────────────────────────────────────────────
  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const handleDelete = (project: Project, e: any) => {
    e?.stopPropagation();
    Alert.alert("Xác nhận", `Xóa dự án ${project.code}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await projectApi.deleteProject(project.id);
            loadProjects();
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa dự án");
          }
        }
      }
    ]);
  };

  const handleEdit = (project: Project, e: any) => {
    e?.stopPropagation();
    router.push(`/projects/${project.id}/edit` as any);
  };

  // ─────────────────────────────────────────────────
  // Render Components
  // ─────────────────────────────────────────────────

  const renderFilterStrip = () => (
    <View style={styles.filterStrip}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterPill, activeFilters.status === null && styles.filterPillActive]}
          onPress={() => setActiveFilters(prev => ({ ...prev, status: null }))}
        >
          <Text style={[styles.filterPillText, activeFilters.status === null && styles.filterPillTextActive]}>Tất cả</Text>
        </TouchableOpacity>

        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterPill, activeFilters.status === key && { backgroundColor: cfg.color }]}
            onPress={() => setActiveFilters(prev => ({ ...prev, status: key }))}
          >
            <Text style={[styles.filterPillText, activeFilters.status === key && styles.filterPillTextActive]}>{cfg.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.advancedFilterBtn} onPress={() => setShowFilters(true)}>
        <Ionicons name="options-outline" size={20} color="#3B82F6" />
        {Object.values(activeFilters).some(v => v !== null && v !== 0 && v !== false) && <View style={styles.filterDot} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Dự Án"
        rightComponent={
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push("/notifications")}>
              <Ionicons name="notifications-outline" size={24} color="#3B82F6" />
              {unreadCount > 0 && <NotificationBadge count={unreadCount} size="small" style={styles.notificationBadge} />}
            </TouchableOpacity>
            <PermissionGuard permission={Permissions.PROJECT_CREATE}>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/projects/create")}>
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        }
      />

      {/* Modern Search & Filter */}
      <View style={styles.topActions}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm theo tên, mã dự án..."
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          ) : null}
        </View>
        {renderFilterStrip()}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ProjectCard
              item={item}
              monitoring={monitoringData[item.id]}
              prediction={predictions[item.id]}
              latestComment={latestComments[item.id]}
              onPress={() => router.push(`/projects/${item.id}` as any)}
              onEdit={(e) => handleEdit(item, e)}
              onDelete={(e) => handleDelete(item, e)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không tìm thấy dự án nào</Text>
            </View>
          }
        />
      )}

      {/* Advanced Filter Modal (Simplified for now) */}
      {showFilters && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc nâng cao</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.filterGroupTitle}>Theo năm bắt đầu</Text>
              <View style={styles.filterOptionsGrid}>
                {[2024, 2025, 2026].map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.optionBtn, activeFilters.year === year && styles.optionBtnActive]}
                    onPress={() => setActiveFilters(p => ({ ...p, year: p.year === year ? null : year }))}
                  >
                    <Text style={[styles.optionBtnText, activeFilters.year === year && styles.optionBtnTextActive]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterGroupTitle}>Tiến độ tối thiểu (%)</Text>
              <View style={styles.filterOptionsGrid}>
                {[0, 25, 50, 75].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.optionBtn, activeFilters.minProgress === v && styles.optionBtnActive]}
                    onPress={() => setActiveFilters(p => ({ ...p, minProgress: v }))}
                  >
                    <Text style={[styles.optionBtnText, activeFilters.minProgress === v && styles.optionBtnTextActive]}>{v}%+</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setActiveFilters({ year: null, status: null, hasRisk: false, minProgress: 0 });
                  setShowFilters(false);
                }}
              >
                <Text style={styles.resetBtnText}>Xóa tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyBtnText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },

  // Top Actions
  topActions: {
    backgroundColor: "#FFF",
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
  },
  filterStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 16,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 60,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterPillActive: {
    backgroundColor: "#1F2937",
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterPillTextActive: {
    color: "#FFF",
  },
  advancedFilterBtn: {
    position: "absolute",
    right: 0,
    top: 12,
    bottom: 12,
    width: 50,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#F3F4F6",
  },
  filterDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },

  // List & Cards
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardBadges: {
    position: "absolute",
    top: -8,
    right: 16,
    flexDirection: "row",
    gap: 6,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardStatusContainer: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  projectCode: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  projectName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  cardActionBtn: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerInfoText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  statusTag: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  commentLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    opacity: 0.8,
  },
  commentText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },

  // Modal
  modalOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 2000,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 12,
  },
  filterOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  optionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  optionBtnTextActive: {
    color: "#3B82F6",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    paddingBottom: 20,
  },
  resetBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  applyBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3B82F6",
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  },

  empty: {
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#9CA3AF",
  },
});
