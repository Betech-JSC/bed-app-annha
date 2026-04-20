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
  Modal,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { additionalCostApi, AdditionalCost } from "@/api/additionalCostApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";
import ImageViewer from "@/components/ImageViewer";

export default function AdditionalCostDetailScreen() {
  const router = useRouter();
  const { id, costId } = useLocalSearchParams<{ id: string; costId: string }>();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission } = useProjectPermissions(id);
  const [cost, setCost] = useState<AdditionalCost | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  useEffect(() => {
    loadCostDetail();
  }, [id, costId]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (id && costId) {
        loadCostDetail();
      }
    }, [id, costId])
  );

  const loadCostDetail = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);
      setPermissionMessage("");
      const response = await additionalCostApi.getAdditionalCost(id!, costId!);
      if (response.success) {
        setCost(response.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem chi phí phát sinh này.");
      } else {
        console.error("Error loading cost detail:", error);
        Alert.alert("Lỗi", "Không thể tải chi tiết chi phí phát sinh");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {

    setRefreshing(true);
    loadCostDetail();
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
        return "KH báo TT";
      case "confirmed":
        return "Đã thanh toán";
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

  const handleMarkPaid = () => {
    Alert.alert(
      "Xác nhận thanh toán",
      "Bạn có chắc chắn đã thanh toán chi phí này?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setProcessingAction('mark_paid');
              const response = await additionalCostApi.markAsPaidByCustomer(id!, costId!, {
                paid_date: new Date().toISOString().split("T")[0],
              });
              if (response.success) {
                Alert.alert("Thành công", "Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.");
                loadCostDetail();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
            } finally {
              setProcessingAction(null);
            }
          }
        }
      ]
    );
  };

  const handleConfirm = async () => {
    try {
      const response = await additionalCostApi.confirmAdditionalCost(id!, costId!);
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận đã nhận tiền.");
        loadCostDetail();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleApprove = async () => {
    try {
      const response = await additionalCostApi.approveAdditionalCost(id!, costId!);
      if (response.success) {
        Alert.alert("Thành công", "Chi phí phát sinh đã được duyệt.");
        loadCostDetail();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleReject = () => {
    Alert.prompt(
      "Từ chối chi phí phát sinh",
      "Vui lòng nhập lý do từ chối:",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async (reason) => {
            if (!reason || reason.trim() === "") {
              Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
              return;
            }
            try {
              const response = await additionalCostApi.rejectAdditionalCost(
                id!,
                costId!,
                reason
              );
              if (response.success) {
                Alert.alert("Thành công", "Chi phí phát sinh đã bị từ chối.");
                loadCostDetail();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const openFile = (attachment: any) => {
    const isImage = attachment.mime_type?.startsWith("image/") ||
      (attachment.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.file_url));

    if (isImage) {
      const imageList = cost?.attachments?.filter((att) =>
        att.mime_type?.startsWith("image/") ||
        (att.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_url))
      ) || [];

      const index = imageList.findIndex((img) => img.id === attachment.id);

      if (index !== -1) {
        setInitialImageIndex(index);
        setImageViewerVisible(true);
      }
    } else {
      // For documents, you might want to open in a browser or document viewer
      Alert.alert("Mở file", "File sẽ được mở trong trình duyệt");
      // You can use Linking.openURL(fileUrl) here if needed
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Tiết Chi Phí Phát Sinh" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Tiết Chi Phí Phát Sinh" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  if (!cost) {

    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Tiết Chi Phí Phát Sinh" showBackButton />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Không tìm thấy chi phí phát sinh</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <ScreenHeader title="Chi Tiết Chi Phí Phát Sinh" showBackButton />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Thông tin cơ bản */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Thông Tin Cơ Bản</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số tiền:</Text>
            <Text style={styles.infoValue}>{formatCurrency(cost.amount)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái:</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(cost.status) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(cost.status) },
                ]}
              >
                {getStatusText(cost.status)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mô tả:</Text>
          </View>
          <Text style={styles.description}>{cost.description}</Text>
        </View>

        {/* Thông tin người đề xuất */}
        {cost.proposer && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Người Đề Xuất</Text>
            </View>
            <Text style={styles.infoValue}>{cost.proposer.name}</Text>
            <Text style={styles.infoSubtext}>{cost.proposer.email}</Text>
            {cost.created_at && (
              <Text style={styles.infoSubtext}>
                Ngày tạo: {new Date(cost.created_at).toLocaleDateString("vi-VN")}
              </Text>
            )}
          </View>
        )}

        {/* Thông tin người duyệt */}
        {(cost.approver || cost.status === "pending_approval" || cost.status === "pending") && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.cardTitle}>Duyệt Chi Phí</Text>
            </View>
            {cost.approver && (
              <>
                <Text style={styles.infoValue}>{cost.approver.name}</Text>
                <Text style={styles.infoSubtext}>{cost.approver.email}</Text>
                {cost.approved_at && (
                  <Text style={styles.infoSubtext}>
                    Ngày duyệt: {new Date(cost.approved_at).toLocaleDateString("vi-VN")}
                  </Text>
                )}
              </>
            )}

            {/* Inline Action Buttons for easier access */}
            {(cost.status === "pending_approval" || cost.status === "pending") && (
              <View style={styles.inlineActions}>
                <PermissionGuard permission={Permissions.ADDITIONAL_COST_APPROVE} projectId={id} style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.inlineActionButton, styles.inlineApproveButton]}
                    onPress={handleApprove}
                    disabled={!!processingAction}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.inlineActionText}>Duyệt</Text>
                  </TouchableOpacity>
                </PermissionGuard>

                <PermissionGuard permission={Permissions.ADDITIONAL_COST_REJECT} projectId={id} style={{ flex: 0.8 }}>
                  <TouchableOpacity
                    style={[styles.inlineActionButton, styles.inlineRejectButton]}
                    onPress={handleReject}
                    disabled={!!processingAction}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.inlineActionText}>Hủy Duyệt</Text>
                  </TouchableOpacity>
                </PermissionGuard>
              </View>
            )}
          </View>
        )}

        {/* Lý do từ chối */}
        {cost.status === "rejected" && cost.rejected_reason && (
          <View style={[styles.card, styles.rejectedCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
              <Text style={styles.cardTitle}>Lý Do Từ Chối</Text>
            </View>
            <Text style={styles.rejectedReason}>{cost.rejected_reason}</Text>
          </View>
        )}

        {/* File đính kèm */}
        {cost.attachments && cost.attachments.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="attach" size={24} color="#F59E0B" />
              <Text style={styles.cardTitle}>
                File Đính Kèm ({cost.attachments.length})
              </Text>
            </View>
            <View style={styles.attachmentsGrid}>
              {cost.attachments.map((attachment) => {
                const isImage = attachment.mime_type?.startsWith("image/");
                return (
                  <TouchableOpacity
                    key={attachment.id}
                    style={styles.attachmentItem}
                    onPress={() => openFile(attachment)}
                  >
                    {isImage ? (
                      <Image
                        source={{ uri: attachment.file_url }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.attachmentDocument}>
                        <Ionicons name="document" size={32} color="#3B82F6" />
                        <Text style={styles.attachmentFileName} numberOfLines={1}>
                          {attachment.original_name || attachment.file_name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Note: Action buttons restored for approval workflow */}
      </ScrollView>

      {/* Action Buttons Bar */}
      {cost && (cost.status === "pending_approval" || cost.status === "pending") && (
        <View style={styles.actionBar}>
          <PermissionGuard permission={Permissions.ADDITIONAL_COST_APPROVE} projectId={id} style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveBtn]}
              onPress={handleApprove}
              disabled={!!processingAction}
            >
              {processingAction === 'approve' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Duyệt</Text>
                </>
              )}
            </TouchableOpacity>
          </PermissionGuard>

          <PermissionGuard permission={Permissions.ADDITIONAL_COST_REJECT} projectId={id} style={{ flex: 0.5 }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectBtn]}
              onPress={handleReject}
              disabled={!!processingAction}
            >
              <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Hủy Duyệt</Text>
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      )}

      {/* Edit Button for draft/pending/rejected */}
      {cost && ["pending", "pending_approval", "rejected"].includes(cost.status) && (
        <View style={styles.actionBar}>
          <PermissionGuard permission={Permissions.ADDITIONAL_COST_UPDATE} projectId={id} style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => router.push(`/projects/${id}/additional-costs/create?editId=${costId}` as any)}
              disabled={!!processingAction}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Sửa</Text>
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      )}

      {/* Revert Button for approved costs */}
      {cost && ["pending_approval", "rejected"].includes(cost.status) && (
        <View style={styles.actionBar}>
          <PermissionGuard permission={Permissions.ADDITIONAL_COST_REVERT} projectId={id} style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => {
                Alert.alert(
                  "Xác nhận hoàn duyệt",
                  "Bạn có chắc chắn muốn đưa chi phí phát sinh này về trạng thái nháp?",
                  [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Hoàn duyệt",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          setProcessingAction('revert');
                          const response = await additionalCostApi.revertToDraft(id!, costId!);
                          if (response.success) {
                            Alert.alert("Thành công", "Đã đưa chi phí phát sinh về trạng thái nháp");
                            loadCostDetail();
                          }
                        } catch (error: any) {
                          Alert.alert("Lỗi", error.response?.data?.message || "Không thể hoàn duyệt");
                        } finally {
                          setProcessingAction(null);
                        }
                      },
                    },
                  ]
                );
              }}
              disabled={!!processingAction}
            >
              {processingAction === 'revert' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="arrow-undo-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Hoàn duyệt</Text>
                </>
              )}
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      )}

      {/* Image Preview Modal */}
      {/* Image Viewer */}
      {cost && (
        <ImageViewer
          visible={imageViewerVisible}
          images={
            cost.attachments?.filter((att) =>
              att.mime_type?.startsWith("image/") ||
              (att.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_url))
            ).map((att) => ({
              uri: att.file_url,
              name: att.original_name || att.file_name,
            })) || []
          }
          initialIndex={initialImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}
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
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginTop: 8,
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
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  rejectedReason: {
    fontSize: 14,
    color: "#DC2626",
    lineHeight: 20,
  },
  attachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  attachmentItem: {
    width: "47%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  attachmentImage: {
    width: "100%",
    height: 120,
  },
  attachmentDocument: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  attachmentFileName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  markPaidButton: {
    backgroundColor: "#3B82F6",
  },
  confirmButton: {
    backgroundColor: "#10B981",
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewClose: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  // Inline Actions
  inlineActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
  },
  inlineActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  inlineApproveButton: {
    backgroundColor: "#10B981",
  },
  inlineRejectButton: {
    backgroundColor: "#EF4444",
  },
  inlineActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: "#10B981",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});



