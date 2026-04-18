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
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { subcontractorApi, Subcontractor } from "@/api/subcontractorApi";
import { globalSubcontractorApi, GlobalSubcontractor } from "@/api/globalSubcontractorApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { ScreenHeader, DatePickerInput, CurrencyInput, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

import ImageViewer from "@/components/ImageViewer";

export default function SubcontractorsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission } = useProjectPermissions(id || null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [globalSubcontractors, setGlobalSubcontractors] = useState<GlobalSubcontractor[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [showGlobalList, setShowGlobalList] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    global_subcontractor_id: null as number | null,
    name: "",
    category: "",
    total_quote: 0,
    progress_start_date: null as Date | null,
    progress_end_date: null as Date | null,
    progress_status: "not_started" as "not_started" | "in_progress" | "completed" | "delayed",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    cost_group_id: null as number | null,
    cost_date: new Date(),
    create_cost: false,
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubcontractorDetail, setSelectedSubcontractorDetail] = useState<Subcontractor | null>(null);
  const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
  const [loadingCostGroups, setLoadingCostGroups] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    payment_stage: "",
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "bank_transfer" as "cash" | "bank_transfer" | "check" | "other",
    reference_number: "",
    description: "",
  });
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  useEffect(() => {
    loadSubcontractors();
    loadCostGroups();
  }, [id]);

  // Reload data when screen comes into focus (e.g., after navigation back)
  useFocusEffect(
    React.useCallback(() => {
      loadSubcontractors();
    }, [id])
  );

  const loadCostGroups = async () => {
    try {
      setLoadingCostGroups(true);
      const response = await costGroupApi.getCostGroups({ active_only: true });
      if (response.success) {
        setCostGroups(response.data.data || response.data || []);
      }
    } catch (error) {
      console.error("Error loading cost groups:", error);
    } finally {
      setLoadingCostGroups(false);
    }
  };

  const loadGlobalSubcontractors = async () => {
    try {
      setLoadingGlobal(true);
      const response = await globalSubcontractorApi.getGlobalSubcontractors();
      if (response.success) {
        setGlobalSubcontractors(response.data.data || response.data || []);
      }
    } catch (error) {
      console.error("Error loading global subcontractors:", error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const calculateProgressStatus = (startDate: Date | null, endDate: Date | null) => {
    if (!endDate) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Nếu đã hoàn thành, giữ nguyên
    if (formData.progress_status === "completed") return;

    // Nếu quá ngày kết thúc và chưa hoàn thành → trễ tiến độ
    if (today > end) {
      setFormData(prev => ({ ...prev, progress_status: "delayed" }));
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      // Nếu đã qua ngày bắt đầu → đang thực hiện
      if (today >= start) {
        setFormData(prev => ({ ...prev, progress_status: "in_progress" }));
      }
    }
  };

  const handleSelectGlobalSubcontractor = (globalSub: GlobalSubcontractor) => {
    setFormData({
      ...formData,
      global_subcontractor_id: globalSub.id,
      name: globalSub.name,
      category: globalSub.category || "",
      bank_name: globalSub.bank_name || "",
      bank_account_number: globalSub.bank_account_number || "",
      bank_account_name: globalSub.bank_account_name || "",
    });
    setShowGlobalList(false);
  };

  const loadSubcontractors = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);
      setPermissionMessage("");
      const response = await subcontractorApi.getSubcontractors(id!);
      if (response.success) {
        const data = response.data || [];
        // Load payments for each subcontractor
        const subcontractorsWithPayments = await Promise.all(
          data.map(async (sub: Subcontractor) => {
            try {
              const paymentsResponse = await subcontractorApi.getPayments(id!, {
                subcontractor_id: sub.id,
              });
              if (paymentsResponse.success) {
                sub.payments = paymentsResponse.data || [];
              }
            } catch (error) {
              console.error("Error loading payments for subcontractor:", error);
            }
            return sub;
          })
        );
        setSubcontractors(subcontractorsWithPayments);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem nhà thầu phụ của dự án này.");
        setSubcontractors([]);
      } else {
        console.error("Error loading subcontractors:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (subcontractorId: number) => {
    try {
      setLoadingPayments(true);
      const response = await subcontractorApi.getPayments(id!, {
        subcontractor_id: subcontractorId,
      });
      if (response.success) {
        setPayments(response.data || []);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách thanh toán");
    } finally {
      setLoadingPayments(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      // Kiểm tra nếu date không hợp lệ (1970 hoặc NaN)
      if (isNaN(date.getTime()) || date.getFullYear() < 1971) {
        return "-";
      }
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "-";
    }
  };

  const handleOpenFile = async (url: string, mimeType?: string) => {
    try {
      if (!url) {
        Alert.alert("Lỗi", "Không có đường dẫn file");
        return;
      }

      // Kiểm tra xem URL có hợp lệ không
      const fileUrl = url.startsWith("http") ? url : `http://localhost:8000/storage/${url}`;

      const canOpen = await Linking.canOpenURL(fileUrl);
      if (canOpen) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert("Lỗi", "Không thể mở file này");
      }
    } catch (error) {
      console.error("Error opening file:", error);
      Alert.alert("Lỗi", "Không thể mở file");
    }
  };

  const getProgressStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Hoàn thành";
      case "in_progress":
        return "Đang thi công";
      case "delayed":
        return "Chậm tiến độ";
      case "not_started":
      default:
        return "Chưa bắt đầu";
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Đã thanh toán";
      case "partial":
        return "Thanh toán một phần";
      case "pending":
      default:
        return "Chưa thanh toán";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "partial":
        return "#F59E0B";
      case "pending":
      default:
        return "#EF4444";
    }
  };

  const getPaymentItemStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#10B981";
      case "pending_accountant_confirmation":
        return "#3B82F6";
      case "pending_management_approval":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      case "draft":
      default:
        return "#6B7280";
    }
  };

  const renderSubcontractorItem = ({ item }: { item: Subcontractor }) => (
    <TouchableOpacity
      style={styles.subcontractorCard}
      onPress={() => {
        setSelectedSubcontractorDetail(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.subcontractorHeader}>
        <View style={styles.subcontractorInfo}>
          <Text style={styles.subcontractorName}>{item.name}</Text>
          {item.category && (
            <Text style={styles.subcontractorCategory}>Hạng mục: {item.category}</Text>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.progress_status === "completed"
                  ? "#10B98120"
                  : item.progress_status === "in_progress"
                    ? "#3B82F620"
                    : item.progress_status === "delayed"
                      ? "#EF444420"
                      : "#6B728020",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.progress_status === "completed"
                    ? "#10B981"
                    : item.progress_status === "in_progress"
                      ? "#3B82F6"
                      : item.progress_status === "delayed"
                        ? "#EF4444"
                        : "#6B7280",
              },
            ]}
          >
            {getProgressStatusText(item.progress_status)}
          </Text>
        </View>
      </View>

      {/* Financial Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin tài chính</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Tổng báo giá</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(item.total_quote)}
            </Text>
          </View>
        </View>
        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Tổng thanh toán</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(item.total_paid)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Trạng thái thanh toán</Text>
            <View
              style={[
                styles.paymentStatusBadge,
                {
                  backgroundColor: getPaymentStatusColor(item.payment_status) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.paymentStatusText,
                  { color: getPaymentStatusColor(item.payment_status) },
                ]}
              >
                {getPaymentStatusText(item.payment_status)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${item.total_quote > 0 ? (item.total_paid / item.total_quote) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Construction Progress */}
      {(item.progress_start_date || item.progress_end_date) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến độ thi công</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.dateLabel}>Từ ngày:</Text>
              <Text style={styles.dateValue}>
                {formatDate(item.progress_start_date)}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.dateLabel}>Đến ngày:</Text>
              <Text style={styles.dateValue}>
                {formatDate(item.progress_end_date)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Attachments */}
      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chứng từ lưu trữ</Text>
          <View style={styles.attachmentsList}>
            {item.attachments.map((attachment: any, index: number) => {
              const imageUrl = attachment.file_url || attachment.url || attachment.location ||
                (attachment.file_path ? `http://localhost:8000/storage/${attachment.file_path}` : null);
              const isImage = attachment.type === "image" ||
                attachment.mime_type?.startsWith("image/") ||
                (imageUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl));

              return (
                <TouchableOpacity
                  key={attachment.id || index}
                  style={styles.attachmentItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (isImage && imageUrl) {
                      const imageAttachments = item.attachments?.filter((att: any) => {
                        const attUrl = att.file_url || att.url || att.location ||
                          (att.file_path ? `http://localhost:8000/storage/${att.file_path}` : null);
                        return att.type === "image" ||
                          att.mime_type?.startsWith("image/") ||
                          (attUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(attUrl));
                      }) || [];

                      const index = imageAttachments.findIndex((att: any) => att.id === attachment.id);
                      if (index !== -1) {
                        setSelectedSubcontractorDetail(item);
                        setInitialImageIndex(index);
                        setImageViewerVisible(true);
                      }
                    } else {
                      handleOpenFile(imageUrl || "", attachment.mime_type);
                    }
                  }}
                >
                  {isImage && imageUrl ? (
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
                      {attachment.original_name || attachment.file_name || "File"}
                    </Text>
                    <Text style={styles.attachmentType}>
                      {attachment.type || attachment.mime_type || "Document"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Nhà Thầu Phụ" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  // Hiển thị thông báo RBAC nếu không có quyền
  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Nhà Thầu Phụ" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Nhà Thầu Phụ"
        showBackButton
        rightComponent={
          <PermissionGuard permission={Permissions.SUBCONTRACTOR_CREATE} projectId={id}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </PermissionGuard>
        }
      />

      <FlatList
        data={subcontractors}
        renderItem={renderSubcontractorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhà thầu phụ</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScreenHeader
            title="Thêm nhà thầu phụ"
            leftComponent={
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            }
          />

          <ScrollView style={styles.modalBody} nestedScrollEnabled={true}>
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chọn nhà thầu phụ</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    loadGlobalSubcontractors();
                    setShowGlobalList(true);
                  }}
                >
                  <Text style={[
                    styles.selectButtonText,
                    !formData.global_subcontractor_id && styles.selectButtonTextPlaceholder
                  ]}>
                    {formData.global_subcontractor_id
                      ? formData.name
                      : "Chọn từ danh sách nhà thầu phụ"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {formData.global_subcontractor_id && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        global_subcontractor_id: null,
                        name: "",
                        category: "",
                        bank_name: "",
                        bank_account_number: "",
                        bank_account_name: "",
                      });
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={styles.clearButtonText}>Xóa lựa chọn</Text>
                  </TouchableOpacity>
                )}
              </View>


              <CurrencyInput
                label="Tổng báo giá *"
                value={formData.total_quote}
                onChangeText={(amount) =>
                  setFormData({ ...formData, total_quote: amount })
                }
                placeholder="Nhập tổng báo giá"
              />


              {/* Payment Information Section */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên ngân hàng</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Vietcombank, Techcombank..."
                  value={formData.bank_name}
                  onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số tài khoản</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số tài khoản"
                  value={formData.bank_account_number}
                  onChangeText={(text) => setFormData({ ...formData, bank_account_number: text })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chủ tài khoản</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên chủ tài khoản"
                  value={formData.bank_account_name}
                  onChangeText={(text) => setFormData({ ...formData, bank_account_name: text })}
                  autoCapitalize="characters"
                />
              </View>

              {/* Progress Information Section */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Thông tin & Tiến độ</Text>

              <DatePickerInput
                label="Ngày bắt đầu"
                value={formData.progress_start_date}
                onChange={(date) => {
                  if (date) {
                    setFormData({ ...formData, progress_start_date: date });
                    // Tự động tính toán trạng thái
                    calculateProgressStatus(date, formData.progress_end_date);
                  }
                }}
                placeholder="Chọn ngày bắt đầu"
              />

              <DatePickerInput
                label="Ngày kết thúc"
                value={formData.progress_end_date}
                onChange={(date) => {
                  if (date) {
                    setFormData({ ...formData, progress_end_date: date });
                    // Tự động tính toán trạng thái
                    calculateProgressStatus(formData.progress_start_date, date);
                  }
                }}
                placeholder="Chọn ngày kết thúc"
                minimumDate={formData.progress_start_date || undefined}
              />

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Trạng thái</Text>
                <View style={styles.statusButtons}>
                  {[
                    { value: "not_started", label: "Chưa bắt đầu" },
                    { value: "in_progress", label: "Đang thực hiện" },
                    { value: "completed", label: "Đã hoàn thành" },
                    { value: "delayed", label: "Trễ tiến độ" },
                  ].map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.statusButton,
                        formData.progress_status === status.value && styles.statusButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, progress_status: status.value as any })}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          formData.progress_status === status.value && styles.statusButtonTextActive,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* File Upload Section */}
              <View style={styles.sectionDivider} />
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Báo giá, Hồ sơ liên quan</Text>
                <UniversalFileUploader
                  onUploadComplete={(files) => setUploadedFiles(files)}
                  multiple={true}
                  accept="all"
                  maxFiles={10}
                  initialFiles={uploadedFiles}
                  label="Chọn file (báo giá, hồ sơ...)"
                />
              </View>


              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={async () => {
                    if (!formData.total_quote || formData.total_quote <= 0) {
                      Alert.alert("Lỗi", "Vui lòng nhập tổng báo giá");
                      return;
                    }
                    if (!formData.global_subcontractor_id && !formData.name) {
                      Alert.alert("Lỗi", "Vui lòng chọn nhà thầu phụ từ danh sách hoặc nhập tên nhà thầu");
                      return;
                    }
                    try {
                      const attachmentIds = uploadedFiles
                        .filter(f => f.attachment_id || f.id)
                        .map(f => f.attachment_id || f.id!);

                      // Tự động tìm cost group mặc định cho nhà thầu phụ
                      let defaultCostGroupId = formData.cost_group_id;
                      if (!defaultCostGroupId) {
                        const subcontractorCostGroup = costGroups.find(
                          g => g.code === 'subcontractor' ||
                            g.name.toLowerCase().includes('nhà thầu phụ') ||
                            g.name.toLowerCase().includes('thầu phụ')
                        );
                        defaultCostGroupId = subcontractorCostGroup?.id || null;
                      }

                      const response = await subcontractorApi.createSubcontractor(id!, {
                        global_subcontractor_id: formData.global_subcontractor_id || undefined,
                        name: formData.name,
                        category: formData.category || undefined,
                        total_quote: formData.total_quote,
                        progress_start_date: formData.progress_start_date
                          ? formData.progress_start_date.toISOString().split("T")[0]
                          : undefined,
                        progress_end_date: formData.progress_end_date
                          ? formData.progress_end_date.toISOString().split("T")[0]
                          : undefined,
                        progress_status: formData.progress_status,
                        bank_name: formData.bank_name || undefined,
                        bank_account_number: formData.bank_account_number || undefined,
                        bank_account_name: formData.bank_account_name || undefined,
                        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
                        // Mặc định luôn tạo chi phí dự án
                        cost_group_id: defaultCostGroupId || undefined,
                        cost_date: formData.progress_start_date
                          ? formData.progress_start_date.toISOString().split("T")[0]
                          : new Date().toISOString().split("T")[0],
                        create_cost: true,
                      });
                      setModalVisible(false);
                      setFormData({
                        global_subcontractor_id: null,
                        name: "",
                        category: "",
                        bank_name: "",
                        bank_account_number: "",
                        bank_account_name: "",
                        total_quote: 0,
                        progress_start_date: null,
                        progress_end_date: null,
                        progress_status: "not_started",
                        cost_group_id: null,
                        cost_date: new Date(),
                        create_cost: false,
                      });
                      setUploadedFiles([]);
                      loadSubcontractors();
                      Alert.alert("Thành công", "Đã thêm nhà thầu phụ");
                    } catch (error: any) {
                      const errorMessage = error.userMessage || error.response?.data?.message || "Không thể thêm nhà thầu phụ";
                      Alert.alert("Lỗi", errorMessage);
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Thêm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Global Subcontractors List Picker - Đặt bên trong modal tạo */}
          {showGlobalList && (
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContainer}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Chọn nhà thầu phụ</Text>
                  <TouchableOpacity onPress={() => setShowGlobalList(false)}>
                    <Ionicons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                {loadingGlobal ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : globalSubcontractors.length === 0 ? (
                  <View style={styles.pickerEmptyContainer}>
                    <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.pickerEmptyText}>Chưa có nhà thầu phụ</Text>
                  </View>
                ) : (
                  <FlatList
                    data={globalSubcontractors}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.costGroupItem}
                        onPress={() => {
                          handleSelectGlobalSubcontractor(item);
                          setShowGlobalList(false);
                        }}
                      >
                        <View style={styles.costGroupItemContent}>
                          <Text style={styles.costGroupItemName}>{item.name}</Text>
                          {item.category && (
                            <Text style={styles.costGroupItemCode}>Loại: {item.category}</Text>
                          )}
                          {item.phone && (
                            <Text style={styles.costGroupItemDescription}>📞 {item.phone}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            </View>
          )}

        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedSubcontractorDetail(null);
        }}
      >
        <View style={styles.modalContainer}>
          <ScreenHeader
            title={selectedSubcontractorDetail?.name || "Chi tiết nhà thầu phụ"}
            leftComponent={
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedSubcontractorDetail(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            }
          />

          <ScrollView style={styles.modalBody} nestedScrollEnabled={true}>
            {selectedSubcontractorDetail && (
              <>
                {/* Financial Summary */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Thông tin tài chính</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hợp đồng:</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(selectedSubcontractorDetail.total_quote)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Đã thanh toán:</Text>
                    <Text style={[styles.detailValue, { color: "#10B981" }]}>
                      {formatCurrency(selectedSubcontractorDetail.total_paid)}
                    </Text>
                  </View>
                  {selectedSubcontractorDetail.approved_amount !== undefined &&
                    selectedSubcontractorDetail.approved_amount > selectedSubcontractorDetail.total_paid && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Đang chờ chi:</Text>
                        <Text style={[styles.detailValue, { color: "#3B82F6" }]}>
                          {formatCurrency(selectedSubcontractorDetail.approved_amount - selectedSubcontractorDetail.total_paid)}
                        </Text>
                      </View>
                    )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Còn lại:</Text>
                    <Text style={[styles.detailValue, { color: "#EF4444" }]}>
                      {formatCurrency(selectedSubcontractorDetail.total_quote - selectedSubcontractorDetail.total_paid)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${selectedSubcontractorDetail.total_quote > 0
                            ? (selectedSubcontractorDetail.total_paid / selectedSubcontractorDetail.total_quote) * 100
                            : 0}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Payments History */}
                {selectedSubcontractorDetail.payments && selectedSubcontractorDetail.payments.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Lịch sử thanh toán</Text>
                    {selectedSubcontractorDetail.payments.map((payment, idx) => (
                      <View key={payment.id} style={[
                        styles.paymentHistoryItem,
                        idx !== selectedSubcontractorDetail.payments!.length - 1 && styles.borderBottom
                      ]}>
                        <View style={styles.paymentHistoryLeft}>
                          <Text style={styles.paymentHistoryDate}>{formatDate(payment.payment_date)}</Text>
                          <Text style={styles.paymentHistoryStage}>{payment.payment_stage || "Thanh toán"}</Text>
                        </View>
                        <View style={styles.paymentHistoryRight}>
                          <Text style={styles.paymentHistoryAmount}>{formatCurrency(payment.amount)}</Text>
                          <Text style={[
                            styles.paymentHistoryStatus,
                            { color: getPaymentItemStatusColor(payment.status) }
                          ]}>{payment.status_label || payment.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Payment Schedule (Milestones) */}
                {selectedSubcontractorDetail.payment_schedule && selectedSubcontractorDetail.payment_schedule.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Tiến độ thanh toán theo kế hoạch</Text>
                    {selectedSubcontractorDetail.payment_schedule.map((milestone, idx) => (
                      <View key={idx} style={[
                        styles.milestoneItem,
                        idx !== selectedSubcontractorDetail.payment_schedule!.length - 1 && styles.borderBottom
                      ]}>
                        <View style={styles.milestoneLeft}>
                          <Text style={styles.milestoneName}>{milestone.milestone}</Text>
                          {milestone.due_date && (
                            <Text style={styles.milestoneDate}>Hạn: {formatDate(milestone.due_date)}</Text>
                          )}
                        </View>
                        <View style={styles.milestoneRight}>
                          <Text style={styles.milestoneAmount}>
                            {milestone.amount ? formatCurrency(milestone.amount) : `${milestone.percentage}%`}
                          </Text>
                          <Text style={styles.milestonePercentage}>{milestone.percentage}% giá trị</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Payment Information */}
                {(selectedSubcontractorDetail.bank_name ||
                  selectedSubcontractorDetail.bank_account_number ||
                  selectedSubcontractorDetail.bank_account_name) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Thông tin thanh toán</Text>
                      {selectedSubcontractorDetail.bank_name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Ngân hàng:</Text>
                          <Text style={styles.detailValue}>
                            {selectedSubcontractorDetail.bank_name}
                          </Text>
                        </View>
                      )}
                      {selectedSubcontractorDetail.bank_account_number && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Số tài khoản:</Text>
                          <TouchableOpacity
                            onPress={() => {
                              // Optional: Copy to clipboard
                              Alert.alert("Thông báo", "Đã sao chép số tài khoản");
                            }}
                          >
                            <Text style={[styles.detailValue, { color: "#3B82F6" }]}>
                              {selectedSubcontractorDetail.bank_account_number}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {selectedSubcontractorDetail.bank_account_name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Chủ tài khoản:</Text>
                          <Text style={[styles.detailValue, { fontWeight: "700" }]}>
                            {selectedSubcontractorDetail.bank_account_name}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                {/* Progress Information */}
                {(selectedSubcontractorDetail.progress_start_date ||
                  selectedSubcontractorDetail.progress_end_date) && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Thông tin & Tiến độ</Text>
                      {selectedSubcontractorDetail.progress_start_date && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Ngày bắt đầu:</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(selectedSubcontractorDetail.progress_start_date)}
                          </Text>
                        </View>
                      )}
                      {selectedSubcontractorDetail.progress_end_date && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Ngày kết thúc:</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(selectedSubcontractorDetail.progress_end_date)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Trạng thái:</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                selectedSubcontractorDetail.progress_status === "completed"
                                  ? "#10B98120"
                                  : selectedSubcontractorDetail.progress_status === "in_progress"
                                    ? "#3B82F620"
                                    : selectedSubcontractorDetail.progress_status === "delayed"
                                      ? "#EF444420"
                                      : "#6B728020",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  selectedSubcontractorDetail.progress_status === "completed"
                                    ? "#10B981"
                                    : selectedSubcontractorDetail.progress_status === "in_progress"
                                      ? "#3B82F6"
                                      : selectedSubcontractorDetail.progress_status === "delayed"
                                        ? "#EF4444"
                                        : "#6B7280",
                              },
                            ]}
                          >
                            {getProgressStatusText(selectedSubcontractorDetail.progress_status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                {/* Payment Management Button */}
                <PermissionGuard permission={Permissions.SUBCONTRACTOR_PAYMENT_CREATE} projectId={id}>
                  <View style={styles.detailSection}>
                    <TouchableOpacity
                      style={styles.managePaymentsButton}
                      onPress={() => {
                        setSelectedSubcontractor(selectedSubcontractorDetail);
                        loadPayments(selectedSubcontractorDetail.id);
                        setShowDetailModal(false);
                        setShowPaymentsModal(true);
                      }}
                    >
                      <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.managePaymentsButtonText}>Quản lý thanh toán</Text>
                    </TouchableOpacity>
                  </View>
                </PermissionGuard>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Payments Management Modal */}
      <Modal
        visible={showPaymentsModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowPaymentsModal(false);
          setSelectedSubcontractor(null);
          setPayments([]);
        }}
      >
        <View style={styles.modalContainer}>
          <ScreenHeader
            title={`Thanh toán: ${selectedSubcontractor?.name || ''}`}
            showBackButton
            onBackPress={() => {
              setShowPaymentsModal(false);
              setSelectedSubcontractor(null);
              setPayments([]);
              setShowPaymentForm(false);
            }}
          />

          <View style={styles.modalBody}>
            {showPaymentForm ? (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
              >
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Đợt thanh toán</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VD: Đợt 1, Nghiệm thu lần 1..."
                      value={paymentFormData.payment_stage}
                      onChangeText={(text) =>
                        setPaymentFormData({ ...paymentFormData, payment_stage: text })
                      }
                    />
                  </View>

                  <CurrencyInput
                    label="Số tiền *"
                    value={paymentFormData.amount}
                    onChangeText={(amount) =>
                      setPaymentFormData({ ...paymentFormData, amount })
                    }
                    placeholder="Nhập số tiền"
                  />

                  <DatePickerInput
                    label="Ngày thanh toán"
                    value={paymentFormData.payment_date ? new Date(paymentFormData.payment_date) : new Date()}
                    onChange={(date) => {
                      if (date) {
                        setPaymentFormData({
                          ...paymentFormData,
                          payment_date: date.toISOString().split("T")[0]
                        });
                      }
                    }}
                    placeholder="Chọn ngày thanh toán"
                  />

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phương thức thanh toán</Text>
                    <View style={styles.paymentMethodRow}>
                      {[
                        { value: "bank_transfer", label: "Chuyển khoản" },
                        { value: "cash", label: "Tiền mặt" },
                        { value: "check", label: "Séc" },
                        { value: "other", label: "Khác" },
                      ].map((method) => (
                        <TouchableOpacity
                          key={method.value}
                          style={[
                            styles.paymentMethodButton,
                            paymentFormData.payment_method === method.value &&
                            styles.paymentMethodButtonActive,
                          ]}
                          onPress={() =>
                            setPaymentFormData({
                              ...paymentFormData,
                              payment_method: method.value as any,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.paymentMethodText,
                              paymentFormData.payment_method === method.value &&
                              styles.paymentMethodTextActive,
                            ]}
                          >
                            {method.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Số tham chiếu</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Số chứng từ, số phiếu..."
                      value={paymentFormData.reference_number}
                      onChangeText={(text) =>
                        setPaymentFormData({ ...paymentFormData, reference_number: text })
                      }
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ghi chú</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Nhập ghi chú..."
                      value={paymentFormData.description}
                      onChangeText={(text) =>
                        setPaymentFormData({ ...paymentFormData, description: text })
                      }
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setShowPaymentForm(false);
                        setPaymentFormData({
                          payment_stage: "",
                          amount: 0,
                          payment_date: new Date().toISOString().split("T")[0],
                          payment_method: "bank_transfer",
                          reference_number: "",
                          description: "",
                        });
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={async () => {
                        // Validation
                        if (!selectedSubcontractor) {
                          Alert.alert("Lỗi", "Không tìm thấy thông tin nhà thầu phụ");
                          return;
                        }
                        if (!paymentFormData.amount || paymentFormData.amount <= 0) {
                          Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
                          return;
                        }
                        if (!paymentFormData.payment_date) {
                          Alert.alert("Lỗi", "Vui lòng chọn ngày thanh toán");
                          return;
                        }

                        try {
                          const paymentData = {
                            subcontractor_id: selectedSubcontractor.id,
                            amount: Number(paymentFormData.amount),
                            payment_date: paymentFormData.payment_date,
                            payment_method: paymentFormData.payment_method,
                            ...(paymentFormData.payment_stage && paymentFormData.payment_stage.trim() !== '' && {
                              payment_stage: String(paymentFormData.payment_stage).trim()
                            }),
                            ...(paymentFormData.reference_number && paymentFormData.reference_number.trim() !== '' && {
                              reference_number: String(paymentFormData.reference_number).trim()
                            }),
                            ...(paymentFormData.description && paymentFormData.description.trim() !== '' && {
                              description: String(paymentFormData.description).trim()
                            }),
                          };

                          await subcontractorApi.createPayment(id!, paymentData);
                          Alert.alert("Thành công", "Đã tạo phiếu chi");
                          setShowPaymentForm(false);
                          setPaymentFormData({
                            payment_stage: "",
                            amount: 0,
                            payment_date: new Date().toISOString().split("T")[0],
                            payment_method: "bank_transfer",
                            reference_number: "",
                            description: "",
                          });
                          loadPayments(selectedSubcontractor.id);
                          loadSubcontractors();
                        } catch (error: any) {
                          Alert.alert(
                            "Lỗi",
                            error.response?.data?.message || "Không thể tạo phiếu chi"
                          );
                        }
                      }}
                    >
                      <Text style={styles.submitButtonText}>Tạo phiếu chi</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            ) : (
              <>
                {/* Financial Summary Card */}
                <View style={styles.paymentSummaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Tổng hợp đồng</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(selectedSubcontractor?.total_quote || 0)}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Đã thanh toán</Text>
                      <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                        {formatCurrency(selectedSubcontractor?.total_paid || 0)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Còn lại</Text>
                      <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
                        {formatCurrency(
                          (selectedSubcontractor?.total_quote || 0) -
                          (selectedSubcontractor?.total_paid || 0)
                        )}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Tiến độ thanh toán</Text>
                      <Text style={styles.summaryValue}>
                        {selectedSubcontractor?.total_quote
                          ? Math.round((selectedSubcontractor.total_paid / selectedSubcontractor.total_quote) * 100)
                          : 0}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${selectedSubcontractor?.total_quote
                            ? (selectedSubcontractor.total_paid / selectedSubcontractor.total_quote) * 100
                            : 0
                            }%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.paymentsHeader}>
                  <Text style={styles.paymentsTitle}>
                    Danh sách thanh toán ({payments.length})
                  </Text>
                  <PermissionGuard permission={Permissions.SUBCONTRACTOR_PAYMENT_CREATE} projectId={id}>
                    <TouchableOpacity
                      style={styles.addPaymentButton}
                      onPress={() => setShowPaymentForm(true)}
                    >
                      <Ionicons name="add-circle" size={20} color="#3B82F6" />
                      <Text style={styles.addPaymentButtonText}>Tạo phiếu chi</Text>
                    </TouchableOpacity>
                  </PermissionGuard>
                </View>

                {loadingPayments ? (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : payments.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Chưa có phiếu chi nào</Text>
                  </View>
                ) : (
                  <FlatList
                    data={payments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <View style={styles.paymentItem}>
                        <View style={styles.paymentItemHeader}>
                          <View style={styles.paymentItemLeft}>
                            <Text style={styles.paymentNumber}>
                              {item.payment_number || `#${item.id}`}
                            </Text>
                            {item.payment_stage && (
                              <Text style={styles.paymentStage}>{item.payment_stage}</Text>
                            )}
                          </View>
                          <View
                            style={[
                              styles.paymentStatusBadge,
                              {
                                backgroundColor:
                                  item.status === "paid"
                                    ? "#10B98120"
                                    : item.status === "pending_accountant_confirmation"
                                      ? "#3B82F620"
                                      : item.status === "pending_management_approval"
                                        ? "#F59E0B20"
                                        : item.status === "rejected"
                                          ? "#EF444420"
                                          : "#9CA3AF20",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.paymentStatusText,
                                {
                                  color:
                                    item.status === "paid"
                                      ? "#10B981"
                                      : item.status === "pending_accountant_confirmation"
                                        ? "#3B82F6"
                                        : item.status === "pending_management_approval"
                                          ? "#F59E0B"
                                          : item.status === "rejected"
                                            ? "#EF4444"
                                            : "#6B7280",
                                },
                              ]}
                            >
                              {item.status_label || item.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.paymentItemBody}>
                          <Text style={styles.paymentAmount}>
                            {formatCurrency(item.amount)}
                          </Text>
                          {item.description && (
                            <Text style={styles.paymentDescription} numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                          <View style={styles.paymentInfoRow}>
                            <Text style={styles.paymentInfo}>
                              {item.payment_method_label || item.payment_method}
                            </Text>
                            {item.payment_date && (
                              <Text style={styles.paymentInfo}>
                                {formatDate(item.payment_date)}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.paymentActions}>
                          {item.status === "draft" && (
                            <TouchableOpacity
                              style={[styles.actionButton, styles.submitButton]}
                              onPress={async () => {
                                try {
                                  await subcontractorApi.submitPayment(id!, item.id);
                                  Alert.alert("Thành công", "Đã gửi phiếu chi để duyệt");
                                  loadPayments(selectedSubcontractor!.id);
                                  loadSubcontractors();
                                } catch (error: any) {
                                  Alert.alert(
                                    "Lỗi",
                                    error.response?.data?.message || "Không thể gửi phiếu chi"
                                  );
                                }
                              }}
                            >
                              <Text style={styles.actionButtonText}>Gửi duyệt</Text>
                            </TouchableOpacity>
                          )}
                          {item.status === "pending_management_approval" && (
                            <>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.approveButton]}
                                onPress={async () => {
                                  try {
                                    await subcontractorApi.approvePayment(id!, item.id);
                                    Alert.alert("Thành công", "Đã duyệt phiếu chi");
                                    loadPayments(selectedSubcontractor!.id);
                                    loadSubcontractors();
                                  } catch (error: any) {
                                    Alert.alert(
                                      "Lỗi",
                                      error.response?.data?.message || "Không thể duyệt phiếu chi"
                                    );
                                  }
                                }}
                              >
                                <Text style={styles.actionButtonText}>Duyệt</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={() => {
                                  Alert.prompt(
                                    "Từ chối phiếu chi",
                                    "Nhập lý do từ chối (tùy chọn):",
                                    async (reason) => {
                                      try {
                                        await subcontractorApi.rejectPayment(
                                          id!,
                                          item.id,
                                          reason || undefined
                                        );
                                        Alert.alert("Thành công", "Đã từ chối phiếu chi");
                                        loadPayments(selectedSubcontractor!.id);
                                        loadSubcontractors();
                                      } catch (error: any) {
                                        Alert.alert(
                                          "Lỗi",
                                          error.response?.data?.message ||
                                          "Không thể từ chối phiếu chi"
                                        );
                                      }
                                    }
                                  );
                                }}
                              >
                                <Text style={[styles.actionButtonText, { color: "#EF4444" }]}>
                                  Từ chối
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}
                          {(item.status === "pending_management_approval" || item.status === "pending_accountant_confirmation") && (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                              onPress={() => {
                                Alert.alert(
                                  "Hoàn duyệt phiếu chi",
                                  "Bạn có chắc chắn muốn đưa phiếu chi này về trạng thái nháp?",
                                  [
                                    { text: "Hủy", style: "cancel" },
                                    {
                                      text: "Hoàn duyệt",
                                      style: "destructive",
                                      onPress: async () => {
                                        try {
                                          await subcontractorApi.revertPaymentToDraft(id!, item.id);
                                          Alert.alert("Thành công", "Đã đưa phiếu chi về trạng thái nháp");
                                          loadPayments(selectedSubcontractor!.id);
                                          loadSubcontractors();
                                        } catch (error: any) {
                                          Alert.alert("Lỗi", error.response?.data?.message || "Không thể hoàn duyệt");
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.actionButtonText}>Hoàn duyệt</Text>
                            </TouchableOpacity>
                          )}
                          {item.status === "pending_accountant_confirmation" && (
                            <TouchableOpacity
                              style={[styles.actionButton, styles.paidButton]}
                              onPress={async () => {
                                try {
                                  await subcontractorApi.markPaymentAsPaid(id!, item.id);
                                  Alert.alert("Thành công", "Đã xác nhận thanh toán");
                                  loadPayments(selectedSubcontractor!.id);
                                  loadSubcontractors();
                                } catch (error: any) {
                                  Alert.alert(
                                    "Lỗi",
                                    error.response?.data?.message ||
                                    "Không thể xác nhận thanh toán"
                                  );
                                }
                              }}
                            >
                              <Text style={styles.actionButtonText}>Xác nhận đã trả</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ImageViewer */}
      {
        selectedSubcontractorDetail && (
          <ImageViewer
            visible={imageViewerVisible}
            images={
              selectedSubcontractorDetail.attachments?.filter((att: any) => {
                const attUrl = att.file_url || att.url || att.location ||
                  (att.file_path ? `http://localhost:8000/storage/${att.file_path}` : null);
                return att.type === "image" ||
                  att.mime_type?.startsWith("image/") ||
                  (attUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(attUrl));
              }).map((att: any) => ({
                uri: att.file_url || att.url || att.location ||
                  (att.file_path ? `http://localhost:8000/storage/${att.file_path}` : ""),
                name: att.original_name || att.file_name,
              })) || []
            }
            initialIndex={initialImageIndex}
            onClose={() => setImageViewerVisible(false)}
          />
        )
      }
    </View >
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  subcontractorCard: {
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
  subcontractorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  subcontractorInfo: {
    flex: 1,
    marginRight: 12,
  },
  subcontractorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  subcontractorCategory: {
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
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  dateRow: {
    flexDirection: "row",
    gap: 16,
  },
  dateItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  dateValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
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
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
    marginLeft: -24,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
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
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
  selectButtonTextPlaceholder: {
    color: "#6B7280",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearButtonText: {
    fontSize: 12,
    color: "#EF4444",
  },
  globalSubcontractorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  globalSubcontractorInfo: {
    flex: 1,
  },
  globalSubcontractorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  globalSubcontractorCategory: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  globalSubcontractorDetail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 24,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  required: {
    color: "#EF4444",
  },
  paymentMethodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentMethodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  paymentMethodButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  paymentMethodText: {
    fontSize: 14,
    color: "#6B7280",
  },
  paymentMethodTextActive: {
    color: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  paymentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  paymentsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  addPaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  addPaymentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  paymentItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  paymentItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  paymentItemLeft: {
    flex: 1,
  },
  paymentNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  paymentStage: {
    fontSize: 12,
    color: "#6B7280",
  },
  paymentItemBody: {
    marginBottom: 12,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  paymentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentInfo: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  paymentActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  paidButton: {
    backgroundColor: "#10B981",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pickerModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    zIndex: 9999,
    elevation: 9999,
  },
  pickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    zIndex: 10000,
    elevation: 10000,
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  pickerLoadingContainer: {
    padding: 32,
    alignItems: "center",
  },
  pickerEmptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  pickerEmptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  costGroupItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  costGroupItemActive: {
    backgroundColor: "#EFF6FF",
  },
  costGroupItemContent: {
    flex: 1,
  },
  costGroupItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  costGroupItemNameActive: {
    color: "#3B82F6",
  },
  costGroupItemCode: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  costGroupItemDescription: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  statusButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  statusButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  detailSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "right",
  },
  attachmentsList: {
    gap: 12,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  attachmentThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  attachmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
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
  managePaymentsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  managePaymentsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  paymentSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  paymentHistoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  paymentHistoryLeft: {
    flex: 1,
  },
  paymentHistoryDate: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  paymentHistoryStage: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  paymentHistoryRight: {
    alignItems: "flex-end",
  },
  paymentHistoryAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  paymentHistoryStatus: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  milestoneItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  milestoneLeft: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  milestoneDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  milestoneRight: {
    alignItems: "flex-end",
  },
  milestoneAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  milestonePercentage: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
});
