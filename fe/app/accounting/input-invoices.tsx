import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { inputInvoiceApi, InputInvoice, CreateInputInvoiceData } from "@/api/inputInvoiceApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Permissions } from "@/constants/Permissions";
import { usePermissions } from "@/hooks/usePermissions";

export default function InputInvoicesScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission } = usePermissions();
  const [invoices, setInvoices] = useState<InputInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InputInvoice | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);

  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [filterInvoiceType, setFilterInvoiceType] = useState<string | null>(null);
  const [filterFromDate, setFilterFromDate] = useState<string | null>(null);
  const [filterToDate, setFilterToDate] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Summary statistics
  const [summary, setSummary] = useState({
    total: 0,
    totalAmount: 0,
    totalVat: 0,
    totalBeforeVat: 0,
  });

  // Form state
  const [formData, setFormData] = useState<CreateInputInvoiceData>({
    project_id: undefined,
    invoice_type: "",
    issue_date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    supplier_name: "",
    amount_before_vat: 0,
    vat_percentage: 10,
    description: "",
    notes: "",
  });
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadInvoices();
      loadProjects();
    }, [])
  );

  const loadProjects = async () => {
    try {
      const response = await projectApi.getProjects();
      if (response.success) {
        setProjects(response.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await inputInvoiceApi.getAll();
      console.log("Input Invoice API Response:", JSON.stringify(response, null, 2));

      let invoicesList: InputInvoice[] = [];

      if (response && response.success) {
        // Handle paginated response (Laravel paginate returns data in 'data' key)
        const responseData = response.data;
        console.log("Response Data:", JSON.stringify(responseData, null, 2));

        if (responseData) {
          // Case 1: Paginated response - data is in responseData.data
          if (responseData.data && Array.isArray(responseData.data)) {
            invoicesList = responseData.data;
            console.log("Found paginated data:", invoicesList.length, "invoices");
          }
          // Case 2: Direct array response
          else if (Array.isArray(responseData)) {
            invoicesList = responseData;
            console.log("Found direct array:", invoicesList.length, "invoices");
          }
          // Case 3: Nested data structure
          else if (responseData.data && Array.isArray(responseData.data)) {
            invoicesList = responseData.data;
            console.log("Found nested data:", invoicesList.length, "invoices");
          }
          // Case 4: Single object (shouldn't happen but handle it)
          else if (typeof responseData === 'object' && responseData.id) {
            invoicesList = [responseData];
            console.log("Found single invoice");
          }
        }
      } else {
        console.warn("Response not successful or missing success field:", response);
      }

      console.log("Final invoices list:", invoicesList.length, "invoices");
      setInvoices(invoicesList);

      // Calculate summary based on loaded invoices
      calculateSummary(invoicesList);
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      console.error("Error details:", error.response?.data || error.message);
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách hóa đơn");
      setInvoices([]);
      calculateSummary([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSummary = (invoicesList: InputInvoice[]) => {
    const stats = invoicesList.reduce(
      (acc, invoice) => {
        acc.total++;
        acc.totalBeforeVat += invoice.amount_before_vat;
        acc.totalVat += invoice.vat_amount || (invoice.amount_before_vat * invoice.vat_percentage) / 100;
        acc.totalAmount += invoice.total_amount || invoice.amount_before_vat + (invoice.amount_before_vat * invoice.vat_percentage) / 100;
        return acc;
      },
      { total: 0, totalAmount: 0, totalVat: 0, totalBeforeVat: 0 }
    );
    setSummary(stats);
  };

  // Filter invoices based on search and filters
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number?.toLowerCase().includes(searchLower) ||
          invoice.supplier_name?.toLowerCase().includes(searchLower) ||
          invoice.description?.toLowerCase().includes(searchLower) ||
          invoice.project?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by invoice type
    if (filterInvoiceType) {
      filtered = filtered.filter((invoice) => invoice.invoice_type === filterInvoiceType);
    }

    // Filter by date range
    if (filterFromDate) {
      filtered = filtered.filter((invoice) => invoice.issue_date >= filterFromDate);
    }
    if (filterToDate) {
      filtered = filtered.filter((invoice) => invoice.issue_date <= filterToDate);
    }

    return filtered;
  }, [invoices, searchText, filterInvoiceType, filterFromDate, filterToDate]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const handleFilesUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    const ids = files
      .map((f) => f.id || f.attachment_id)
      .filter((id): id is number => id !== undefined);
    setAttachmentIds(ids);
  };

  const handleCreateInvoice = async () => {
    if (!formData.issue_date || !formData.amount_before_vat || formData.amount_before_vat <= 0) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const response = await inputInvoiceApi.create({
        ...formData,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã tạo hóa đơn đầu vào");
        setShowCreateModal(false);
        resetForm();
        await loadInvoices();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo hóa đơn");
    }
  };

  const handleEditInvoice = (invoice: InputInvoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      project_id: invoice.project_id,
      invoice_type: invoice.invoice_type || "",
      issue_date: invoice.issue_date,
      invoice_number: invoice.invoice_number || "",
      supplier_name: invoice.supplier_name || "",
      amount_before_vat: invoice.amount_before_vat,
      vat_percentage: invoice.vat_percentage,
      description: invoice.description || "",
      notes: invoice.notes || "",
    });
    setUploadedFiles(
      invoice.attachments?.map((att) => ({
        id: att.id,
        file_url: att.file_url,
        original_name: att.original_name,
        type: att.mime_type?.startsWith("image/") ? "image" : "document",
      })) || []
    );
    setAttachmentIds(invoice.attachments?.map((att) => att.id) || []);
    setSelectedProject(invoice.project || null);
    setShowEditModal(true);
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;

    if (!formData.issue_date || !formData.amount_before_vat || formData.amount_before_vat <= 0) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const response = selectedInvoice.project_id
        ? await inputInvoiceApi.updateForProject(selectedInvoice.project_id, selectedInvoice.id, {
          ...formData,
          attachment_ids: attachmentIds,
        })
        : await inputInvoiceApi.update(selectedInvoice.id, {
          ...formData,
          attachment_ids: attachmentIds,
        });

      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật hóa đơn");
        setShowEditModal(false);
        resetForm();
        await loadInvoices();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật hóa đơn");
    }
  };

  const handleDeleteInvoice = (invoice: InputInvoice) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn xóa hóa đơn này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = invoice.project_id
                ? await inputInvoiceApi.deleteForProject(invoice.project_id, invoice.id)
                : await inputInvoiceApi.delete(invoice.id);

              if (response.success) {
                Alert.alert("Thành công", "Đã xóa hóa đơn");
                await loadInvoices();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa hóa đơn");
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      project_id: undefined,
      invoice_type: "",
      issue_date: new Date().toISOString().split("T")[0],
      invoice_number: "",
      supplier_name: "",
      amount_before_vat: 0,
      vat_percentage: 10,
      description: "",
      notes: "",
    });
    setSelectedProject(null);
    setUploadedFiles([]);
    setAttachmentIds([]);
    setSelectedInvoice(null);
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

  const calculateVatAmount = (amountBeforeVat: number, vatPercentage: number) => {
    return (amountBeforeVat * vatPercentage) / 100;
  };

  const calculateTotalAmount = (amountBeforeVat: number, vatAmount: number) => {
    return amountBeforeVat + vatAmount;
  };

  const renderInvoiceItem = ({ item }: { item: InputInvoice }) => {
    const vatAmount = calculateVatAmount(item.amount_before_vat, item.vat_percentage);
    const totalAmount = calculateTotalAmount(item.amount_before_vat, vatAmount);

    return (
      <TouchableOpacity
        style={styles.invoiceCard}
        onPress={() => handleEditInvoice(item)}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceHeaderLeft}>
            <Text style={styles.invoiceNumber}>
              {item.invoice_number || `HD-${item.id}`}
            </Text>
            {item.invoice_type && (
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.invoice_type}</Text>
              </View>
            )}
          </View>
          <PermissionGuard permission={Permissions.INPUT_INVOICE_DELETE}>
            <TouchableOpacity
              onPress={() => handleDeleteInvoice(item)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>

        <View style={styles.invoiceDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Ngày xuất:</Text>
            <Text style={styles.detailValue}>{formatDate(item.issue_date)}</Text>
          </View>

          {item.supplier_name && (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Nhà cung cấp:</Text>
              <Text style={styles.detailValue}>{item.supplier_name}</Text>
            </View>
          )}

          {item.project && (
            <View style={styles.detailRow}>
              <Ionicons name="folder-outline" size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Dự án:</Text>
              <Text style={styles.detailValue}>{item.project.name}</Text>
            </View>
          )}

          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Chưa VAT:</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(item.amount_before_vat)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>VAT ({item.vat_percentage}%):</Text>
              <Text style={styles.amountValue}>{formatCurrency(vatAmount)}</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Thành tiền:</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>

          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentsRow}>
              <Ionicons name="attach-outline" size={16} color="#3B82F6" />
              <Text style={styles.attachmentsText}>
                {item.attachments.length} file đính kèm
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Check permission first - if no permission, show message
  if (!hasPermission(Permissions.INPUT_INVOICE_VIEW)) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Hóa Đơn Đầu Vào" showBackButton />
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Bạn không có quyền xem hóa đơn đầu vào</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Hóa Đơn Đầu Vào"
        showBackButton
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="filter" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <PermissionGuard permission={Permissions.INPUT_INVOICE_CREATE}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
              >
                <Ionicons name="add" size={24} color="#3B82F6" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        }
      />

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tổng số</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tổng tiền</Text>
          <Text style={[styles.summaryValue, styles.summaryAmount]}>
            {formatCurrency(summary.totalAmount)}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo số hóa đơn, nhà cung cấp, dự án..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters */}
      {(filterInvoiceType || filterFromDate || filterToDate) && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersLabel}>Bộ lọc:</Text>
          {filterInvoiceType && (
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>{filterInvoiceType}</Text>
              <TouchableOpacity onPress={() => setFilterInvoiceType(null)}>
                <Ionicons name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          {filterFromDate && (
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>Từ: {formatDate(filterFromDate)}</Text>
              <TouchableOpacity onPress={() => setFilterFromDate(null)}>
                <Ionicons name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          {filterToDate && (
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>Đến: {formatDate(filterToDate)}</Text>
              <TouchableOpacity onPress={() => setFilterToDate(null)}>
                <Ionicons name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setFilterInvoiceType(null);
              setFilterFromDate(null);
              setFilterToDate(null);
            }}
          >
            <Text style={styles.clearFiltersText}>Xóa tất cả</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {searchText || filterInvoiceType || filterFromDate || filterToDate
                ? "Không tìm thấy hóa đơn phù hợp"
                : "Chưa có hóa đơn đầu vào"}
            </Text>
          </View>
        }
      />

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo Hóa Đơn Đầu Vào</Text>
            <ScrollView style={styles.modalScrollView}>
              {/* Project Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Dự án (tùy chọn)</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowProjectPicker(true)}
                >
                  <Text style={styles.pickerText}>
                    {selectedProject ? selectedProject.name : "Chọn dự án"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Invoice Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Loại hóa đơn</Text>
                <TextInput
                  style={styles.input}
                  value={formData.invoice_type}
                  onChangeText={(text) =>
                    setFormData({ ...formData, invoice_type: text })
                  }
                  placeholder="VD: VAT, Không VAT, Hóa đơn đỏ..."
                />
              </View>

              {/* Issue Date */}
              <DatePickerInput
                label="Ngày xuất *"
                value={formData.issue_date ? new Date(formData.issue_date) : null}
                onChange={(date) => {
                  if (date) {
                    setFormData({
                      ...formData,
                      issue_date: date.toISOString().split("T")[0],
                    });
                  }
                }}
                placeholder="Chọn ngày xuất"
                required
              />

              {/* Invoice Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Số hóa đơn</Text>
                <TextInput
                  style={styles.input}
                  value={formData.invoice_number}
                  onChangeText={(text) =>
                    setFormData({ ...formData, invoice_number: text })
                  }
                  placeholder="Nhập số hóa đơn"
                />
              </View>

              {/* Supplier Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nhà cung cấp</Text>
                <TextInput
                  style={styles.input}
                  value={formData.supplier_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, supplier_name: text })
                  }
                  placeholder="Tên nhà cung cấp"
                />
              </View>

              {/* Amount Before VAT */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Giá chưa VAT (VNĐ) *</Text>
                <TextInput
                  style={styles.input}
                  value={
                    formData.amount_before_vat > 0
                      ? formData.amount_before_vat.toString()
                      : ""
                  }
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
                    setFormData({ ...formData, amount_before_vat: value });
                  }}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              {/* VAT Percentage */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>VAT %</Text>
                <TextInput
                  style={styles.input}
                  value={
                    formData.vat_percentage > 0
                      ? formData.vat_percentage.toString()
                      : ""
                  }
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
                    setFormData({ ...formData, vat_percentage: value });
                  }}
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>

              {/* Calculated Values */}
              {formData.amount_before_vat > 0 && (
                <View style={styles.calculatedBox}>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>VAT ({formData.vat_percentage}%):</Text>
                    <Text style={styles.calculatedValue}>
                      {formatCurrency(
                        calculateVatAmount(
                          formData.amount_before_vat,
                          formData.vat_percentage
                        )
                      )}
                    </Text>
                  </View>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>Thành tiền:</Text>
                    <Text style={styles.calculatedTotal}>
                      {formatCurrency(
                        calculateTotalAmount(
                          formData.amount_before_vat,
                          calculateVatAmount(
                            formData.amount_before_vat,
                            formData.vat_percentage
                          )
                        )
                      )}
                    </Text>
                  </View>
                </View>
              )}

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Mô tả hóa đơn"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ghi chú</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Ghi chú thêm"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* File Upload */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Đính kèm file</Text>
                <UniversalFileUploader
                  onUploadComplete={handleFilesUpload}
                  multiple={true}
                  accept="all"
                  maxFiles={10}
                  initialFiles={uploadedFiles}
                  showPreview={true}
                  label="Chọn file hóa đơn"
                />
              </View>
            </ScrollView>

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
                onPress={handleCreateInvoice}
              >
                <Text style={styles.saveButtonText}>Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal - Similar to Create Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sửa Hóa Đơn Đầu Vào</Text>
            <ScrollView style={styles.modalScrollView}>
              {/* Same form fields as Create Modal */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Dự án (tùy chọn)</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowProjectPicker(true)}
                >
                  <Text style={styles.pickerText}>
                    {selectedProject ? selectedProject.name : "Chọn dự án"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Loại hóa đơn</Text>
                <TextInput
                  style={styles.input}
                  value={formData.invoice_type}
                  onChangeText={(text) =>
                    setFormData({ ...formData, invoice_type: text })
                  }
                  placeholder="VD: VAT, Không VAT..."
                />
              </View>

              <DatePickerInput
                label="Ngày xuất *"
                value={formData.issue_date ? new Date(formData.issue_date) : null}
                onChange={(date) => {
                  if (date) {
                    setFormData({
                      ...formData,
                      issue_date: date.toISOString().split("T")[0],
                    });
                  }
                }}
                placeholder="Chọn ngày xuất"
                required
              />

              <View style={styles.formGroup}>
                <Text style={styles.label}>Số hóa đơn</Text>
                <TextInput
                  style={styles.input}
                  value={formData.invoice_number}
                  onChangeText={(text) =>
                    setFormData({ ...formData, invoice_number: text })
                  }
                  placeholder="Nhập số hóa đơn"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nhà cung cấp</Text>
                <TextInput
                  style={styles.input}
                  value={formData.supplier_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, supplier_name: text })
                  }
                  placeholder="Tên nhà cung cấp"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Giá chưa VAT (VNĐ) *</Text>
                <TextInput
                  style={styles.input}
                  value={
                    formData.amount_before_vat > 0
                      ? formData.amount_before_vat.toString()
                      : ""
                  }
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
                    setFormData({ ...formData, amount_before_vat: value });
                  }}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>VAT %</Text>
                <TextInput
                  style={styles.input}
                  value={
                    formData.vat_percentage > 0
                      ? formData.vat_percentage.toString()
                      : ""
                  }
                  onChangeText={(text) => {
                    const value = parseFloat(text.replace(/[^0-9.]/g, "")) || 0;
                    setFormData({ ...formData, vat_percentage: value });
                  }}
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>

              {formData.amount_before_vat > 0 && (
                <View style={styles.calculatedBox}>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>VAT ({formData.vat_percentage}%):</Text>
                    <Text style={styles.calculatedValue}>
                      {formatCurrency(
                        calculateVatAmount(
                          formData.amount_before_vat,
                          formData.vat_percentage
                        )
                      )}
                    </Text>
                  </View>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>Thành tiền:</Text>
                    <Text style={styles.calculatedTotal}>
                      {formatCurrency(
                        calculateTotalAmount(
                          formData.amount_before_vat,
                          calculateVatAmount(
                            formData.amount_before_vat,
                            formData.vat_percentage
                          )
                        )
                      )}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Mô tả hóa đơn"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ghi chú</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Ghi chú thêm"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Đính kèm file</Text>
                <UniversalFileUploader
                  onUploadComplete={handleFilesUpload}
                  multiple={true}
                  accept="all"
                  maxFiles={10}
                  initialFiles={uploadedFiles}
                  showPreview={true}
                  label="Chọn file hóa đơn"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateInvoice}
              >
                <Text style={styles.saveButtonText}>Cập nhật</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bộ Lọc</Text>
            <ScrollView style={styles.modalScrollView}>
              {/* Invoice Type Filter */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Loại hóa đơn</Text>
                <TextInput
                  style={styles.input}
                  value={filterInvoiceType || ""}
                  onChangeText={setFilterInvoiceType}
                  placeholder="VD: VAT, Không VAT..."
                />
              </View>

              {/* Date Range Filters */}
              <DatePickerInput
                label="Từ ngày"
                value={filterFromDate ? new Date(filterFromDate) : null}
                onChange={(date) => {
                  if (date) {
                    setFilterFromDate(date.toISOString().split("T")[0]);
                  } else {
                    setFilterFromDate(null);
                  }
                }}
                placeholder="Chọn ngày bắt đầu"
              />

              <DatePickerInput
                label="Đến ngày"
                value={filterToDate ? new Date(filterToDate) : null}
                onChange={(date) => {
                  if (date) {
                    setFilterToDate(date.toISOString().split("T")[0]);
                  } else {
                    setFilterToDate(null);
                  }
                }}
                placeholder="Chọn ngày kết thúc"
                minimumDate={filterFromDate ? new Date(filterFromDate) : undefined}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.cancelButtonText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.saveButtonText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Picker Modal */}
      <Modal
        visible={showProjectPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProjectPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn Dự Án</Text>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={styles.projectOption}
                onPress={() => {
                  setSelectedProject(null);
                  setFormData({ ...formData, project_id: undefined });
                  setShowProjectPicker(false);
                }}
              >
                <Text style={styles.projectOptionText}>Không chọn dự án</Text>
              </TouchableOpacity>
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectOption}
                  onPress={() => {
                    setSelectedProject(project);
                    setFormData({ ...formData, project_id: project.id });
                    setShowProjectPicker(false);
                  }}
                >
                  <Text style={styles.projectOptionText}>{project.name}</Text>
                  <Text style={styles.projectOptionCode}>{project.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowProjectPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Đóng</Text>
            </TouchableOpacity>
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
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  invoiceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  typeBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
  },
  deleteButton: {
    padding: 4,
  },
  invoiceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 24,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  pickerText: {
    fontSize: 16,
    color: "#1F2937",
  },
  calculatedBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  calculatedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calculatedLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  calculatedValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  calculatedTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
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
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  projectOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  projectOptionText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  projectOptionCode: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    padding: 4,
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryAmount: {
    color: "#10B981",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  activeFiltersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginRight: 4,
  },
  filterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  filterTagText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  clearFiltersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
});

