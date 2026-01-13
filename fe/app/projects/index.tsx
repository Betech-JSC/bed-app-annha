import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { projectApi, Project } from "@/api/projectApi";
import { monitoringApi, ProjectMonitoringData } from "@/api/monitoringApi";
import { predictiveAnalyticsApi } from "@/api/predictiveAnalyticsApi";
import { projectCommentApi } from "@/api/projectCommentApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function ProjectsListScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoringData, setMonitoringData] = useState<Record<number, ProjectMonitoringData>>({});
  const [predictions, setPredictions] = useState<Record<number, any>>({});
  const [latestComments, setLatestComments] = useState<Record<number, any>>({});
  const [searchText, setSearchText] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showYearFilter, setShowYearFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // Advanced filter states
  const [minProgress, setMinProgress] = useState<string>("");
  const [maxProgress, setMaxProgress] = useState<string>("");
  const [startDateFrom, setStartDateFrom] = useState<string>("");
  const [startDateTo, setStartDateTo] = useState<string>("");
  const [endDateFrom, setEndDateFrom] = useState<string>("");
  const [endDateTo, setEndDateTo] = useState<string>("");
  const [hasDelayRisk, setHasDelayRisk] = useState<boolean | null>(null);
  const [hasCostRisk, setHasCostRisk] = useState<boolean | null>(null);
  const [hasOverdueTasks, setHasOverdueTasks] = useState<boolean | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProjects({ my_projects: true });
      if (response.success) {
        const projectsList = response.data?.data || response.data || [];
        setProjects(projectsList);
        applyFilters(
          projectsList,
          selectedYear,
          selectedStatus,
          searchText,
          {
            minProgress,
            maxProgress,
            startDateFrom,
            startDateTo,
            endDateFrom,
            endDateTo,
            hasDelayRisk,
            hasCostRisk,
            hasOverdueTasks,
          }
        );

        // Load monitoring data, predictions và comments cho từng project
        loadMonitoringData(projectsList);
        loadLatestComments(projectsList);
      }
    } catch (error: any) {
      console.error("Error loading projects:", error);
      if (error.response?.status === 401) {
        // Token expired - interceptor will redirect
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMonitoringData = async (projectsList: Project[]) => {
    const monitoringPromises = projectsList.map(async (project) => {
      try {
        const [monitoringResponse, predictionResponse] = await Promise.all([
          monitoringApi.getProjectMonitoring(project.id).catch(() => null),
          predictiveAnalyticsApi.getFullAnalysis(project.id).catch(() => null),
        ]);

        return {
          projectId: project.id,
          monitoring: monitoringResponse?.success ? monitoringResponse.data : null,
          prediction: predictionResponse?.success ? predictionResponse.data : null,
        };
      } catch (error) {
        return {
          projectId: project.id,
          monitoring: null,
          prediction: null,
        };
      }
    });

    const results = await Promise.all(monitoringPromises);
    const monitoringMap: Record<number, ProjectMonitoringData> = {};
    const predictionsMap: Record<number, any> = {};

    results.forEach((result) => {
      if (result.monitoring) {
        monitoringMap[result.projectId] = result.monitoring;
      }
      if (result.prediction) {
        predictionsMap[result.projectId] = result.prediction;
      }
    });

    setMonitoringData(monitoringMap);
    setPredictions(predictionsMap);
  };

  const loadLatestComments = async (projectsList: Project[]) => {
    const commentPromises = projectsList.map(async (project) => {
      try {
        const response = await projectCommentApi.getLatestComment(project.id);
        return {
          projectId: project.id,
          comment: response?.success ? response.data : null,
        };
      } catch (error) {
        return {
          projectId: project.id,
          comment: null,
        };
      }
    });

    const results = await Promise.all(commentPromises);
    const commentsMap: Record<number, any> = {};

    results.forEach((result) => {
      if (result.comment) {
        commentsMap[result.projectId] = result.comment;
      }
    });

    setLatestComments(commentsMap);
  };

  const applyFilters = (
    projectsList: Project[],
    year: number | null,
    status: string | null,
    search: string = "",
    filters: {
      minProgress?: string;
      maxProgress?: string;
      startDateFrom?: string;
      startDateTo?: string;
      endDateFrom?: string;
      endDateTo?: string;
      hasDelayRisk?: boolean | null;
      hasCostRisk?: boolean | null;
      hasOverdueTasks?: boolean | null;
    } = {}
  ) => {
    let filtered = [...projectsList];

    // Search filter - tìm theo tên, mã, mô tả
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter((project) => {
        const nameMatch = project.name?.toLowerCase().includes(searchLower);
        const codeMatch = project.code?.toLowerCase().includes(searchLower);
        const descMatch = project.description?.toLowerCase().includes(searchLower);
        return nameMatch || codeMatch || descMatch;
      });
    }

    // Filter theo năm
    if (year) {
      filtered = filtered.filter((project) => {
        if (project.start_date) {
          const projectYear = new Date(project.start_date).getFullYear();
          return projectYear === year;
        }
        return false;
      });
    }

    // Filter theo trạng thái
    if (status) {
      if (status === "in_progress") {
        filtered = filtered.filter((p) => p.status === "in_progress");
      } else if (status === "completed") {
        filtered = filtered.filter((p) => p.status === "completed");
      } else if (status === "planning") {
        filtered = filtered.filter((p) => p.status === "planning");
      } else if (status === "cancelled") {
        filtered = filtered.filter((p) => p.status === "cancelled");
      }
    }

    // Filter theo tiến độ
    if (filters.minProgress) {
      const min = parseFloat(filters.minProgress);
      if (!isNaN(min)) {
        filtered = filtered.filter((p) => {
          const progress = p.progress?.overall_percentage || 0;
          return progress >= min;
        });
      }
    }
    if (filters.maxProgress) {
      const max = parseFloat(filters.maxProgress);
      if (!isNaN(max)) {
        filtered = filtered.filter((p) => {
          const progress = p.progress?.overall_percentage || 0;
          return progress <= max;
        });
      }
    }

    // Filter theo ngày bắt đầu
    if (filters.startDateFrom) {
      const fromDate = new Date(filters.startDateFrom);
      filtered = filtered.filter((p) => {
        if (!p.start_date) return false;
        return new Date(p.start_date) >= fromDate;
      });
    }
    if (filters.startDateTo) {
      const toDate = new Date(filters.startDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => {
        if (!p.start_date) return false;
        return new Date(p.start_date) <= toDate;
      });
    }

    // Filter theo ngày kết thúc
    if (filters.endDateFrom) {
      const fromDate = new Date(filters.endDateFrom);
      filtered = filtered.filter((p) => {
        if (!p.end_date) return false;
        return new Date(p.end_date) >= fromDate;
      });
    }
    if (filters.endDateTo) {
      const toDate = new Date(filters.endDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => {
        if (!p.end_date) return false;
        return new Date(p.end_date) <= toDate;
      });
    }

    // Filter theo cảnh báo delay risk
    if (filters.hasDelayRisk !== null) {
      filtered = filtered.filter((p) => {
        const prediction = predictions[p.id];
        const hasDelay = prediction?.delay_risk?.risk_level === 'high' ||
          prediction?.delay_risk?.risk_level === 'critical' ||
          (prediction?.delay_risk?.delay_days && prediction.delay_risk.delay_days > 0);
        return filters.hasDelayRisk ? hasDelay : !hasDelay;
      });
    }

    // Filter theo cảnh báo cost risk
    if (filters.hasCostRisk !== null) {
      filtered = filtered.filter((p) => {
        const prediction = predictions[p.id];
        const hasCost = prediction?.cost_risk?.risk_level === 'high' ||
          prediction?.cost_risk?.risk_level === 'critical' ||
          (prediction?.cost_risk?.overrun_percentage && prediction.cost_risk.overrun_percentage > 0);
        return filters.hasCostRisk ? hasCost : !hasCost;
      });
    }

    // Filter theo overdue tasks
    if (filters.hasOverdueTasks !== null) {
      filtered = filtered.filter((p) => {
        const monitoring = monitoringData[p.id];
        const hasOverdue = (monitoring?.metrics?.overdue_tasks || 0) > 0;
        return filters.hasOverdueTasks ? hasOverdue : !hasOverdue;
      });
    }

    setFilteredProjects(filtered);
  };

  useEffect(() => {
    applyFilters(
      projects,
      selectedYear,
      selectedStatus,
      searchText,
      {
        minProgress,
        maxProgress,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
        hasDelayRisk,
        hasCostRisk,
        hasOverdueTasks,
      }
    );
  }, [
    selectedYear,
    selectedStatus,
    projects,
    searchText,
    minProgress,
    maxProgress,
    startDateFrom,
    startDateTo,
    endDateFrom,
    endDateTo,
    hasDelayRisk,
    hasCostRisk,
    hasOverdueTasks,
    predictions,
    monitoringData,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "#10B981";
      case "completed":
        return "#3B82F6";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "planning":
        return "Lập kế hoạch";
      case "in_progress":
        return "Đang thi công";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const handleEdit = (project: Project, e: any) => {
    e?.stopPropagation?.();
    router.push(`/projects/${project.id}/edit`);
  };

  const handleDelete = async (project: Project, e: any) => {
    e?.stopPropagation?.();
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa dự án "${project.name}"? Hành động này không thể hoàn tác.`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await projectApi.deleteProject(project.id);
              Alert.alert("Thành công", "Dự án đã được xóa.");
              loadProjects();
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể xóa dự án."
              );
            }
          },
        },
      ]
    );
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const monitoring = monitoringData[item.id];
    const prediction = predictions[item.id];
    const latestComment = latestComments[item.id];

    // Tính toán các indicators
    const hasDelayRisk = prediction?.delay_risk?.risk_level === 'high' || prediction?.delay_risk?.risk_level === 'critical';
    const hasCostRisk = prediction?.cost_risk?.risk_level === 'high' || prediction?.cost_risk?.risk_level === 'critical';
    const highRisksCount = monitoring?.metrics?.high_risks || 0;
    const alertsCount = monitoring?.alerts?.length || 0;
    const overdueTasks = monitoring?.metrics?.overdue_tasks || 0;

    // Tính toán giá trị hiển thị
    const delayDays = prediction?.delay_risk?.delay_days || 0;
    const delayDaysText = typeof delayDays === 'number' ? delayDays.toFixed(2) : delayDays;
    const overrunPercentage = prediction?.cost_risk?.overrun_percentage;
    const overrunPercentageText = overrunPercentage != null && typeof overrunPercentage === 'number' && overrunPercentage > 0
      ? overrunPercentage.toFixed(1)
      : null;

    // Tính overall risk
    const overallRisk = prediction?.overall_risk_level || 'low';
    const showWarning = hasDelayRisk || hasCostRisk || highRisksCount > 0 || alertsCount > 0 || overdueTasks > 0;

    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => router.push(`/projects/${item.id}`)}
      >


        <View style={styles.projectHeader}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{item.name}</Text>
            <Text style={styles.projectCode}>{item.code}</Text>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.status) },
                ]}
              >
                {getStatusText(item.status)}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <PermissionGuard permission="projects.update">
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => handleEdit(item, e)}
                >
                  <Ionicons name="create-outline" size={18} color="#3B82F6" />
                </TouchableOpacity>
              </PermissionGuard>
              <PermissionGuard permission="projects.delete">
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => handleDelete(item, e)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </PermissionGuard>
            </View>
          </View>
        </View>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.projectFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.footerText}>
              {item.start_date
                ? new Date(item.start_date).toLocaleDateString("vi-VN")
                : "Chưa có"}
            </Text>
          </View>
          {item.progress && (
            <View style={[styles.footerItem, styles.progressItem]}>
              <Ionicons name="trending-up-outline" size={18} color="#3B82F6" />
              <Text style={styles.progressText}>
                {item.progress.overall_percentage}%
              </Text>
            </View>
          )}

          {/* Tổng thời gian thi công */}
          {item.start_date && item.end_date && (
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.footerText}>
                {Math.ceil((new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / (1000 * 60 * 60 * 24))} ngày
              </Text>
            </View>
          )}
        </View>

        {/* Cảnh báo - Hiển thị từng loại riêng biệt với icon và màu phù hợp */}
        {(delayDays > 0 || overrunPercentageText || (monitoring?.metrics?.overdue_tasks > 0)) && (
          <View style={styles.warningsContainer}>
            {delayDays > 0 && (
              <View style={[styles.warningItem, styles.warningItemDelay]}>
                <Ionicons name="time" size={16} color="#DC2626" />
                <Text style={[styles.warningItemText, { color: "#991B1B" }]}>
                  Chậm {delayDaysText} ngày
                </Text>
              </View>
            )}
            {overrunPercentageText && (
              <View style={[styles.warningItem, styles.warningItemCost]}>
                <Ionicons name="cash" size={16} color="#D97706" />
                <Text style={[styles.warningItemText, { color: "#92400E" }]}>
                  Vượt {overrunPercentageText}%
                </Text>
              </View>
            )}
            {monitoring && monitoring.metrics && monitoring.metrics.overdue_tasks > 0 && (
              <View style={[styles.warningItem, styles.warningItemOverdue]}>
                <Ionicons name="calendar" size={16} color="#EA580C" />
                <Text style={[styles.warningItemText, { color: "#9A3412" }]}>
                  {monitoring.metrics.overdue_tasks} việc quá hạn
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Comment mới nhất */}
        {latestComment && (
          <TouchableOpacity
            style={styles.commentSection}
            onPress={() => router.push(`/projects/${item.id}`)}
          >
            <View style={styles.commentHeader}>
              <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
              <Text style={styles.commentLabel}>Bình luận mới nhất:</Text>
            </View>
            <View style={styles.commentContent}>
              <Text style={styles.commentAuthor}>
                {latestComment.user?.name || "Người dùng"}
              </Text>
              <Text style={styles.commentText} numberOfLines={2}>
                {latestComment.content}
              </Text>
              <Text style={styles.commentTime}>
                {new Date(latestComment.created_at).toLocaleDateString("vi-VN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const clearAllFilters = () => {
    setSearchText("");
    setSelectedYear(null);
    setSelectedStatus(null);
    setMinProgress("");
    setMaxProgress("");
    setStartDateFrom("");
    setStartDateTo("");
    setEndDateFrom("");
    setEndDateTo("");
    setHasDelayRisk(null);
    setHasCostRisk(null);
    setHasOverdueTasks(null);
  };

  const hasActiveFilters = () => {
    return !!(
      searchText ||
      selectedYear ||
      selectedStatus ||
      minProgress ||
      maxProgress ||
      startDateFrom ||
      startDateTo ||
      endDateFrom ||
      endDateTo ||
      hasDelayRisk !== null ||
      hasCostRisk !== null ||
      hasOverdueTasks !== null
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Danh Sách Dự Án"
        rightComponent={
          <View style={styles.headerActions}>
            {/* Filter Buttons */}
            <TouchableOpacity
              style={[styles.filterButton, selectedYear && styles.filterButtonActive]}
              onPress={() => setShowYearFilter(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={selectedYear ? "#FFFFFF" : "#3B82F6"} />
              {selectedYear && <Text style={styles.filterButtonText}>{selectedYear}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedStatus && styles.filterButtonActive]}
              onPress={() => setShowStatusFilter(true)}
            >
              <Ionicons name="filter-outline" size={20} color={selectedStatus ? "#FFFFFF" : "#3B82F6"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
              onPress={() => setShowAdvancedFilter(true)}
            >
              <Ionicons name="options-outline" size={20} color={hasActiveFilters() ? "#FFFFFF" : "#3B82F6"} />
            </TouchableOpacity>
            <PermissionGuard permission="projects.create">
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/projects/create")}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên, mã, mô tả..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Year Filter Modal */}
      {showYearFilter && (
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Chọn Năm</Text>
              <TouchableOpacity onPress={() => setShowYearFilter(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedYear(null);
                setShowYearFilter(false);
              }}
            >
              <Text style={!selectedYear ? styles.filterOptionActive : styles.filterOptionText}>
                Tất cả
              </Text>
            </TouchableOpacity>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <TouchableOpacity
                key={year}
                style={styles.filterOption}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearFilter(false);
                }}
              >
                <Text style={selectedYear === year ? styles.filterOptionActive : styles.filterOptionText}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Status Filter Modal */}
      {showStatusFilter && (
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Lọc Theo Trạng Thái</Text>
              <TouchableOpacity onPress={() => setShowStatusFilter(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedStatus(null);
                setShowStatusFilter(false);
              }}
            >
              <Text style={!selectedStatus ? styles.filterOptionActive : styles.filterOptionText}>
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedStatus("planning");
                setShowStatusFilter(false);
              }}
            >
              <Text style={selectedStatus === "planning" ? styles.filterOptionActive : styles.filterOptionText}>
                Lập kế hoạch
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedStatus("in_progress");
                setShowStatusFilter(false);
              }}
            >
              <Text style={selectedStatus === "in_progress" ? styles.filterOptionActive : styles.filterOptionText}>
                Đang thi công
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedStatus("completed");
                setShowStatusFilter(false);
              }}
            >
              <Text style={selectedStatus === "completed" ? styles.filterOptionActive : styles.filterOptionText}>
                Đã hoàn thành
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedStatus("cancelled");
                setShowStatusFilter(false);
              }}
            >
              <Text style={selectedStatus === "cancelled" ? styles.filterOptionActive : styles.filterOptionText}>
                Đã hủy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Advanced Filter Modal */}
      {showAdvancedFilter && (
        <View style={styles.filterModalOverlay}>
          <View style={[styles.filterModal, styles.advancedFilterModal]}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Bộ Lọc Nâng Cao</Text>
              <TouchableOpacity onPress={() => setShowAdvancedFilter(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.advancedFilterContent} showsVerticalScrollIndicator={false}>
              {/* Tiến độ */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Tiến độ (%)</Text>
                <View style={styles.rangeInputContainer}>
                  <View style={styles.rangeInput}>
                    <Text style={styles.rangeLabel}>Từ:</Text>
                    <TextInput
                      style={styles.rangeInputField}
                      placeholder="0"
                      keyboardType="numeric"
                      value={minProgress}
                      onChangeText={setMinProgress}
                    />
                  </View>
                  <View style={styles.rangeInput}>
                    <Text style={styles.rangeLabel}>Đến:</Text>
                    <TextInput
                      style={styles.rangeInputField}
                      placeholder="100"
                      keyboardType="numeric"
                      value={maxProgress}
                      onChangeText={setMaxProgress}
                    />
                  </View>
                </View>
              </View>

              {/* Ngày bắt đầu */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Ngày bắt đầu</Text>
                <View style={styles.dateInputContainer}>
                  <View style={styles.dateInput}>
                    <Text style={styles.dateLabel}>Từ:</Text>
                    <TextInput
                      style={styles.dateInputField}
                      placeholder="YYYY-MM-DD"
                      value={startDateFrom}
                      onChangeText={setStartDateFrom}
                    />
                  </View>
                  <View style={styles.dateInput}>
                    <Text style={styles.dateLabel}>Đến:</Text>
                    <TextInput
                      style={styles.dateInputField}
                      placeholder="YYYY-MM-DD"
                      value={startDateTo}
                      onChangeText={setStartDateTo}
                    />
                  </View>
                </View>
              </View>

              {/* Ngày kết thúc */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Ngày kết thúc</Text>
                <View style={styles.dateInputContainer}>
                  <View style={styles.dateInput}>
                    <Text style={styles.dateLabel}>Từ:</Text>
                    <TextInput
                      style={styles.dateInputField}
                      placeholder="YYYY-MM-DD"
                      value={endDateFrom}
                      onChangeText={setEndDateFrom}
                    />
                  </View>
                  <View style={styles.dateInput}>
                    <Text style={styles.dateLabel}>Đến:</Text>
                    <TextInput
                      style={styles.dateInputField}
                      placeholder="YYYY-MM-DD"
                      value={endDateTo}
                      onChangeText={setEndDateTo}
                    />
                  </View>
                </View>
              </View>

              {/* Cảnh báo */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Cảnh báo</Text>
                <TouchableOpacity
                  style={[styles.toggleOption, hasDelayRisk === true && styles.toggleOptionActive]}
                  onPress={() => setHasDelayRisk(hasDelayRisk === true ? null : true)}
                >
                  <Text style={[styles.toggleOptionText, hasDelayRisk === true && styles.toggleOptionTextActive]}>
                    Có cảnh báo chậm tiến độ
                  </Text>
                  {hasDelayRisk === true && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, hasCostRisk === true && styles.toggleOptionActive]}
                  onPress={() => setHasCostRisk(hasCostRisk === true ? null : true)}
                >
                  <Text style={[styles.toggleOptionText, hasCostRisk === true && styles.toggleOptionTextActive]}>
                    Có cảnh báo vượt ngân sách
                  </Text>
                  {hasCostRisk === true && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, hasOverdueTasks === true && styles.toggleOptionActive]}
                  onPress={() => setHasOverdueTasks(hasOverdueTasks === true ? null : true)}
                >
                  <Text style={[styles.toggleOptionText, hasOverdueTasks === true && styles.toggleOptionTextActive]}>
                    Có công việc quá hạn
                  </Text>
                  {hasOverdueTasks === true && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={[styles.filterActionButton, styles.clearButton]}
                  onPress={() => {
                    clearAllFilters();
                    setShowAdvancedFilter(false);
                  }}
                >
                  <Text style={styles.clearButtonText}>Xóa tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterActionButton, styles.applyButton]}
                  onPress={() => setShowAdvancedFilter(false)}
                >
                  <Text style={styles.applyButtonText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      <FlatList
        data={filteredProjects.length > 0 ? filteredProjects : projects}
        renderItem={renderProjectItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {hasActiveFilters() ? "Không tìm thấy dự án phù hợp" : "Chưa có dự án nào"}
            </Text>
            {hasActiveFilters() && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearAllFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
            {!hasActiveFilters() && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/projects/create")}
              >
                <Text style={styles.emptyButtonText}>Tạo dự án mới</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  projectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
    overflow: "visible",
  },
  monitoringIndicators: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    zIndex: 10,
  },
  indicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  indicatorBadgeCritical: {
    backgroundColor: "#DC2626",
  },
  indicatorBadgeHigh: {
    backgroundColor: "#EF4444",
  },
  indicatorBadgeAlert: {
    backgroundColor: "#F59E0B",
  },
  indicatorBadgeOverdue: {
    backgroundColor: "#F97316",
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  quickMonitoring: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  quickInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  quickInfoText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    padding: 6,
  },
  projectName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  projectCode: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  progressItem: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  filterModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "80%",
    maxHeight: "60%",
    padding: 20,
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  filterOptionText: {
    fontSize: 16,
    color: "#1F2937",
  },
  filterOptionActive: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  warningsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  warningItemDelay: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  warningItemCost: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  warningItemOverdue: {
    backgroundColor: "#FFEDD5",
    borderColor: "#FDBA74",
  },
  warningItemText: {
    fontSize: 12,
    fontWeight: "600",
  },
  commentSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  commentContent: {
    marginLeft: 22,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 6,
  },
  commentTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  advancedFilterModal: {
    maxHeight: "80%",
    width: "90%",
  },
  advancedFilterContent: {
    maxHeight: 500,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  rangeInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rangeLabel: {
    fontSize: 14,
    color: "#6B7280",
    minWidth: 40,
  },
  rangeInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  dateInputContainer: {
    gap: 12,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: "#6B7280",
    minWidth: 50,
  },
  dateInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  toggleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  toggleOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  toggleOptionText: {
    fontSize: 14,
    color: "#1F2937",
  },
  toggleOptionTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  filterActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#F3F4F6",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  applyButton: {
    backgroundColor: "#3B82F6",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clearFiltersButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  clearFiltersButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
});
