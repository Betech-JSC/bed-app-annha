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
import { useProjectPermissions } from "@/hooks/usePermissions";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import ImageViewer from "@/components/ImageViewer";

export default function CostDetailScreen() {
  const router = useRouter();
  const { id, costId } = useLocalSearchParams<{ id: string; costId: string }>();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission } = useProjectPermissions(id);
  const [cost, setCost] = useState<Cost | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  // Workflow State
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Image Viewer State
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);

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

  const handleRevertToDraft = () => {
    Alert.alert(
      "Xác nhận hoàn duyệt",
      "Bạn có chắc chắn muốn đưa chi phí này về trạng thái nháp?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Hoàn duyệt",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await costApi.revertCostToDraft(id!, costId!);
              if (response.success) {
                Alert.alert("Thành công", "Đã đưa chi phí về trạng thái nháp");
                loadCost();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể hoàn duyệt");
            } finally {
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
      <View style={styles.container}>
        <ScreenHeader title="Chi Tiết Chi Phí" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
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
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <ScreenHeader title="Chi Tiết Chi Phí" showBackButton />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
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

        {/* Linked Material Bill - "Ấn vào để xem chi tiết phiếu" */}
        {cost.material_bill && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phiếu Vật Liệu Liên Quan</Text>
            <TouchableOpacity
              style={styles.linkedBillCard}
              activeOpacity={0.7}
              onPress={() => {
                router.push(`/projects/${id}/material-bills/${cost.material_bill!.id}`);
              }}
            >
              <View style={styles.linkedBillHeader}>
                <View style={styles.linkedBillIconContainer}>
                  <Ionicons name="receipt-outline" size={22} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkedBillNumber}>
                    {cost.material_bill.bill_number || `Bill #${cost.material_bill.id}`}
                  </Text>
                  <Text style={styles.linkedBillDate}>
                    {cost.material_bill.supplier?.name || ''} • {new Date(cost.material_bill.bill_date).toLocaleDateString("vi-VN")}
                  </Text>
                </View>
                <Text style={styles.linkedBillAmount}>
                  {formatCurrency(cost.material_bill.total_amount)}
                </Text>
              </View>

              {/* Bill Items Preview */}
              {cost.material_bill.items && cost.material_bill.items.length > 0 && (
                <View style={styles.linkedBillItems}>
                  {cost.material_bill.items.slice(0, 3).map((item, idx) => (
                    <View key={idx} style={styles.linkedBillItemRow}>
                      <Text style={styles.linkedBillItemName} numberOfLines={1}>
                        {item.material?.name || `Vật liệu #${idx + 1}`}
                      </Text>
                      <Text style={styles.linkedBillItemQty}>
                        {item.quantity} {item.material?.unit || ''} × {new Intl.NumberFormat("vi-VN").format(item.unit_price)}đ
                      </Text>
                    </View>
                  ))}
                  {cost.material_bill.items.length > 3 && (
                    <Text style={styles.linkedBillMoreItems}>
                      +{cost.material_bill.items.length - 3} vật liệu khác
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.linkedBillFooter}>
                <Ionicons name="open-outline" size={16} color="#3B82F6" />
                <Text style={styles.linkedBillViewText}>Ấn vào để xem chi tiết phiếu</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Linked Material Info (without bill) */}
        {cost.material && !cost.material_bill && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông Tin Vật Liệu</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên vật liệu</Text>
                <Text style={styles.infoValue}>{cost.material.name}</Text>
              </View>
              {cost.material.code && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mã vật liệu</Text>
                    <Text style={styles.infoValue}>{cost.material.code}</Text>
                  </View>
                </>
              )}
              {cost.quantity && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Số lượng</Text>
                    <Text style={styles.infoValue}>
                      {cost.quantity} {cost.unit || cost.material.unit || ''}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

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
                    onPress={() => {
                      if (isImage) {
                        const imageList = cost.attachments!.filter((att) =>
                          att.type === "image" ||
                          (att.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_url))
                        );
                        // Find index of current attachment in the image list
                        // Using id for robust matching if available, else fallback to index logic
                        // But since we filtered, index won't match directly.
                        const currentImageIndex = imageList.findIndex(
                          (img) => img.id === attachment.id
                        );

                        if (currentImageIndex !== -1) {
                          setInitialImageIndex(currentImageIndex);
                          setImageViewerVisible(true);
                        }
                      } else {
                        handleOpenFile(imageUrl);
                      }
                    }}
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
        {(cost.status === "draft" || cost.status === "approved" || cost.status === "rejected" || cost.status === "pending_management_approval" || cost.status === "pending_accountant_approval") && (
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

              {/* Inline Action Buttons for easier access */}
              {(cost.status === "draft" || cost.status === "pending_management_approval" || cost.status === "pending_accountant_approval") && (
                <View style={styles.inlineActions}>
                  {cost.status === "draft" && (
                    <PermissionGuard permission={Permissions.COST_SUBMIT} projectId={id} style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.inlineActionButton, styles.inlineSubmitButton]}
                        onPress={handleSubmit}
                        disabled={actionLoading}
                      >
                        <Ionicons name="send-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.inlineActionText}>Duyệt</Text>
                      </TouchableOpacity>
                    </PermissionGuard>
                  )}

                  {cost.status === "pending_management_approval" && (
                    <PermissionGuard permission={Permissions.COST_APPROVE_MANAGEMENT} projectId={id} style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.inlineActionButton, styles.inlineApproveButton]}
                        onPress={handleApproveByManagement}
                        disabled={actionLoading}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.inlineActionText}>Duyệt</Text>
                      </TouchableOpacity>
                    </PermissionGuard>
                  )}

                  {cost.status === "pending_accountant_approval" && (
                    <PermissionGuard permission={Permissions.COST_APPROVE_ACCOUNTANT} projectId={id} style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.inlineActionButton, styles.inlineApproveButton]}
                        onPress={handleApproveByAccountant}
                        disabled={actionLoading}
                      >
                        <Ionicons name="checkmark-done-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.inlineActionText}>Duyệt</Text>
                      </TouchableOpacity>
                    </PermissionGuard>
                  )}

                  {(cost.status === "pending_management_approval" || cost.status === "pending_accountant_approval") && (
                    <PermissionGuard permission={Permissions.COST_REJECT} projectId={id} style={{ flex: 0.8 }}>
                      <TouchableOpacity
                        style={[styles.inlineActionButton, styles.inlineRejectButton]}
                        onPress={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.inlineActionText}>Hủy Duyệt</Text>
                      </TouchableOpacity>
                    </PermissionGuard>
                  )}
                </View>
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

        {/* Material Bill Images - show images from linked material bill */}
        {cost.material_bill && cost.material_bill.attachments && cost.material_bill.attachments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hình Ảnh Phiếu Vật Liệu</Text>
            <View style={styles.card}>
              <View style={styles.billImagesGrid}>
                {cost.material_bill.attachments.map((att: any, idx: number) => {
                  const isImage = att.type === "image" ||
                    (att.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_url));
                  return isImage ? (
                    <TouchableOpacity
                      key={att.id || idx}
                      onPress={() => {
                        const images = cost.material_bill!.attachments!.filter((a: any) =>
                          a.type === "image" || (a.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(a.file_url))
                        );
                        const imgIdx = images.findIndex((a: any) => a.id === att.id);
                        setInitialImageIndex(imgIdx >= 0 ? imgIdx : 0);
                        setImageViewerVisible(true);
                      }}
                    >
                      <Image
                        source={{ uri: att.file_url }}
                        style={styles.billImageThumbnail}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : null;
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons - Always visible for actionable statuses */}
      {(cost.status === "draft" || cost.status === "pending_management_approval" || cost.status === "pending_accountant_approval" || cost.status === "approved") && (
        <View style={styles.actionBar}>
          {cost.status === "draft" && (
            <PermissionGuard permission={Permissions.COST_SUBMIT} projectId={id} style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionButtonText}>Duyệt</Text>
                  </>
                )}
              </TouchableOpacity>
            </PermissionGuard>
          )}

          {cost.status === "pending_management_approval" && (
            <PermissionGuard permission={Permissions.COST_APPROVE_MANAGEMENT} projectId={id} style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApproveByManagement}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionButtonText}>Duyệt</Text>
                  </>
                )}
              </TouchableOpacity>
            </PermissionGuard>
          )}

          {cost.status === "pending_accountant_approval" && (
            <PermissionGuard permission={Permissions.COST_APPROVE_ACCOUNTANT} projectId={id} style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApproveByAccountant}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionButtonText}>Duyệt</Text>
                  </>
                )}
              </TouchableOpacity>
            </PermissionGuard>
          )}

          {(cost.status === "pending_management_approval" || cost.status === "pending_accountant_approval") && (
            <PermissionGuard permission={Permissions.COST_REJECT} projectId={id} style={{ flex: 0.5 }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionButtonText}>Hủy Duyệt</Text>
              </TouchableOpacity>
            </PermissionGuard>
          )}

          {cost.status === "draft" && (
            <PermissionGuard permission={Permissions.COST_DELETE} projectId={id} style={{ flex: 0.5 }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
                disabled={actionLoading}
              >
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionButtonText}>Xóa</Text>
              </TouchableOpacity>
            </PermissionGuard>
          )}



        </View>
      )}

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
                  <Text style={styles.modalTitle}>Hủy duyệt chi phí</Text>
                  <Text style={styles.modalSubtitle}>
                    Vui lòng nhập lý do hủy duyệt để người tạo có thể chỉnh sửa lại.
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Nhập lý do hủy duyệt (bắt buộc)..."
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
                        Xác nhận hủy duyệt
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      {/* Image Viewer */}
      {cost && (
        <ImageViewer
          visible={imageViewerVisible}
          images={
            [
              ...(cost.attachments?.filter((att) =>
                att.type === "image" ||
                (att.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_url))
              ).map((att) => ({
                uri: att.file_url,
                name: att.original_name,
              })) || []),
              ...(cost.material_bill?.attachments?.filter((att: any) =>
                att.type === "image" ||
                (att.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_url))
              ).map((att: any) => ({
                uri: att.file_url,
                name: att.original_name,
              })) || []),
            ]
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
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
  linkedBillCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    overflow: "hidden",
  },
  linkedBillHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  linkedBillIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  linkedBillNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  linkedBillDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  linkedBillAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  linkedBillItems: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  linkedBillItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkedBillItemName: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
    marginRight: 8,
  },
  linkedBillItemQty: {
    fontSize: 12,
    color: "#6B7280",
  },
  linkedBillMoreItems: {
    fontSize: 12,
    color: "#3B82F6",
    fontStyle: "italic",
    marginTop: 4,
  },
  linkedBillFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
  },
  linkedBillViewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  billImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  billImageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
  inlineSubmitButton: {
    backgroundColor: "#3B82F6",
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
});

