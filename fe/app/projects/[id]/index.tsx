import React, { useState, useEffect } from "react";
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
import { projectApi, Project } from "@/api/projectApi";
import { contractApi, Contract } from "@/api/contractApi";
import { monitoringApi, ProjectMonitoringData } from "@/api/monitoringApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [project, setProject] = useState<Project | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [monitoringData, setMonitoringData] = useState<ProjectMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContract, setLoadingContract] = useState(false);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);

  useEffect(() => {
    loadProject();
    loadContract();
    loadMonitoring();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProject(id!);
      if (response.success) {
        setProject(response.data);
      }
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadContract = async () => {
    try {
      setLoadingContract(true);
      const response = await contractApi.getContract(id!);
      if (response.success && response.data) {
        setContract(response.data);
      } else {
        setContract(null);
      }
    } catch (error: any) {
      // 404 is expected if contract doesn't exist
      if (error.response?.status !== 404) {
        console.error("Error loading contract:", error);
      }
      setContract(null);
    } finally {
      setLoadingContract(false);
    }
  };

  const loadMonitoring = async () => {
    try {
      setLoadingMonitoring(true);
      const response = await monitoringApi.getProjectMonitoring(id!);
      if (response.success) {
        setMonitoringData(response.data);
      }
    } catch (error) {
      console.error("Error loading monitoring data:", error);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numValue);
  };

  const handleEdit = () => {
    router.push(`/projects/${id}/edit`);
  };

  const handleDelete = () => {
    if (!project) return;
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
              Alert.alert("Thành công", "Dự án đã được xóa.", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
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

  const menuItems = [
    {
      title: "Báo Cáo Tổng Hợp",
      icon: "trending-up-outline",
      route: `/projects/${id}/revenue`,
      color: "#10B981",
    },
    {
      title: "Giá Trị Hợp Đồng",
      icon: "document-text-outline",
      route: `/projects/${id}/contract`,
      color: "#3B82F6",
    },
    {
      title: "Đã Thanh Toán",
      icon: "cash-outline",
      route: `/projects/${id}/payments`,
      color: "#10B981",
    },
    {
      title: "Phát Sinh Ngoài Báo Giá",
      icon: "add-circle-outline",
      route: `/projects/${id}/additional-costs`,
      color: "#F59E0B",
    },
    {
      title: "Chi Phí Dự Án",
      icon: "calculator-outline",
      route: `/projects/${id}/costs`,
      color: "#8B5CF6",
    },
    {
      title: "Ngân Sách Dự Án",
      icon: "wallet-outline",
      route: `/projects/${id}/budget`,
      color: "#10B981",
    },
    {
      title: "Hóa Đơn",
      icon: "receipt-outline",
      route: `/projects/${id}/invoices`,
      color: "#3B82F6",
    },
    {
      title: "Nhân Sự Tham Gia",
      icon: "people-outline",
      route: `/projects/${id}/personnel`,
      color: "#EC4899",
    },
    {
      title: "Nhà Thầu Phụ",
      icon: "business-outline",
      route: `/projects/${id}/subcontractors`,
      color: "#06B6D4",
    },
    {
      title: "Vật Liệu",
      icon: "cube-outline",
      route: `/projects/${id}/materials`,
      color: "#F59E0B",
    },
    {
      title: "Thiết Bị",
      icon: "build-outline",
      route: `/projects/${id}/equipment`,
      color: "#8B5CF6",
    },
    {
      title: "Hồ Sơ & Tài Liệu",
      icon: "folder-outline",
      route: `/projects/${id}/documents`,
      color: "#6366F1",
    },
    {
      title: "Nhật Ký Công Trình",
      icon: "calendar-outline",
      route: `/projects/${id}/logs`,
      color: "#14B8A6",
    },
    {
      title: "Nghiệm Thu",
      icon: "checkmark-circle-outline",
      route: `/projects/${id}/acceptance`,
      color: "#22C55E",
    },
    {
      title: "Lỗi Ghi Nhận",
      icon: "warning-outline",
      route: `/projects/${id}/defects`,
      color: "#EF4444",
    },
    {
      title: "Tiến Độ Thi Công",
      icon: "trending-up-outline",
      route: `/projects/${id}/progress`,
      color: "#F97316",
    },
    {
      title: "Giám Sát Dự Án",
      icon: "eye-outline",
      route: `/projects/${id}/monitoring`,
      color: "#8B5CF6",
    },
    {
      title: "EVM Analysis",
      icon: "analytics-outline",
      route: `/projects/${id}/evm`,
      color: "#06B6D4",
    },
    {
      title: "Dự Đoán & Phân Tích",
      icon: "trending-up-outline",
      route: `/projects/${id}/predictions`,
      color: "#F59E0B",
    },
    {
      title: "Quản Lý Rủi Ro",
      icon: "shield-outline",
      route: `/projects/${id}/risks`,
      color: "#EF4444",
    },
    {
      title: "Yêu Cầu Thay Đổi",
      icon: "document-text-outline",
      route: `/projects/${id}/change-requests`,
      color: "#6366F1",
    },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy dự án</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: tabBarHeight }}>
      <ScreenHeader
        title="Chi Tiết Dự Án"
        showBackButton
        rightComponent={
          <View style={styles.headerActions}>
            <PermissionGuard permission="projects.update">
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleEdit}
              >
                <Ionicons name="create-outline" size={24} color="#3B82F6" />
              </TouchableOpacity>
            </PermissionGuard>
            <PermissionGuard permission="projects.delete">
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        }
      />

      {/* Contract Value Card */}
      {contract && contract.contract_value && (
        <View style={styles.contractCard}>
          <View style={styles.contractCardHeader}>
            <View style={styles.contractCardIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#3B82F6" />
            </View>
            <View style={styles.contractCardInfo}>
              <Text style={styles.contractCardLabel}>Giá Trị Hợp Đồng</Text>
              <Text style={styles.contractCardValue}>
                {formatCurrency(contract.contract_value)} VNĐ
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.contractCardButton}
            onPress={() => router.push(`/projects/${id}/contract`)}
          >
            <Text style={styles.contractCardButtonText}>Xem chi tiết</Text>
            <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.projectInfo}>
        <View style={styles.projectHeader}>
          <View style={styles.projectTitleSection}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectCode}>{project.code}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  project.status === "in_progress"
                    ? "#10B98120"
                    : project.status === "completed"
                      ? "#3B82F620"
                      : "#6B728020",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    project.status === "in_progress"
                      ? "#10B981"
                      : project.status === "completed"
                        ? "#3B82F6"
                        : "#6B7280",
                },
              ]}
            >
              {project.status === "in_progress"
                ? "Đang thi công"
                : project.status === "completed"
                  ? "Hoàn thành"
                  : "Lập kế hoạch"}
            </Text>
          </View>
        </View>

        {project.description && (
          <Text style={styles.description}>{project.description}</Text>
        )}

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Khách hàng</Text>
            <Text style={styles.infoValue}>
              {project.customer?.name || "N/A"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Ngày bắt đầu</Text>
            <Text style={styles.infoValue}>
              {project.start_date
                ? new Date(project.start_date).toLocaleDateString("vi-VN")
                : "Chưa có"}
            </Text>
          </View>
          {contract && contract.contract_value && (
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Giá trị hợp đồng</Text>
              <Text style={styles.infoValue}>
                {formatCurrency(contract.contract_value)} VNĐ
              </Text>
            </View>
          )}
        </View>

        {project.progress && (
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>Tiến độ tổng thể</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${project.progress.overall_percentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {project.progress.overall_percentage}%
            </Text>
          </View>
        )}
      </View>

      {/* Monitoring Alerts */}
      {monitoringData && monitoringData.alerts && monitoringData.alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.alertsHeader}>
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
            <Text style={styles.alertsTitle}>Cảnh báo ({monitoringData.alerts.length})</Text>
          </View>
          {monitoringData.alerts.slice(0, 3).map((alert, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.alertCard,
                {
                  borderLeftColor:
                    alert.severity === "critical"
                      ? "#DC2626"
                      : alert.severity === "high"
                        ? "#EF4444"
                        : "#F59E0B",
                },
              ]}
              onPress={() => {
                if (alert.type === "risk") {
                  router.push(`/projects/${id}/risks`);
                } else if (alert.type === "change_request") {
                  router.push(`/projects/${id}/change-requests`);
                } else if (alert.type === "delay" || alert.type === "deadline") {
                  router.push(`/projects/${id}/monitoring`);
                } else if (alert.type === "budget") {
                  router.push(`/projects/${id}/budget`);
                } else {
                  router.push(`/projects/${id}/monitoring`);
                }
              }}
            >
              <View style={styles.alertContent}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertType}>{alert.type}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
          {monitoringData.alerts.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllAlerts}
              onPress={() => router.push(`/projects/${id}/monitoring`)}
            >
              <Text style={styles.viewAllText}>Xem tất cả cảnh báo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Quản Lý Dự Án</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => router.push(item.route)}
          >
            <View
              style={[styles.menuIconContainer, { backgroundColor: item.color + "20" }]}
            >
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.menuItemText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionButton: {
    padding: 4,
  },
  projectInfo: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  projectTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 24,
    fontWeight: "700",
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
    lineHeight: 20,
    marginBottom: 16,
  },
  contractCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contractCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  contractCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F620",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contractCardInfo: {
    flex: 1,
  },
  contractCardLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  contractCardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  contractCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  contractCardButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    marginRight: 4,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressCard: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B82F6",
    textAlign: "center",
  },
  menuSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  alertsSection: {
    padding: 16,
    paddingTop: 0,
  },
  alertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  alertType: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  viewAllAlerts: {
    paddingVertical: 12,
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
});
