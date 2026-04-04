import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { costApi, Cost, revenueApi } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { ScreenHeader, DatePickerInput, CurrencyInput, PermissionDenied } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";

export default function CostsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission, loading: permissionLoading } = useProjectPermissions(id);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [summary, setSummary] = useState<{
    grouped?: Array<{
      category: string;
      category_label: string;
      total: number;
      count: number;
    }>;
    summary?: {
      total_amount: number;
      total_count: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<Date | null>(null);
  const [filterAmountMin, setFilterAmountMin] = useState<number | null>(null);
  const [filterAmountMax, setFilterAmountMax] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  // Accountant confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCostForConfirm, setSelectedCostForConfirm] = useState<Cost | null>(null);
  const [confirmUploadedFiles, setConfirmUploadedFiles] = useState<UploadedFile[]>([]);

  // Form state - chỉ cần các trường cơ bản cho chi phí "Khác"
  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    description: "",
    cost_date: new Date(),
  });

  useEffect(() => {
    loadCosts();
    loadSummary();
  }, [id, filterStatus, filterCategory, searchQuery]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCosts();
      loadSummary();
    }, [id])
  );

  const loadCosts = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);
      setPermissionMessage("");
      const response = await costApi.getCosts(id!, {
        status: filterStatus || undefined,
        category: filterCategory || undefined,
        search: searchQuery || undefined,
      });
      if (response.success) {
        let costsData = response.data.data || [];

        // Apply client-side filters for date range and amount range
        if (filterDateFrom) {
          costsData = costsData.filter((cost: Cost) => {
            const costDate = new Date(cost.cost_date);
            return costDate >= filterDateFrom;
          });
        }
        if (filterDateTo) {
          costsData = costsData.filter((cost: Cost) => {
            const costDate = new Date(cost.cost_date);
            costDate.setHours(23, 59, 59, 999);
            return costDate <= filterDateTo;
          });
        }
        if (filterAmountMin !== null) {
          costsData = costsData.filter((cost: Cost) => cost.amount >= filterAmountMin);
        }
        if (filterAmountMax !== null) {
          costsData = costsData.filter((cost: Cost) => cost.amount <= filterAmountMax);
        }

        setCosts(costsData);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem chi phí của dự án này.");
        setCosts([]);
      } else {
        console.error("Error loading costs:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await revenueApi.getCostsByCategory(id!);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  };


  const onRefresh = () => {
    setRefreshing(true);
    loadCosts();
    loadSummary();
  };

  const handleCreateCost = async () => {
    if (!formData.name || !formData.amount) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin (tên và số tiền)");
      return;
    }

    try {
      const attachmentIds = uploadedFiles
        .filter(f => f.attachment_id || f.id)
        .map(f => f.attachment_id || f.id!);

      // Chi phí khác không cần cost_group_id - để null, backend sẽ tự động set category = 'other'
      const response = await costApi.createCost(id!, {
        cost_group_id: undefined, // Không cần chọn nhóm chi phí
        name: formData.name,
        amount: formData.amount,
        description: formData.description || undefined,
        cost_date: formData.cost_date.toISOString().split("T")[0],
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã tạo chi phí");
        setShowCreateModal(false);
        resetForm();
        loadCosts();
        loadSummary();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo chi phí"
      );
    }
  };

  const handleSubmit = async (costId: number) => {
    try {
      const response = await costApi.submitCost(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã gửi để Ban điều hành duyệt");
        loadCosts();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể submit");
    }
  };

  const handleApproveManagement = async (costId: number) => {
    try {
      const response = await costApi.approveByManagement(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã duyệt (Ban điều hành)");
        loadCosts();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
    }
  };

  const handleApproveAccountant = (costId: number) => {
    const cost = costs.find(c => c.id === costId);
    if (cost) {
      setSelectedCostForConfirm(cost);
      setConfirmUploadedFiles([]);
      setShowConfirmModal(true);
    }
  };

  const submitAccountantConfirmation = async () => {
    if (!selectedCostForConfirm) return;

    // Validate: require at least one file
    if (confirmUploadedFiles.length === 0) {
      Alert.alert("Lỗi", "Vui lòng upload ít nhất một chứng từ thanh toán");
      return;
    }

    try {
      const attachmentIds = confirmUploadedFiles
        .filter(f => f.attachment_id || f.id)
        .map(f => f.attachment_id || f.id!);

      const response = await costApi.approveByAccountant(id!, selectedCostForConfirm.id, {
        attachment_ids: attachmentIds
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận thanh toán (Kế toán)");
        setShowConfirmModal(false);
        setSelectedCostForConfirm(null);
        setConfirmUploadedFiles([]);
        loadCosts();
        loadSummary();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác nhận");
    }
  };

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCostForReject, setSelectedCostForReject] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = (costId: number) => {
    setSelectedCostForReject(costId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!selectedCostForReject || !rejectReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const response = await costApi.rejectCost(id!, selectedCostForReject, rejectReason.trim());
      if (response.success) {
        Alert.alert("Thành công", "Đã từ chối chi phí");
        setShowRejectModal(false);
        setSelectedCostForReject(null);
        setRejectReason("");
        loadCosts();
        loadSummary();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      amount: 0,
      description: "",
      cost_date: new Date(),
    });
    setUploadedFiles([]);
  };


  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "0 ₫";
    }
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

  const getCategoryLabel = (cost: Cost) => {
    // Sử dụng cost_group.name nếu có, fallback về category_label
    return cost.cost_group?.name || cost.category_label || "Chưa phân loại";
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterStatus) count++;
    if (filterCategory) count++;
    if (searchQuery.trim()) count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    if (filterAmountMin !== null) count++;
    if (filterAmountMax !== null) count++;
    return count;
  };

  const clearAllFilters = () => {
    setFilterStatus(null);
    setFilterCategory(null);
    setSearchQuery("");
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setFilterAmountMin(null);
    setFilterAmountMax(null);
  };

  const renderCostItem = ({ item }: { item: Cost }) => (
    <TouchableOpacity
      style={styles.costCard}
      onPress={() => router.push(`/projects/${id}/costs/${item.id}`)}
    >
      <View style={styles.costHeader}>
        <View style={styles.costHeaderLeft}>
          <Text style={styles.costName}>{item.name}</Text>
          <Text style={styles.costCategory}>
            {getCategoryLabel(item)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.costDetails}>
        <Text style={styles.costAmount}>
          {formatCurrency(item.amount)}
        </Text>
        <Text style={styles.costDate}>
          {new Date(item.cost_date).toLocaleDateString("vi-VN")}
        </Text>
      </View>

      {item.description && (
        <Text style={styles.costDescription}>{item.description}</Text>
      )}

      {/* Linked Bill Indicator */}
      {item.material_bill && (
        <View style={styles.linkedBillIndicator}>
          <Ionicons name="receipt-outline" size={14} color="#3B82F6" />
          <Text style={styles.linkedBillIndicatorText}>
            Phiếu VL: {item.material_bill.bill_number || `#${item.material_bill.id}`}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#93C5FD" />
        </View>
      )}

      {/* Actions based on status */}
      {item.status === "draft" && (
        <PermissionGuard permission={Permissions.COST_SUBMIT} projectId={id}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
              onPress={() => handleSubmit(item.id)}
            >
              <Text style={styles.actionButtonText}>Gửi duyệt</Text>
            </TouchableOpacity>
          </View>
        </PermissionGuard>
      )}

      {item.status === "pending_management_approval" && (
        <PermissionGuard permission={Permissions.COST_APPROVE_MANAGEMENT} projectId={id}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveManagement(item.id)}
            >
              <Text style={styles.actionButtonText}>Duyệt (Ban điều hành)</Text>
            </TouchableOpacity>
            <PermissionGuard permission={Permissions.COST_REJECT} projectId={id}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item.id)}
              >
                <Text style={styles.actionButtonText}>Từ chối</Text>
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        </PermissionGuard>
      )}

      {item.status === "pending_accountant_approval" && (
        <PermissionGuard permission={Permissions.COST_APPROVE_ACCOUNTANT} projectId={id}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveAccountant(item.id)}
            >
              <Text style={styles.actionButtonText}>Xác nhận (Kế toán)</Text>
            </TouchableOpacity>
            <PermissionGuard permission={Permissions.COST_REJECT} projectId={id}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item.id)}
              >
                <Text style={styles.actionButtonText}>Từ chối</Text>
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        </PermissionGuard>
      )}
    </TouchableOpacity>
  );

  if ((loading || permissionLoading) && !refreshing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Phí Dự Án" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Phí Dự Án" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Chi Phí Dự Án"
        showBackButton
        rightComponent={
          <PermissionGuard permission={Permissions.COST_CREATE} projectId={id}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </PermissionGuard>
        }
      />

      {/* Summary by Category */}
      {summary && summary.grouped && summary.grouped.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Tổng Hợp Theo Nhóm</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {summary.grouped.map((group: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.summaryCard}
                onPress={() => router.push({
                  pathname: `/projects/${id}/costs/by-group/${group.category}`,
                  params: { label: group.category_label }
                })}
                activeOpacity={0.7}
              >
                <Text style={styles.summaryCategory}>{group.category_label}</Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(group.total)}
                </Text>
                <Text style={styles.summaryCount}>{group.count} mục</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.summaryChevron} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.totalSummary}>
            <Text style={styles.totalSummaryLabel}>Tổng chi phí</Text>
            <Text style={styles.totalSummaryValue}>
              {formatCurrency(summary.summary.total_amount)}
            </Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên, mô tả..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchButton}
            >
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !filterStatus && getActiveFilterCount() === 0 && styles.filterChipActive,
            ]}
            onPress={() => {
              if (getActiveFilterCount() === 0) return;
              clearAllFilters();
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                !filterStatus && getActiveFilterCount() === 0 && styles.filterChipTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {["draft", "pending_management_approval", "pending_accountant_approval", "approved"].map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filterStatus === status && styles.filterChipActive,
                ]}
                onPress={() =>
                  setFilterStatus(filterStatus === status ? null : status)
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive,
                  ]}
                >
                  {getStatusText(status as Cost["status"])}
                </Text>
              </TouchableOpacity>
            )
          )}
          {summary?.grouped && summary.grouped.length > 0 && (
            <>
              {summary.grouped.map((group: any, index: number) => (
                <TouchableOpacity
                  key={`category-${index}`}
                  style={[
                    styles.filterChip,
                    filterCategory === group.category && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setFilterCategory(filterCategory === group.category ? null : group.category)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterCategory === group.category && styles.filterChipTextActive,
                    ]}
                  >
                    {group.category_label}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          <TouchableOpacity
            style={[
              styles.filterChip,
              styles.advancedFilterChip,
              getActiveFilterCount() > 0 && styles.filterChipActive,
            ]}
            onPress={() => setShowAdvancedFilter(true)}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={getActiveFilterCount() > 0 ? "#FFFFFF" : "#6B7280"}
              style={styles.filterIcon}
            />
            <Text
              style={[
                styles.filterChipText,
                getActiveFilterCount() > 0 && styles.filterChipTextActive,
              ]}
            >
              Lọc nâng cao
            </Text>
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Costs List */}
      <FlatList
        data={costs}
        renderItem={renderCostItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calculator-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Chưa có chi phí nào</Text>
          </View>
        }
      />

      {/* Create Cost Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm Chi Phí</Text>
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
            style={styles.modalContent}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Thông tin về Chi phí khác */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <View style={styles.infoBoxContent}>
                <Text style={styles.infoBoxTitle}>Chi phí khác</Text>
                <Text style={styles.infoBoxText}>
                  Các khoản chi hợp lệ phát sinh trong quá trình thi công dự án, không thuộc nhóm vật liệu, thiết bị, nhân công hoặc thầu phụ, được phê duyệt và ghi nhận riêng trong hệ thống.
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên chi phí *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên chi phí"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            <CurrencyInput
              label="Số tiền *"
              value={formData.amount}
              onChangeText={(amount) =>
                setFormData({ ...formData, amount })
              }
              placeholder="Nhập số tiền"
            />

            <DatePickerInput
              label="Ngày phát sinh *"
              value={formData.cost_date}
              onChange={(date) => {
                if (date) {
                  setFormData({ ...formData, cost_date: date });
                }
              }}
              placeholder="Chọn ngày"
              required
            />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả (tùy chọn)"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Đính kèm tài liệu</Text>
              <UniversalFileUploader
                onUploadComplete={(files) => setUploadedFiles(files)}
                multiple={true}
                accept="all"
                maxFiles={10}
                initialFiles={uploadedFiles}
                label="Chọn file (hóa đơn, báo giá...)"
              />
            </View>

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
                onPress={handleCreateCost}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Reject Modal */}
      {/* Updated Reject Modal with Enhanced UX */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRejectModal(false);
          setSelectedCostForReject(null);
          setRejectReason("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.rejectModalCard}>
                <View style={styles.modalHeaderEnhanced}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="alert-circle" size={32} color="#EF4444" />
                  </View>
                  <Text style={styles.modalTitleEnhanced}>Từ chối chi phí</Text>
                  <Text style={styles.modalSubtitle}>
                    Vui lòng nhập lý do từ chối để người tạo có thể chỉnh sửa lại.
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInputEnhanced}
                  placeholder="Nhập lý do từ chối (bắt buộc)..."
                  placeholderTextColor="#9CA3AF"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus
                />

                <View style={[styles.modalActions, { marginBottom: 0 }]}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => {
                      setShowRejectModal(false);
                      setSelectedCostForReject(null);
                      setRejectReason("");
                    }}
                  >
                    <Text style={styles.modalCancelText}>Hủy bỏ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalConfirmButton,
                      !rejectReason.trim() && styles.modalButtonDisabled,
                    ]}
                    onPress={submitReject}
                    disabled={!rejectReason.trim()}
                  >
                    <Text style={styles.modalConfirmText}>
                      Xác nhận
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Accountant Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowConfirmModal(false);
          setSelectedCostForConfirm(null);
          setConfirmUploadedFiles([]);
        }}
      >
        <View style={styles.modalContainer}>
          <ScreenHeader
            title="Xác Nhận Thanh Toán"
            showBackButton
            onBackPress={() => {
              setShowConfirmModal(false);
              setSelectedCostForConfirm(null);
              setConfirmUploadedFiles([]);
            }}
          />

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {selectedCostForConfirm && (
              <>
                {/* Cost Information */}
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                  <View style={styles.infoBoxContent}>
                    <Text style={styles.infoBoxTitle}>Thông tin chi phí</Text>
                    <Text style={styles.infoBoxText}>
                      {selectedCostForConfirm.name}
                    </Text>
                    <Text style={styles.costAmount}>
                      {formatCurrency(selectedCostForConfirm.amount)}
                    </Text>
                  </View>
                </View>

                {/* File Upload Section */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Chứng từ thanh toán *</Text>
                  <Text style={styles.helperText}>
                    Vui lòng upload chứng từ thanh toán (hóa đơn, biên lai, chuyển khoản...)
                  </Text>
                  <UniversalFileUploader
                    onUploadComplete={(files) => setConfirmUploadedFiles(files)}
                    multiple={true}
                    accept="all"
                    maxFiles={10}
                    initialFiles={confirmUploadedFiles}
                    label="Chọn file chứng từ"
                  />
                  {confirmUploadedFiles.length === 0 && (
                    <Text style={styles.errorText}>
                      * Bắt buộc phải upload ít nhất 1 file
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowConfirmModal(false);
                setSelectedCostForConfirm(null);
                setConfirmUploadedFiles([]);
              }}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={submitAccountantConfirmation}
            >
              <Text style={styles.saveButtonText}>Xác Nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Advanced Filter Modal */}
      <Modal
        visible={showAdvancedFilter}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdvancedFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lọc Nâng Cao</Text>
              <TouchableOpacity
                onPress={() => setShowAdvancedFilter(false)}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={true}>
              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Khoảng thời gian</Text>
                <DatePickerInput
                  label="Từ ngày"
                  value={filterDateFrom}
                  onChange={(date) => setFilterDateFrom(date)}
                  placeholder="Chọn ngày bắt đầu"
                  maximumDate={filterDateTo || undefined}
                />
                <DatePickerInput
                  label="Đến ngày"
                  value={filterDateTo}
                  onChange={(date) => setFilterDateTo(date)}
                  placeholder="Chọn ngày kết thúc"
                  minimumDate={filterDateFrom || undefined}
                />
                {(filterDateFrom || filterDateTo) && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => {
                      setFilterDateFrom(null);
                      setFilterDateTo(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={styles.clearFilterText}>Xóa lọc ngày</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Amount Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Khoảng giá tiền</Text>
                <CurrencyInput
                  label="Từ số tiền"
                  value={filterAmountMin || 0}
                  onChangeText={(amount) => setFilterAmountMin(amount > 0 ? amount : null)}
                  placeholder="Nhập số tiền tối thiểu"
                />
                <CurrencyInput
                  label="Đến số tiền"
                  value={filterAmountMax || 0}
                  onChangeText={(amount) => setFilterAmountMax(amount > 0 ? amount : null)}
                  placeholder="Nhập số tiền tối đa"
                />
                {(filterAmountMin !== null || filterAmountMax !== null) && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => {
                      setFilterAmountMin(null);
                      setFilterAmountMax(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={styles.clearFilterText}>Xóa lọc giá tiền</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Trạng thái</Text>
                <View style={styles.filterOptions}>
                  {["draft", "pending_management_approval", "pending_accountant_approval", "approved", "rejected"].map(
                    (status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.filterOption,
                          filterStatus === status && styles.filterOptionActive,
                        ]}
                        onPress={() =>
                          setFilterStatus(filterStatus === status ? null : status)
                        }
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            filterStatus === status && styles.filterOptionTextActive,
                          ]}
                        >
                          {getStatusText(status as Cost["status"])}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              {/* Category Filter */}
              {summary?.grouped && summary.grouped.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Nhóm chi phí</Text>
                  <View style={styles.filterOptions}>
                    {summary.grouped.map((group: any, index: number) => (
                      <TouchableOpacity
                        key={`category-filter-${index}`}
                        style={[
                          styles.filterOption,
                          filterCategory === group.category && styles.filterOptionActive,
                        ]}
                        onPress={() =>
                          setFilterCategory(filterCategory === group.category ? null : group.category)
                        }
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            filterCategory === group.category && styles.filterOptionTextActive,
                          ]}
                        >
                          {group.category_label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.clearAllButton]}
                onPress={clearAllFilters}
              >
                <Text style={styles.clearAllButtonText}>Xóa tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={() => {
                  setShowAdvancedFilter(false);
                  loadCosts();
                }}
              >
                <Text style={styles.applyButtonText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: "center",
    position: "relative",
  },
  summaryChevron: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  summaryCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    textAlign: "center",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  totalSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalSummaryLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalSummaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
  },
  searchSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  filters: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filtersContent: {
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  advancedFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterIcon: {
    marginRight: 0,
  },
  filterBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3B82F6",
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  costHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  costHeaderLeft: {
    flex: 1,
  },
  costName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  costCategory: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  costDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  costAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EF4444",
  },
  costDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  costDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
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
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    position: "relative",
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
  modalContent: {
    flex: 1,
  },
  modalBodyContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
    paddingHorizontal: 16,
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
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    marginTop: 4,
    fontStyle: "italic",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  categoryButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  categoryButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
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
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    maxHeight: 300,
    padding: 16,
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    width: "100%",
  },
  filterModalBody: {
    maxHeight: 500,
    padding: 16,
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
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  filterOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  clearFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearFilterText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  filterModalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  clearAllButton: {
    backgroundColor: "#E5E7EB",
    flex: 1,
  },
  clearAllButtonText: {
    color: "#1F2937",
    fontWeight: "600",
  },
  applyButton: {
    backgroundColor: "#3B82F6",
    flex: 1,
  },
  applyButtonText: {
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
    minHeight: 48,
  },
  selectButtonText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  selectButtonPlaceholder: {
    color: "#9CA3AF",
  },
  clearSelectionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearSelectionText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  helperTextSmall: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stockInfo: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  materialInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  fallbackCategoryGrid: {
    marginTop: 8,
    padding: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  goToSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  goToSettingsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
  pickerEmptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  pickerEmptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  pickerEmptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningBoxContent: {
    flex: 1,
  },
  warningBoxText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 4,
  },
  warningBoxSubtext: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
    marginBottom: 8,
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
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  // New Styles for Enhanced Reject Modal
  rejectModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeaderEnhanced: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitleEnhanced: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
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
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  modalInputEnhanced: {
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
  linkedBillIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  linkedBillIndicatorText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
    flex: 1,
  },
});
