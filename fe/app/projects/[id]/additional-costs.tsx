import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { additionalCostApi, AdditionalCost } from "@/api/additionalCostApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionGuard, PermissionDenied, UniversalFileUploader, UploadedFile } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function AdditionalCostsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [costs, setCosts] = useState<AdditionalCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  const [processingItems, setProcessingItems] = useState<Set<number>>(new Set());
  const { hasPermission } = useProjectPermissions(id);

  // Mark Paid Modal state
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedCostId, setSelectedCostId] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCosts();
  }, [id]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCosts();
    }, [id])
  );

  const loadCosts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setPermissionDenied(false);
      const response = await additionalCostApi.getAdditionalCosts(id!);
      if (response.success) {
        setCosts(response.data || []);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem chi phí phát sinh của dự án này.");
      } else {
        console.error("Error loading costs:", error);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };


  const handleConfirm = async (costId: number) => {
    // Prevent double tapping
    if (processingItems.has(costId)) return;

    try {
      setProcessingItems(prev => new Set(prev).add(costId));
      const response = await additionalCostApi.confirmAdditionalCost(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận đã nhận tiền.");
        loadCosts(false);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(costId);
        return next;
      });
    }
  };

  const handleApprove = async (costId: number) => {
    if (processingItems.has(costId)) return;

    try {
      setProcessingItems(prev => new Set(prev).add(costId));
      const response = await additionalCostApi.approveAdditionalCost(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Chi phí phát sinh đã được duyệt.");
        loadCosts(false);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(costId);
        return next;
      });
    }
  };

  const handleMarkPaid = (costId: number) => {
    setSelectedCostId(costId);
    setUploadedFiles([]);
    setShowMarkPaidModal(true);
  };

  const submitMarkPaid = async () => {
    if (uploadedFiles.length === 0) {
      Alert.alert("Lỗi", "Vui lòng tải lên chứng từ thanh toán (bắt buộc)");
      return;
    }

    if (!selectedCostId) return;

    try {
      setIsSubmitting(true);
      const attachmentIds = uploadedFiles
        .map((f) => f.id || f.attachment_id)
        .filter((id): id is number => !!id);

      const response = await additionalCostApi.markAsPaidByCustomer(id!, selectedCostId, {
        paid_date: new Date().toISOString().split("T")[0],
        attachment_ids: attachmentIds,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.");
        setShowMarkPaidModal(false);
        loadCosts(false);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "approved":
        return "#10B981";
      case "customer_paid":
        return "#3B82F6";
      case "pending":
      case "pending_approval":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";
      case "customer_paid":
        return "Khách đã thanh toán";
      case "confirmed":
        return "Đã nhận tiền";
      case "pending_approval":
        return "Chờ duyệt";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const renderCostItem = ({ item }: { item: AdditionalCost }) => (
    <TouchableOpacity
      style={styles.costCard}
      onPress={() => router.push(`/projects/${id}/additional-costs/${item.id}`)}
    >
      <View style={styles.costHeader}>
        <Text style={styles.costAmount}>{formatCurrency(item.amount)}</Text>
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
      </View>
      <Text style={styles.costDescription} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Hiển thị số lượng file đính kèm */}
      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentsBadge}>
          <Ionicons name="attach" size={14} color="#6B7280" />
          <Text style={styles.attachmentsText}>
            {item.attachments.length} file đính kèm
          </Text>
        </View>
      )}

      {item.status === "pending" && hasPermission(Permissions.ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER) && (
        <TouchableOpacity
          style={[styles.markPaidButton, processingItems.has(item.id) && { opacity: 0.7 }]}
          onPress={(e) => {
            e.stopPropagation();
            handleMarkPaid(item.id);
          }}
          disabled={processingItems.has(item.id)}
        >
          {processingItems.has(item.id) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.markPaidButtonText}>Đã thanh toán</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Kế toán xác nhận đã nhận tiền */}
      {item.status === "customer_paid" && hasPermission(Permissions.ADDITIONAL_COST_CONFIRM) && (
        <TouchableOpacity
          style={[styles.confirmButton, processingItems.has(item.id) && { opacity: 0.7 }]}
          onPress={(e) => {
            e.stopPropagation();
            handleConfirm(item.id);
          }}
          disabled={processingItems.has(item.id)}
        >
          {processingItems.has(item.id) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Xác nhận đã nhận tiền</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Backward compatible: pending_approval → approve */}
      {item.status === "pending_approval" && hasPermission(Permissions.ADDITIONAL_COST_APPROVE) && (
        <TouchableOpacity
          style={[styles.approveButton, processingItems.has(item.id) && { opacity: 0.7 }]}
          onPress={(e) => {
            e.stopPropagation();
            handleApprove(item.id);
          }}
          disabled={processingItems.has(item.id)}
        >
          {processingItems.has(item.id) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.approveButtonText}>Duyệt</Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Phát Sinh Ngoài Báo Giá" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Phát Sinh Ngoài Báo Giá" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Phát Sinh Ngoài Báo Giá"
        showBackButton
        rightComponent={
          <PermissionGuard permission={Permissions.ADDITIONAL_COST_CREATE} projectId={id}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(`/projects/${id}/additional-costs/create`)}
            >
              <Ionicons name="add" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </PermissionGuard>
        }
      />

      <FlatList
        data={costs}
        renderItem={renderCostItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="add-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có chi phí phát sinh</Text>
          </View>
        }
      />

      {/* Mark Paid Modal */}
      <Modal
        visible={showMarkPaidModal}
        animationType="slide"
        transparent={true}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác Nhận Thanh Toán</Text>
              <TouchableOpacity
                onPress={() => setShowMarkPaidModal(false)}
                disabled={isSubmitting}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInfoBox}>
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.modalInfoText}>
                  Vui lòng tải lên hình ảnh hoặc tài liệu chứng từ chuyển khoản để xác nhận thanh toán.
                </Text>
              </View>

              <Text style={styles.uploadLabel}>Chứng từ thanh toán <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <UniversalFileUploader
                onUploadComplete={(files) => setUploadedFiles(files)}
                multiple={true}
                maxFiles={5}
                label="Bấm để tải chứng từ"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMarkPaidModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  (uploadedFiles.length === 0 || isSubmitting) && styles.disabledButton
                ]}
                onPress={submitMarkPaid}
                disabled={uploadedFiles.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
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
    backgroundColor: "#F9FAFB",
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  costCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  costHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  costAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
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
  costDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  markPaidButton: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  markPaidButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  approveButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
  },
  attachmentsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  attachmentsText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "70%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    flex: 1,
  },
  modalInfoBox: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
    alignItems: "center",
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disabledButton: {
    backgroundColor: "#93C5FD",
  },
});
