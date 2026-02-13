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
  TextInput,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { paymentApi, ProjectPayment, CreatePaymentData } from "@/api/paymentApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { ScreenHeader, DatePickerInput, CurrencyInput, PermissionDenied } from "@/components";
import ImageViewer from "@/components/ImageViewer";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { Permissions } from "@/constants/Permissions";

export default function PaymentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useProjectPermissions(id);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUploadProofModal, setShowUploadProofModal] = useState(false);
  const [showCustomerApprovalModal, setShowCustomerApprovalModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ProjectPayment | null>(null);
  const [confirmPaidDate, setConfirmPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [actualAmount, setActualAmount] = useState("");
  const [project, setProject] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [markPaidFiles, setMarkPaidFiles] = useState<UploadedFile[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [markPaidAttachmentIds, setMarkPaidAttachmentIds] = useState<number[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailPayment, setDetailPayment] = useState<ProjectPayment | null>(null);

  // ImageViewer state
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreatePaymentData>({
    payment_number: 1,
    amount: 0,
    notes: "",
    due_date: new Date().toISOString().split("T")[0],
    contract_id: undefined,
  });

  useEffect(() => {
    loadPayments();
    loadProject();
  }, [id]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPayments();
    }, [id])
  );

  const loadProject = async () => {
    try {
      const response = await projectApi.getProject(id!);
      if (response.success) {
        setProject(response.data);
        // Set contract_id if available
        if (response.data.contract?.id) {
          setFormData(prev => ({ ...prev, contract_id: response.data.contract.id }));
        }
        // Set next payment number
        const existingPayments = payments.length;
        setFormData(prev => ({ ...prev, payment_number: existingPayments + 1 }));
      }
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);
      const response = await paymentApi.getPayments(id!);
      if (response.success) {
        setPayments(response.data || []);
        // Update next payment number
        const maxPaymentNumber = response.data.length > 0
          ? Math.max(...response.data.map((p: ProjectPayment) => p.payment_number))
          : 0;
        setFormData(prev => ({ ...prev, payment_number: maxPaymentNumber + 1 }));
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem thanh toán của dự án này.");
        setPayments([]);
      } else {
        console.error("Error loading payments:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const handleCreatePayment = async () => {
    if (!formData.amount || formData.amount <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return;
    }

    if (!formData.due_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày đến hạn");
      return;
    }

    try {
      const response = await paymentApi.createPayment(id!, formData);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo đợt thanh toán mới");
        setShowCreateModal(false);
        resetForm();
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo đợt thanh toán"
      );
    }
  };

  const resetForm = () => {
    const maxPaymentNumber = payments.length > 0
      ? Math.max(...payments.map((p) => p.payment_number))
      : 0;
    setFormData({
      payment_number: maxPaymentNumber + 1,
      amount: 0,
      notes: "",
      due_date: new Date().toISOString().split("T")[0],
      contract_id: project?.contract?.id,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status: string, dueDate: string) => {
    switch (status) {
      case "confirmed":
      case "paid":
        return "#10B981";
      case "customer_paid":
        return "#3B82F6";
      case "overdue":
        return "#EF4444";
      case "customer_pending_approval":
      case "customer_approved":
        return "#8B5CF6";
      case "pending":
        const due = new Date(dueDate);
        const today = new Date();
        if (due < today) return "#EF4444";
        return "#F59E0B";
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
      case "customer_pending_approval":
        return "Chờ khách hàng duyệt";
      case "customer_approved":
        return "Khách hàng đã duyệt";
      case "paid":
        return "Đã thanh toán";
      case "overdue":
        return "Quá hạn";
      default:
        return status;
    }
  };

  const renderPaymentItem = ({ item }: { item: ProjectPayment }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      onPress={() => {
        setDetailPayment(item);
        setShowDetailModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.paymentNumber}>
            Đợt {item.payment_number}
          </Text>
          <Text style={styles.paymentAmount}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                getStatusColor(item.status, item.due_date) + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status, item.due_date) },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="calendar-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
        <Text style={{ fontSize: 13, color: "#6B7280" }}>
          {item.paid_date
            ? `Đã thanh toán: ${formatDate(item.paid_date)}`
            : `Hạn: ${formatDate(item.due_date)}`
          }
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        {item.notes && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={14} color="#9CA3AF" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Ghi chú</Text>
          </View>
        )}
        {item.attachments && item.attachments.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="attach-outline" size={14} color="#9CA3AF" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{item.attachments.length} file</Text>
          </View>
        )}
      </View>

      {item.status === "pending" && (
        <PermissionGuard permission={Permissions.PAYMENT_UPDATE} projectId={id}>
          <TouchableOpacity
            style={styles.markPaidButton}
            onPress={() => handleMarkAsPaid(item)}
          >
            <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            <Text style={styles.markPaidButtonText}>Thanh toán</Text>
          </TouchableOpacity>
        </PermissionGuard>
      )}

      {/* Kế toán xác nhận/từ chối thanh toán */}
      {item.status === "customer_paid" && (
        <PermissionGuard permission={Permissions.PAYMENT_CONFIRM} projectId={id}>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleConfirmPayment(item)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectPayment(item)}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.rejectButtonText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        </PermissionGuard>
      )}
    </TouchableOpacity>
  );

  const handleConfirmPayment = (payment: ProjectPayment) => {
    setSelectedPayment(payment);
    setConfirmPaidDate(new Date().toISOString().split("T")[0]);
    setShowConfirmModal(true);
  };

  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleRejectPayment = (payment: ProjectPayment) => {
    setSelectedPayment(payment);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const submitRejectPayment = async () => {
    if (!selectedPayment || !rejectionReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const response = await paymentApi.rejectPayment(
        id!,
        selectedPayment.id,
        rejectionReason
      );
      if (response.success) {
        Alert.alert("Thành công", "Đã từ chối thanh toán");
        setShowRejectModal(false);
        setRejectionReason("");
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối thanh toán");
    }
  };

  const handleMarkAsPaid = (payment: ProjectPayment) => {
    setSelectedPayment(payment);
    setMarkPaidDate(payment.paid_date || new Date().toISOString().split("T")[0]);
    setActualAmount(payment.amount.toString());
    setMarkPaidFiles(payment.attachments?.map((att) => ({
      id: att.id,
      file_url: att.file_url,
      original_name: att.original_name,
      type: att.mime_type?.startsWith("image/") ? "image" : "document",
    })) || []);
    setMarkPaidAttachmentIds(payment.attachments?.map((att) => att.id) || []);
    setShowMarkPaidModal(true);
    // Close detail modal if open to prevent stacking issues on Android/iOS
    if (showDetailModal) {
      setShowDetailModal(false);
    }
  };

  const handleUploadProof = (payment: ProjectPayment) => {
    setSelectedPayment(payment);
    setUploadedFiles(payment.attachments?.map((att) => ({
      id: att.id,
      file_url: att.file_url,
      original_name: att.original_name,
      type: att.mime_type?.startsWith("image/") ? "image" : "document",
    })) || []);
    setAttachmentIds(payment.attachments?.map((att) => att.id) || []);
    setShowUploadProofModal(true);
  };

  const handleFilesUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    const ids = files
      .map((f) => f.id || f.attachment_id)
      .filter((id): id is number => id !== undefined);
    setAttachmentIds(ids);
  };

  const submitUploadProof = async () => {
    if (!selectedPayment || attachmentIds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng upload ít nhất một hình xác nhận");
      return;
    }

    try {
      const response = await paymentApi.uploadPaymentProof(
        id!,
        selectedPayment.id,
        attachmentIds
      );
      if (response.success) {
        Alert.alert("Thành công", response.message || "Đã upload hình xác nhận");
        setShowUploadProofModal(false);
        setUploadedFiles([]);
        setAttachmentIds([]);
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể upload hình xác nhận");
    }
  };

  const handleCustomerApprove = async (payment: ProjectPayment) => {
    try {
      const response = await paymentApi.approveByCustomer(id!, payment.id);
      if (response.success) {
        Alert.alert("Thành công", "Đã duyệt thanh toán. Đang chờ kế toán xác nhận.");
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt thanh toán");
    }
  };

  const handleCustomerReject = (payment: ProjectPayment) => {
    setSelectedPayment(payment);
    setRejectionReason("");
    setShowCustomerApprovalModal(true);
  };

  const submitCustomerReject = async () => {
    if (!selectedPayment || !rejectionReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const response = await paymentApi.rejectByCustomer(
        id!,
        selectedPayment.id,
        rejectionReason
      );
      if (response.success) {
        Alert.alert("Thành công", "Đã từ chối thanh toán");
        setShowCustomerApprovalModal(false);
        setRejectionReason("");
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối thanh toán");
    }
  };

  const submitMarkAsPaid = async () => {
    if (!selectedPayment || !markPaidDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày thanh toán");
      return;
    }

    if (markPaidAttachmentIds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng upload ít nhất một chứng từ chuyển khoản");
      return;
    }

    try {
      const response = await paymentApi.markAsPaidByCustomer(id!, selectedPayment.id, {
        paid_date: markPaidDate,
        actual_amount: actualAmount ? parseFloat(actualAmount) : undefined,
        attachment_ids: markPaidAttachmentIds.length > 0 ? markPaidAttachmentIds : undefined,
      });
      if (response.success) {
        Alert.alert("Thành công", "Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.");
        setShowMarkPaidModal(false);
        setSelectedPayment(null);
        setMarkPaidFiles([]);
        setMarkPaidAttachmentIds([]);
        setActualAmount("");
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể đánh dấu thanh toán"
      );
    }
  };

  const handleMarkPaidFilesUpload = (files: UploadedFile[]) => {
    setMarkPaidFiles(files);
    const ids = files
      .map((f) => f.id || f.attachment_id)
      .filter((id): id is number => id !== undefined);
    setMarkPaidAttachmentIds(ids);
  };

  const submitConfirmPayment = async () => {
    if (!selectedPayment || !confirmPaidDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày xác nhận");
      return;
    }

    try {
      const response = await paymentApi.confirmPayment(
        id!,
        selectedPayment.id,
        confirmPaidDate
      );
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận đã nhận tiền");
        setShowConfirmModal(false);
        setSelectedPayment(null);
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể xác nhận thanh toán"
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Thanh Toán" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Thanh Toán" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Thanh Toán"
        showBackButton
        rightComponent={
          <PermissionGuard permission={Permissions.PAYMENT_CREATE} projectId={id}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setShowCreateModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </PermissionGuard>
        }
      />

      <PermissionGuard permission={Permissions.PAYMENT_VIEW} projectId={id}>
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có đợt thanh toán nào</Text>
              <PermissionGuard permission={Permissions.PAYMENT_CREATE} projectId={id}>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                >
                  <Text style={styles.emptyButtonText}>Thêm đợt thanh toán</Text>
                </TouchableOpacity>
              </PermissionGuard>

            </View>
          }
        />
      </PermissionGuard>

      {/* Detail Payment Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowDetailModal(false);
          setDetailPayment(null);
        }}
      >
        <SafeAreaView style={styles.detailModalContainer}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowDetailModal(false);
                setDetailPayment(null);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.detailModalTitle}>Chi tiết thanh toán</Text>
            <View style={{ width: 24 }} />
          </View>

          {detailPayment ? (
            <ScrollView
              style={styles.detailScrollView}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }}
            >
              {/* Status Card */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Ionicons
                    name={
                      (detailPayment.status === "confirmed" || detailPayment.status === "paid"
                        ? "checkmark-circle"
                        : detailPayment.status === "customer_paid"
                          ? "card"
                          : detailPayment.status === "customer_pending_approval"
                            ? "time"
                            : detailPayment.status === "customer_approved"
                              ? "thumbs-up"
                              : detailPayment.status === "overdue"
                                ? "alert-circle"
                                : "ellipse") as any
                    }
                    size={48}
                    color={getStatusColor(detailPayment.status, detailPayment.due_date)}
                  />
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusLabel}>Trạng thái</Text>
                    <View
                      style={[
                        styles.detailStatusBadge,
                        {
                          backgroundColor:
                            getStatusColor(detailPayment.status, detailPayment.due_date) + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailStatusText,
                          { color: getStatusColor(detailPayment.status, detailPayment.due_date) },
                        ]}
                      >
                        {getStatusText(detailPayment.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Payment Info Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Thông tin thanh toán</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Đợt thanh toán</Text>
                  <Text style={styles.infoValue}>Đợt {detailPayment.payment_number}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số tiền</Text>
                  <Text style={[styles.infoValue, styles.amountText]}>
                    {formatCurrency(detailPayment.amount)}
                  </Text>
                </View>

                {detailPayment.notes && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nội dung</Text>
                    <Text style={styles.infoValueMultiline}>{detailPayment.notes}</Text>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.iconLabel}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.infoLabel}>Hạn thanh toán</Text>
                  </View>
                  <Text style={styles.infoValue}>{formatDate(detailPayment.due_date)}</Text>
                </View>

                {detailPayment.paid_date && (
                  <View style={styles.infoRow}>
                    <View style={styles.iconLabel}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                      <Text style={styles.infoLabel}>Ngày thanh toán</Text>
                    </View>
                    <Text style={styles.infoValue}>{formatDate(detailPayment.paid_date)}</Text>
                  </View>
                )}
              </View>

              {/* Approval Info Card */}
              {(detailPayment.customer_approved_at ||
                detailPayment.payment_proof_uploaded_at ||
                detailPayment.confirmed_at) && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Lịch sử duyệt</Text>

                    {detailPayment.payment_proof_uploaded_at && (
                      <View style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <View style={styles.timelineHeader}>
                            <Ionicons name="image-outline" size={20} color="#F59E0B" />
                            <Text style={styles.timelineTitle}>Upload chứng từ</Text>
                          </View>
                          <Text style={styles.timelineDate}>
                            {new Date(detailPayment.payment_proof_uploaded_at).toLocaleString("vi-VN")}
                          </Text>
                        </View>
                      </View>
                    )}

                    {detailPayment.customer_approved_at && (
                      <View style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <View style={styles.timelineHeader}>
                            <Ionicons name="person-outline" size={20} color="#8B5CF6" />
                            <Text style={styles.timelineTitle}>Khách hàng xác nhận</Text>
                          </View>
                          <Text style={styles.timelineDate}>
                            {new Date(detailPayment.customer_approved_at).toLocaleString("vi-VN")}
                          </Text>
                          {detailPayment.customer_approver && (
                            <Text style={styles.timelineUser}>
                              Bởi: {detailPayment.customer_approver.name}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {detailPayment.confirmed_at && (
                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: "#10B981" }]} />
                        <View style={styles.timelineContent}>
                          <View style={styles.timelineHeader}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.timelineTitle}>Kế toán xác nhận</Text>
                          </View>
                          <Text style={styles.timelineDate}>
                            {new Date(detailPayment.confirmed_at).toLocaleString("vi-VN")}
                          </Text>
                          {detailPayment.confirmer && (
                            <Text style={styles.timelineUser}>
                              Bởi: {detailPayment.confirmer.name}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}

              {/* Attachments Card */}
              {detailPayment.attachments && detailPayment.attachments.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Chứng từ đính kèm ({detailPayment.attachments.length})
                  </Text>

                  <View style={styles.attachmentsGrid}>
                    {detailPayment.attachments.map((attachment, index) => (
                      <TouchableOpacity
                        key={attachment.id || index}
                        style={styles.attachmentCard}
                        onPress={() => {
                          if (attachment.mime_type && attachment.mime_type.startsWith("image/")) {
                            // Filter images for the viewer
                            const images = detailPayment.attachments
                              ?.filter(att => att.mime_type?.startsWith("image/"))
                              .map(att => ({ uri: att.file_url }));

                            const clickedImageIndex = images?.findIndex(img => img.uri === attachment.file_url) ?? 0;

                            if (images && images.length > 0) {
                              setViewerImages(images);
                              setCurrentImageIndex(clickedImageIndex);
                              setImageViewerVisible(true);
                            }
                          } else {
                            Alert.alert("Thông báo", "Chức năng xem trước chỉ hỗ trợ file ảnh.");
                          }
                        }}
                      >
                        {attachment.mime_type?.startsWith("image/") ? (
                          <Image
                            source={{ uri: attachment.file_url }}
                            style={styles.attachmentImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.attachmentPlaceholder}>
                            <Ionicons name="document-text-outline" size={32} color="#3B82F6" />
                          </View>
                        )}
                        <Text style={styles.attachmentName} numberOfLines={2}>
                          {attachment.original_name || attachment.file_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Actions */}
              {detailPayment.status === "pending" && (
                <PermissionGuard permission={Permissions.PAYMENT_UPDATE} projectId={id}>
                  <TouchableOpacity
                    style={styles.detailActionButton}
                    onPress={() => {
                      handleMarkAsPaid(detailPayment);
                    }}
                  >
                    <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.detailActionButtonText}>Thanh toán</Text>
                  </TouchableOpacity>
                </PermissionGuard>
              )}

              {detailPayment.status === "customer_paid" && (
                <PermissionGuard permission={Permissions.PAYMENT_CONFIRM} projectId={id}>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.detailActionButton, styles.confirmButton]}
                      onPress={() => handleConfirmPayment(detailPayment)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.detailActionButtonText}>Xác nhận</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.detailActionButton, styles.rejectButton]}
                      onPress={() => handleRejectPayment(detailPayment)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.detailActionButtonText}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                </PermissionGuard>
              )}
            </ScrollView>
          ) : (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Create Payment Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm Đợt Thanh Toán</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }}
            showsVerticalScrollIndicator={true}
          >
            {project?.contract && (
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoText}>
                    Giá trị hợp đồng: {formatCurrency(project.contract.contract_value)}
                  </Text>
                  {payments.length > 0 && (
                    <Text style={styles.infoSubtext}>
                      Tổng đã tạo: {formatCurrency(
                        payments.reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Số đợt thanh toán <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số đợt"
                value={formData.payment_number.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    payment_number: parseInt(text) || 1,
                  })
                }
                keyboardType="numeric"
              />
            </View>

            <CurrencyInput
              label={
                <Text>
                  Số tiền <Text style={styles.required}>*</Text>
                </Text>
              }
              value={formData.amount}
              onChangeText={(amount) =>
                setFormData({
                  ...formData,
                  amount,
                })
              }
              placeholder="Nhập số tiền (VND)"
            />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nội dung thanh toán</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập nội dung thanh toán (ví dụ: Thanh toán đợt 1 - 30% giá trị hợp đồng)"
                value={formData.notes || ""}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    notes: text,
                  })
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>
                Mô tả nội dung của đợt thanh toán này
              </Text>
            </View>

            <DatePickerInput
              label="Ngày đến hạn"
              value={formData.due_date ? new Date(formData.due_date) : null}
              onChange={(date) => {
                if (date) {
                  setFormData({
                    ...formData,
                    due_date: date.toISOString().split("T")[0],
                  });
                }
              }}
              placeholder="Chọn ngày đến hạn"
              required
              minimumDate={new Date()}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreatePayment}
              >
                <Text style={styles.saveButtonText}>Tạo Đợt Thanh Toán</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Confirm Payment Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowConfirmModal(false);
          setSelectedPayment(null);
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmModalHeader}>
              <Text style={styles.confirmModalTitle}>Xác Nhận Thanh Toán</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowConfirmModal(false);
                  setSelectedPayment(null);
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <ScrollView
                style={styles.confirmModalContent}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.confirmInfoCard}>
                  <Text style={styles.confirmInfoLabel}>Đợt thanh toán</Text>
                  <Text style={styles.confirmInfoValue}>
                    Đợt {selectedPayment.payment_number}
                  </Text>
                </View>

                <View style={styles.confirmInfoCard}>
                  <Text style={styles.confirmInfoLabel}>Số tiền</Text>
                  <Text style={styles.confirmInfoValue}>
                    {formatCurrency(selectedPayment.amount)}
                  </Text>
                </View>

                <DatePickerInput
                  label="Ngày thanh toán"
                  value={confirmPaidDate ? new Date(confirmPaidDate) : null}
                  onChange={(date) => {
                    if (date) {
                      setConfirmPaidDate(date.toISOString().split("T")[0]);
                    }
                  }}
                  placeholder="Chọn ngày thanh toán"
                  required
                  maximumDate={new Date()}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowConfirmModal(false);
                      setSelectedPayment(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={submitConfirmPayment}
                  >
                    <Text style={styles.saveButtonText}>Xác Nhận</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Upload hình xác nhận */}
      <Modal
        visible={showUploadProofModal}
        animationType="slide"
        transparent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowUploadProofModal(false);
          setUploadedFiles([]);
          setAttachmentIds([]);
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Hình Xác Nhận Chuyển Khoản</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowUploadProofModal(false);
                  setUploadedFiles([]);
                  setAttachmentIds([]);
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
            >
              <UniversalFileUploader
                onUploadComplete={handleFilesUpload}
                multiple={true}
                accept="image"
                maxFiles={10}
                initialFiles={uploadedFiles}
                showPreview={true}
                label="Chọn hình ảnh xác nhận chuyển khoản"
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowUploadProofModal(false);
                  setUploadedFiles([]);
                  setAttachmentIds([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={submitUploadProof}
              >
                <Text style={styles.saveButtonText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Khách hàng đánh dấu đã thanh toán */}
      <Modal
        visible={showMarkPaidModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowMarkPaidModal(false);
          setMarkPaidFiles([]);
          setMarkPaidAttachmentIds([]);
          setActualAmount("");
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đã Thanh Toán</Text>
            <TouchableOpacity
              onPress={() => {
                setShowMarkPaidModal(false);
                setMarkPaidFiles([]);
                setMarkPaidAttachmentIds([]);
                setActualAmount("");
                // Re-open detail modal if we have a selected payment (cancelled from detail view)
                if (selectedPayment) {
                  setDetailPayment(selectedPayment);
                  setShowDetailModal(true);
                }
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }}
            showsVerticalScrollIndicator={true}
          >
            {selectedPayment && (
              <View>
                <View style={styles.confirmInfoCard}>
                  <Text style={styles.confirmInfoLabel}>Đợt thanh toán</Text>
                  <Text style={styles.confirmInfoValue}>
                    Đợt {selectedPayment.payment_number}
                  </Text>
                </View>

                <View style={styles.confirmInfoCard}>
                  <Text style={styles.confirmInfoLabel}>Số tiền yêu cầu</Text>
                  <Text style={styles.confirmInfoValue}>
                    {formatCurrency(selectedPayment.amount)}
                  </Text>
                </View>

                <DatePickerInput
                  label="Ngày thanh toán *"
                  value={markPaidDate ? new Date(markPaidDate) : null}
                  onChange={(date) => {
                    if (date) {
                      setMarkPaidDate(date.toISOString().split("T")[0]);
                    }
                  }}
                  placeholder="Chọn ngày thanh toán"
                  required
                  maximumDate={new Date()}
                />

                <CurrencyInput
                  label="Số tiền thực tế (nếu khác)"
                  value={actualAmount ? parseFloat(actualAmount) : 0}
                  onChangeText={(amount) => setActualAmount(amount > 0 ? amount.toString() : "")}
                  placeholder="Nhập số tiền thực tế (tùy chọn)"
                  helperText="Để trống nếu số tiền thực tế bằng số tiền yêu cầu"
                />

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Chứng từ chuyển khoản *</Text>
                  <UniversalFileUploader
                    onUploadComplete={handleMarkPaidFilesUpload}
                    multiple={true}
                    accept="image"
                    maxFiles={10}
                    initialFiles={markPaidFiles}
                    showPreview={true}
                    label="Chọn hình ảnh chứng từ chuyển khoản"
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowMarkPaidModal(false);
                setMarkPaidFiles([]);
                setMarkPaidAttachmentIds([]);
                setActualAmount("");
                // Re-open detail modal if we have a selected payment (cancelled from detail view)
                if (selectedPayment) {
                  setDetailPayment(selectedPayment);
                  setShowDetailModal(true);
                }
              }}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={submitMarkAsPaid}
            >
              <Text style={styles.saveButtonText}>Xác Nhận</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Khách hàng từ chối */}
      <Modal
        visible={showCustomerApprovalModal}
        animationType="slide"
        transparent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowCustomerApprovalModal(false);
          setRejectionReason("");
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ Chối Thanh Toán</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomerApprovalModal(false);
                  setRejectionReason("");
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Vui lòng nhập lý do từ chối:
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Nhập lý do từ chối..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCustomerApprovalModal(false);
                  setRejectionReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={submitCustomerReject}
              >
                <Text style={[styles.saveButtonText, { color: "#FFFFFF" }]}>Từ Chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Kế toán từ chối (Accountant Reject Modal) */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectionReason("");
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ Chối Thanh Toán</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Vui lòng nhập lý do từ chối:
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Nhập lý do từ chối..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={submitRejectPayment}
              >
                <Text style={[styles.saveButtonText, { color: "#FFFFFF" }]}>Từ Chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {/* ImageViewer */}
      <ImageViewer
        visible={imageViewerVisible}
        images={viewerImages}
        initialIndex={currentImageIndex}
        onClose={() => setImageViewerVisible(false)}
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
  paymentCard: {
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
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  paymentNumber: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  paymentAmount: {
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
  paymentDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
  },
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    padding: 14,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markPaidButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  rejectButton: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  rejectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
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
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    maxHeight: "85%",
    padding: 16,
    overflow: "hidden",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: "#6B7280",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1F2937",
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  notesContainer: {
    flex: 1,
    marginLeft: 8,
  },
  notesText: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    maxHeight: "85%",
    overflow: "hidden",
  },
  confirmModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  confirmModalContent: {
    padding: 16,
    flexGrow: 1,
  },
  confirmInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  confirmInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  confirmInfoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },

  permissionDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permissionDeniedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 24,
    marginBottom: 8,
  },
  permissionDeniedMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  permissionDeniedSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  detailScrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  detailStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  detailStatusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoValueMultiline: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
  },
  amountText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3B82F6",
  },
  iconLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  timelineDate: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  timelineUser: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  attachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  attachmentCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  attachmentImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#E5E7EB",
  },
  attachmentPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentName: {
    padding: 8,
    fontSize: 12,
    color: "#1F2937",
  },
  detailActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  detailActionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
});
