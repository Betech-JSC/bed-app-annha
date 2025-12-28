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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { costApi, Cost, revenueApi } from "@/api/revenueApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { subcontractorApi, Subcontractor } from "@/api/subcontractorApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";

export default function CostsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasPermission } = useProjectPermissions(id);
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
  const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
  const [loadingCostGroups, setLoadingCostGroups] = useState(false);
  const [showCostGroupPicker, setShowCostGroupPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loadingSubcontractors, setLoadingSubcontractors] = useState(false);
  const [showSubcontractorPicker, setShowSubcontractorPicker] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    cost_group_id: null as number | null,
    subcontractor_id: null as number | null,
    name: "",
    amount: "",
    description: "",
    cost_date: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCostGroup, setSelectedCostGroup] = useState<CostGroup | null>(null);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);

  useEffect(() => {
    loadCosts();
    loadSummary();
    loadCostGroups();
    loadSubcontractors();
  }, [id, filterStatus, filterCategory]);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const response = await costApi.getCosts(id!, {
        status: filterStatus || undefined,
        category: filterCategory || undefined,
      });
      if (response.success) {
        setCosts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading costs:", error);
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

  const loadCostGroups = async () => {
    try {
      setLoadingCostGroups(true);
      const response = await costGroupApi.getCostGroups({ active_only: true });
      if (response.success) {
        const data = response.data?.data || response.data || [];
        setCostGroups(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading cost groups:", error);
    } finally {
      setLoadingCostGroups(false);
    }
  };

  const loadSubcontractors = async () => {
    try {
      setLoadingSubcontractors(true);
      const response = await subcontractorApi.getSubcontractors(id!);
      if (response.success) {
        // Backend trả về { success: true, data: [...] }
        const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setSubcontractors(data);
      } else {
        setSubcontractors([]);
      }
    } catch (error) {
      console.error("Error loading subcontractors:", error);
      setSubcontractors([]);
    } finally {
      setLoadingSubcontractors(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCosts();
    loadSummary();
  };

  const handleCreateCost = async () => {
    if (!formData.name || !formData.amount) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (!formData.cost_group_id) {
      Alert.alert("Lỗi", "Vui lòng chọn nhóm chi phí từ danh sách đã thiết lập");
      return;
    }

    // Kiểm tra nếu cost group liên quan đến nhà thầu phụ
    const selectedGroup = costGroups.find(g => g.id === formData.cost_group_id);
    const isSubcontractorCostGroup = selectedGroup && (
      selectedGroup.code === 'subcontractor' ||
      selectedGroup.name.toLowerCase().includes('nhà thầu phụ') ||
      selectedGroup.name.toLowerCase().includes('thầu phụ')
    );

    if (isSubcontractorCostGroup && !formData.subcontractor_id) {
      Alert.alert("Lỗi", "Vui lòng chọn nhà thầu phụ liên quan cho loại chi phí này");
      return;
    }

    try {
      const attachmentIds = uploadedFiles
        .filter(f => f.attachment_id || f.id)
        .map(f => f.attachment_id || f.id!);

      const response = await costApi.createCost(id!, {
        cost_group_id: formData.cost_group_id,
        name: formData.name,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        cost_date: formData.cost_date.toISOString().split("T")[0],
        subcontractor_id: formData.subcontractor_id || undefined,
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

  const handleApproveAccountant = async (costId: number) => {
    try {
      const response = await costApi.approveByAccountant(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận (Kế toán)");
        loadCosts();
        loadSummary();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác nhận");
    }
  };

  const resetForm = () => {
    setFormData({
      cost_group_id: null,
      subcontractor_id: null,
      name: "",
      amount: "",
      description: "",
      cost_date: new Date(),
    });
    setSelectedCostGroup(null);
    setSelectedSubcontractor(null);
    setUploadedFiles([]);
  };

  const isSubcontractorCostGroup = (costGroup: CostGroup | null): boolean => {
    if (!costGroup) return false;
    return costGroup.code === 'subcontractor' ||
      costGroup.name.toLowerCase().includes('nhà thầu phụ') ||
      costGroup.name.toLowerCase().includes('thầu phụ');
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

  const getCategoryLabel = (cost: Cost) => {
    // Sử dụng cost_group.name nếu có, fallback về category_label
    return cost.cost_group?.name || cost.category_label || "Chưa phân loại";
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

      {/* Actions based on status */}
      {item.status === "draft" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.submitButton]}
            onPress={() => handleSubmit(item.id)}
          >
            <Text style={styles.actionButtonText}>Gửi duyệt</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "pending_management_approval" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveManagement(item.id)}
          >
            <Text style={styles.actionButtonText}>Duyệt (Ban điều hành)</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "pending_accountant_approval" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveAccountant(item.id)}
          >
            <Text style={styles.actionButtonText}>Xác nhận (Kế toán)</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Phí Dự Án</Text>
        <PermissionGuard permission="costs.create" projectId={id}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </PermissionGuard>
      </View>

      {/* Summary by Category */}
      {summary && summary.grouped && summary.grouped.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Tổng Hợp Theo Nhóm</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {summary.grouped.map((group: any, index: number) => (
              <View key={index} style={styles.summaryCard}>
                <Text style={styles.summaryCategory}>{group.category_label}</Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(group.total)}
                </Text>
                <Text style={styles.summaryCount}>{group.count} mục</Text>
              </View>
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

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !filterStatus && styles.filterChipActive,
            ]}
            onPress={() => setFilterStatus(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !filterStatus && styles.filterChipTextActive,
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
        </ScrollView>
      </View>

      {/* Costs List */}
      <FlatList
        data={costs}
        renderItem={renderCostItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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
        presentationStyle="pageSheet"
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
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nhóm chi phí *</Text>
              {costGroups.length > 0 ? (
                <>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => {
                      loadCostGroups();
                      setShowCostGroupPicker(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        !selectedCostGroup && styles.selectButtonPlaceholder,
                      ]}
                    >
                      {selectedCostGroup
                        ? selectedCostGroup.name
                        : "Chọn nhóm chi phí"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  {selectedCostGroup && (
                    <TouchableOpacity
                      style={styles.clearSelectionButton}
                      onPress={() => {
                        setSelectedCostGroup(null);
                        setFormData({ ...formData, cost_group_id: null });
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.clearSelectionText}>Xóa lựa chọn</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.fallbackCategoryGrid}>
                  <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" style={{ marginBottom: 12, alignSelf: "center" }} />
                  <Text style={styles.helperText}>
                    Chưa có nhóm chi phí được thiết lập
                  </Text>
                  <Text style={styles.helperTextSmall}>
                    Vui lòng vào{" "}
                    <Text style={styles.linkText}>Cấu hình → Nhóm Chi Phí Dự Án</Text>
                    {" "}để tạo nhóm chi phí trước khi thêm chi phí cho dự án.
                  </Text>
                  <TouchableOpacity
                    style={styles.goToSettingsButton}
                    onPress={() => {
                      setShowCreateModal(false);
                      router.push("/settings/cost-groups");
                    }}
                  >
                    <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.goToSettingsButtonText}>
                      Đi đến Cấu hình
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Số tiền *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số tiền"
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount: text })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày phát sinh *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {formData.cost_date.toLocaleDateString("vi-VN")}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.cost_date}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setFormData({ ...formData, cost_date: date });
                    }
                  }}
                />
              )}
            </View>

            {/* Subcontractor Selection - chỉ hiển thị khi chọn cost group nhà thầu phụ */}
            {selectedCostGroup && isSubcontractorCostGroup(selectedCostGroup) && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nhà thầu phụ *</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    loadSubcontractors();
                    setShowSubcontractorPicker(true);
                  }}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      !selectedSubcontractor && styles.selectButtonPlaceholder,
                    ]}
                  >
                    {selectedSubcontractor
                      ? selectedSubcontractor.name
                      : "Chọn nhà thầu phụ"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {selectedSubcontractor && (
                  <TouchableOpacity
                    style={styles.clearSelectionButton}
                    onPress={() => {
                      setSelectedSubcontractor(null);
                      setFormData({ ...formData, subcontractor_id: null });
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                    <Text style={styles.clearSelectionText}>Xóa lựa chọn</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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

          {/* Cost Group Picker Modal - Đặt bên trong modal tạo cost */}
          {showCostGroupPicker && (
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContainer}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Chọn Nhóm Chi Phí</Text>
                  <TouchableOpacity onPress={() => setShowCostGroupPicker(false)}>
                    <Ionicons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                {loadingCostGroups ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : (
                  <FlatList
                    data={costGroups}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.costGroupItem,
                          selectedCostGroup?.id === item.id && styles.costGroupItemActive,
                        ]}
                        onPress={() => {
                          const newCostGroup = item;
                          setSelectedCostGroup(newCostGroup);
                          setFormData({ ...formData, cost_group_id: newCostGroup.id });

                          // Nếu không phải cost group nhà thầu phụ, xóa subcontractor
                          if (!isSubcontractorCostGroup(newCostGroup)) {
                            setFormData(prev => ({ ...prev, subcontractor_id: null }));
                            setSelectedSubcontractor(null);
                          }

                          setShowCostGroupPicker(false);
                        }}
                      >
                        <View style={styles.costGroupItemContent}>
                          <Text
                            style={[
                              styles.costGroupItemName,
                              selectedCostGroup?.id === item.id && styles.costGroupItemNameActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.code && (
                            <Text style={styles.costGroupItemCode}>Mã: {item.code}</Text>
                          )}
                          {item.description && (
                            <Text style={styles.costGroupItemDescription} numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                        {selectedCostGroup?.id === item.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.pickerEmptyContainer}>
                        <Ionicons name="folder-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.pickerEmptyText}>Chưa có nhóm chi phí nào</Text>
                        <Text style={styles.pickerEmptySubtext}>
                          Vui lòng tạo nhóm chi phí trong phần Cấu hình
                        </Text>
                      </View>
                    }
                  />
                )}
              </View>
            </View>
          )}

          {/* Subcontractor Picker Modal - Đặt bên trong modal tạo cost */}
          {showSubcontractorPicker && (
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContainer}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Chọn Nhà Thầu Phụ</Text>
                  <TouchableOpacity onPress={() => setShowSubcontractorPicker(false)}>
                    <Ionicons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                {loadingSubcontractors ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : (
                  <FlatList
                    data={subcontractors}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.costGroupItem,
                          selectedSubcontractor?.id === item.id && styles.costGroupItemActive,
                        ]}
                        onPress={() => {
                          setSelectedSubcontractor(item);
                          setFormData({ ...formData, subcontractor_id: item.id });
                          setShowSubcontractorPicker(false);
                        }}
                      >
                        <View style={styles.costGroupItemContent}>
                          <Text
                            style={[
                              styles.costGroupItemName,
                              selectedSubcontractor?.id === item.id && styles.costGroupItemNameActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.category && (
                            <Text style={styles.costGroupItemCode}>Loại: {item.category}</Text>
                          )}
                        </View>
                        {selectedSubcontractor?.id === item.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.pickerEmptyContainer}>
                        <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.pickerEmptyText}>Chưa có nhà thầu phụ nào</Text>
                      </View>
                    }
                  />
                )}
              </View>
            </View>
          )}
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
    flex: 1,
    marginLeft: 12,
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
  filters: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
});
