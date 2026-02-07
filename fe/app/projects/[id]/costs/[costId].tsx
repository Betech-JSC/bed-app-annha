import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { costApi, Cost } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionDenied, PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function CostDetailScreen() {
  const router = useRouter();
  const { id, costId } = useLocalSearchParams<{ id: string; costId: string }>();
  const tabBarHeight = useTabBarHeight();
  const [cost, setCost] = useState<Cost | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  // Workflow State
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadCost();
  }, [id, costId]);

  const loadCost = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);
      setPermissionMessage("");
      const response = await costApi.getCost(id!, costId!);
      if (response.success) {
        setCost(response.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem chi phí này.");
      } else {
        console.error("Error loading cost:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin chi phí");
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setActionLoading(true);
      const response = await costApi.submitCost(id!, costId!);
      if (response.success) {
        Alert.alert("Thành công", "Đã gửi duyệt chi phí");
        loadCost();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi duyệt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveByManagement = async () => {
    try {
      setActionLoading(true);
      const response = await costApi.approveByManagement(id!, costId!);
      if (response.success) {
        Alert.alert("Thành công", "Đã duyệt chi phí (BĐH)");
        loadCost();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveByAccountant = async () => {
    try {
      setActionLoading(true);
      const response = await costApi.approveByAccountant(id!, costId!);
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận chi phí (Kế toán)");
        loadCost();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác nhận");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setActionLoading(true);
      const response = await costApi.rejectCost(id!, costId!, rejectReason);
      if (response.success) {
        Alert.alert("Thành công", "Đã từ chối chi phí");
        setShowRejectModal(false);
        setRejectReason("");
        loadCost();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa chi phí này không? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await costApi.deleteCost(id!, costId!);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa chi phí");
                router.back();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa chi phí");
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusColor = (status: Cost["status"]) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending_management_approval":
        return "#F59E0B";
      case "pending_accountant_approval":
        return "#3B82F6";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: Cost["status"]) => {
    switch (status) {
      case "draft":
        return "Nháp";
      case "pending_management_approval":
        return "Chờ Ban điều hành";
      case "pending_accountant_approval":
        return "Chờ Kế toán";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Từ chối";
      default:
        return status;
    }
  };

  const handleOpenFile = (url: string) => {
    Linking.openURL(url).catch((err) => {
      Alert.alert("Lỗi", "Không thể mở file");
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Tiết Chi Phí" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  if (!cost) {

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy chi phí</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Chi Tiết Chi Phí" showBackButton />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight }]}
      >
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(cost.status) + "20" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(cost.status) }]}
            >
              {getStatusText(cost.status)}
            </Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông Tin Cơ Bản</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tên chi phí</Text>
              <Text style={styles.infoValue}>{cost.name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nhóm chi phí</Text>
              <Text style={styles.infoValue}>
                {cost.cost_group?.name || "Chưa phân loại"}
              </Text>
            </View>
            {cost.subcontractor && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nhà thầu phụ</Text>
                  <Text style={styles.infoValue}>{cost.subcontractor.name}</Text>
                </View>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tiền</Text>
              <Text style={[styles.infoValue, styles.amountValue]}>
                {formatCurrency(cost.amount)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày phát sinh</Text>
              <Text style={styles.infoValue}>
                {new Date(cost.cost_date).toLocaleDateString("vi-VN")}
              </Text>
            </View>
            {cost.description && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mô tả</Text>
                  <Text style={styles.infoValue}>{cost.description}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Attachments */}
        {cost.attachments && cost.attachments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tài Liệu Đính Kèm</Text>
            <View style={styles.card}>
              {cost.attachments.map((attachment, index) => {
                const imageUrl = attachment.file_url;
                const isImage = attachment.type === "image" ||
                  (imageUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl));

                return (
                  <TouchableOpacity
                    key={attachment.id || index}
                    style={styles.attachmentItem}
                    onPress={() => handleOpenFile(imageUrl)}
                  >
                    {isImage ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.attachmentThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.attachmentIconContainer}>
                        <Ionicons name="document-outline" size={32} color="#3B82F6" />
                      </View>
                    )}
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachment.original_name || "File"}
                      </Text>
                      <Text style={styles.attachmentType}>
                        {attachment.type || "Document"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Approval Info */}
        {(cost.status === "approved" || cost.status === "rejected") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông Tin Duyệt</Text>
            <View style={styles.card}>
              {cost.management_approver && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ban điều hành duyệt</Text>
                    <Text style={styles.infoValue}>
                      {cost.management_approver.name || "N/A"}
                    </Text>
                  </View>
                  {cost.management_approved_at && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày duyệt (Ban điều hành)</Text>
                        <Text style={styles.infoValue}>
                          {new Date(cost.management_approved_at).toLocaleDateString("vi-VN")}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
              {cost.accountant_approver && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Kế toán xác nhận</Text>
                    <Text style={styles.infoValue}>
                      {cost.accountant_approver.name || "N/A"}
                    </Text>
                  </View>
                  {cost.accountant_approved_at && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày xác nhận (Kế toán)</Text>
                        <Text style={styles.infoValue}>
                          {new Date(cost.accountant_approved_at).toLocaleDateString("vi-VN")}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
              {cost.rejected_reason && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Lý do từ chối</Text>
                    <Text style={[styles.infoValue, styles.rejectedReason]}>
                      {cost.rejected_reason}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Creator Info */}
        {cost.creator && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông Tin Người Tạo</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Người tạo</Text>
                <Text style={styles.infoValue}>
                  {cost.creator.name || "N/A"}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày tạo</Text>
                <Text style={styles.infoValue}>
                  {new Date(cost.created_at).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {cost.status === "draft" && (
          <PermissionGuard permission={Permissions.COST_SUBMIT}>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
              onPress={handleSubmit}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Gửi Duyệt</Text>
            </TouchableOpacity>
          </PermissionGuard>
        )}

        {cost.status === "pending_management_approval" && (
          <PermissionGuard permission={Permissions.COST_APPROVE_MANAGEMENT}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApproveByManagement}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Duyệt (BĐH)</Text>
            </TouchableOpacity>
          </PermissionGuard>
        )}

        {cost.status === "pending_accountant_approval" && (
          <PermissionGuard permission={Permissions.COST_APPROVE_ACCOUNTANT}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApproveByAccountant}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Xác Nhận (KT)</Text>
            </TouchableOpacity>
          </PermissionGuard>
        )}

        {(cost.status === "pending_management_approval" ||
          cost.status === "pending_accountant_approval") && (
            <PermissionGuard permission={Permissions.COST_REJECT}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Từ Chối</Text>
              </TouchableOpacity>
            </PermissionGuard>
          )}

        {cost.status === "draft" && (
          <PermissionGuard permission={Permissions.COST_DELETE}>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Xóa</Text>
            </TouchableOpacity>
          </PermissionGuard>
        )}
      </View>

      {/* Updated Reject Modal with Enhanced UX */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContentContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="alert-circle" size={32} color="#EF4444" />
                  </View>
                  <Text style={styles.modalTitle}>Từ chối chi phí</Text>
                  <Text style={styles.modalSubtitle}>
                    Vui lòng nhập lý do từ chối để người tạo có thể chỉnh sửa lại.
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Nhập lý do từ chối (bắt buộc)..."
                  placeholderTextColor="#9CA3AF"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => {
                      setShowRejectModal(false);
                      setRejectReason("");
                    }}
                    disabled={actionLoading}
                  >
                    <Text style={styles.modalCancelText}>Hủy bỏ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalConfirmButton,
                      (!rejectReason.trim() || actionLoading) &&
                      styles.modalButtonDisabled,
                    ]}
                    onPress={handleReject}
                    disabled={!rejectReason.trim() || actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalConfirmText}>
                        Xác nhận từ chối
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statusSection: {
    marginBottom: 16,
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "right",
  },
  amountValue: {
    fontSize: 18,
    color: "#EF4444",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  attachmentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  attachmentType: {
    fontSize: 12,
    color: "#6B7280",
  },
  rejectedReason: {
    color: "#EF4444",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  // Workflow Actions
  actionBar: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
    flex: 0.5,
  },
  deleteButton: {
    backgroundColor: "#6B7280",
    flex: 0.5,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F3F4F6",
  },
  modalConfirmButton: {
    backgroundColor: "#EF4444",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalCancelText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

