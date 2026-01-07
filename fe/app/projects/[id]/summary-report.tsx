import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  projectSummaryReportApi,
  ProjectSummaryReport,
  CostDetailItem,
} from "@/api/projectSummaryReportApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function ProjectSummaryReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [report, setReport] = useState<ProjectSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCostDetailsModal, setShowCostDetailsModal] = useState(false);
  const [showCostTypeSelectorModal, setShowCostTypeSelectorModal] = useState(false);
  const [costDetailsType, setCostDetailsType] = useState<
    "material" | "equipment" | "subcontractor" | "labor"
  >("material");
  const [costDetails, setCostDetails] = useState<CostDetailItem[]>([]);
  const [loadingCostDetails, setLoadingCostDetails] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await projectSummaryReportApi.getSummaryReport(id!);
      if (response.success) {
        setReport(response.data);
      }
    } catch (error) {
      console.error("Error loading summary report:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const handleViewCostDetails = async (
    type: "material" | "equipment" | "subcontractor" | "labor"
  ) => {
    setCostDetailsType(type);
    setShowCostDetailsModal(true);
    setLoadingCostDetails(true);

    try {
      const response = await projectSummaryReportApi.getCostDetails(id!, type);
      if (response.success) {
        setCostDetails(response.data || []);
      }
    } catch (error) {
      console.error("Error loading cost details:", error);
    } finally {
      setLoadingCostDetails(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getCostTypeLabel = (
    type: "material" | "equipment" | "subcontractor" | "labor"
  ) => {
    switch (type) {
      case "material":
        return "Chi phí vật liệu";
      case "equipment":
        return "Chi phí thuê thiết bị";
      case "subcontractor":
        return "Chi phí thầu phụ";
      case "labor":
        return "Nhân công khoán";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Báo Cáo Tổng Hợp" showBackButton />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Không có dữ liệu báo cáo</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Báo Cáo Tổng Hợp" showBackButton />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Giá trị hợp đồng - Chỉ hiển thị 1 lần */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Giá Trị Hợp Đồng</Text>
          </View>
          <Text style={styles.contractValue}>
            {formatCurrency(report.contract_value)}
          </Text>
        </View>

        {/* Tổng chi phí - Click để xem chi tiết */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => setShowCostTypeSelectorModal(true)}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="calculator" size={24} color="#EF4444" />
            <Text style={styles.cardTitle}>Tổng Chi Phí Công Trình</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
          <Text style={styles.totalCostValue}>
            {formatCurrency(report.total_project_costs)}
          </Text>
          <View style={styles.costBreakdown}>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Chi phí vật liệu</Text>
              <Text style={styles.costAmount}>
                {formatCurrency(report.cost_details.material_costs)}
              </Text>
            </View>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Chi phí thuê thiết bị</Text>
              <Text style={styles.costAmount}>
                {formatCurrency(report.cost_details.equipment_rental_costs)}
              </Text>
            </View>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Chi phí thầu phụ</Text>
              <Text style={styles.costAmount}>
                {formatCurrency(report.cost_details.subcontractor_costs)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>


        {/* Lợi nhuận */}
        <View style={[styles.card, styles.profitCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Lợi Nhuận</Text>
          </View>
          <Text
            style={[
              styles.profitValue,
              { color: report.profit >= 0 ? "#10B981" : "#EF4444" },
            ]}
          >
            {formatCurrency(report.profit)}
          </Text>
          <Text style={styles.profitMargin}>
            Tỷ lệ lợi nhuận: {formatPercentage(report.profit_margin)}
          </Text>
        </View>
      </ScrollView>

      {/* Modal chọn loại chi phí */}
      <Modal
        visible={showCostTypeSelectorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCostTypeSelectorModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCostTypeSelectorModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn loại chi phí để xem chi tiết</Text>
              <TouchableOpacity
                onPress={() => setShowCostTypeSelectorModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.costTypeSelector}>
              <TouchableOpacity
                style={styles.costTypeOption}
                onPress={() => {
                  setShowCostTypeSelectorModal(false);
                  handleViewCostDetails("material");
                }}
              >
                <Ionicons name="cube-outline" size={24} color="#3B82F6" />
                <View style={styles.costTypeOptionContent}>
                  <Text style={styles.costTypeOptionTitle}>Chi phí vật liệu</Text>
                  <Text style={styles.costTypeOptionAmount}>
                    {formatCurrency(report.cost_details.material_costs)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.costTypeOption}
                onPress={() => {
                  setShowCostTypeSelectorModal(false);
                  handleViewCostDetails("equipment");
                }}
              >
                <Ionicons name="construct-outline" size={24} color="#F59E0B" />
                <View style={styles.costTypeOptionContent}>
                  <Text style={styles.costTypeOptionTitle}>Chi phí thuê thiết bị</Text>
                  <Text style={styles.costTypeOptionAmount}>
                    {formatCurrency(report.cost_details.equipment_rental_costs)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.costTypeOption}
                onPress={() => {
                  setShowCostTypeSelectorModal(false);
                  handleViewCostDetails("subcontractor");
                }}
              >
                <Ionicons name="business-outline" size={24} color="#10B981" />
                <View style={styles.costTypeOptionContent}>
                  <Text style={styles.costTypeOptionTitle}>Chi phí thầu phụ</Text>
                  <Text style={styles.costTypeOptionAmount}>
                    {formatCurrency(report.cost_details.subcontractor_costs)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal chi tiết chi phí */}
      <Modal
        visible={showCostDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCostDetailsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCostDetailsModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {getCostTypeLabel(costDetailsType)}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCostDetailsModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {loadingCostDetails ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : costDetails.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="document-outline" size={48} color="#9CA3AF" />
                <Text style={styles.modalEmptyText}>
                  Không có dữ liệu chi phí
                </Text>
              </View>
            ) : (
              <FlatList
                data={costDetails}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.costDetailItem}>
                    <View style={styles.costDetailHeader}>
                      <Text style={styles.costDetailName}>{item.name}</Text>
                      <Text style={styles.costDetailAmount}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                    {item.cost_date && (
                      <Text style={styles.costDetailDate}>
                        Ngày: {new Date(item.cost_date).toLocaleDateString("vi-VN")}
                      </Text>
                    )}
                    {item.description && (
                      <Text style={styles.costDetailDescription}>
                        {item.description}
                      </Text>
                    )}
                    {/* Additional info based on type */}
                    {item.material && (
                      <View style={styles.additionalInfo}>
                        <Text style={styles.additionalInfoText}>
                          Vật liệu: {item.material.name} ({item.material.quantity}{" "}
                          {item.material.unit})
                        </Text>
                      </View>
                    )}
                    {item.equipment && (
                      <View style={styles.additionalInfo}>
                        <Text style={styles.additionalInfoText}>
                          Thiết bị: {item.equipment.name} (SL: {item.equipment.quantity})
                        </Text>
                      </View>
                    )}
                    {item.subcontractor && (
                      <View style={styles.additionalInfo}>
                        <Text style={styles.additionalInfoText}>
                          Nhà thầu: {item.subcontractor.name}
                        </Text>
                      </View>
                    )}
                    {item.time_tracking?.user && (
                      <View style={styles.additionalInfo}>
                        <Text style={styles.additionalInfoText}>
                          Nhân viên: {item.time_tracking.user.name}
                        </Text>
                        {item.time_tracking.check_in_at && (
                          <Text style={styles.additionalInfoText}>
                            Thời gian: {item.time_tracking.check_in_at}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
                style={styles.costDetailsList}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  contractValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3B82F6",
  },
  totalCostValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#EF4444",
    marginBottom: 16,
  },
  costBreakdown: {
    gap: 12,
  },
  costItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  costLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  costAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  salaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  salaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F59E0B",
    marginBottom: 8,
  },
  salaryNote: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  badge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#92400E",
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  profitValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  profitMargin: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
  },
  modalEmpty: {
    padding: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  costDetailsList: {
    maxHeight: 500,
  },
  costDetailItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  costDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  costDetailName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 12,
  },
  costDetailAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  costDetailDate: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  costDetailDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  additionalInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  additionalInfoText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  costTypeSelector: {
    padding: 16,
  },
  costTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  costTypeOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  costTypeOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  costTypeOptionAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
});



