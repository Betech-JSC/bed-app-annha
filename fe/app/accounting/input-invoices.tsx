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
} from "react-native";
import { useRouter } from "expo-router";
import { inputInvoiceApi, InputInvoice, CreateInputInvoiceData } from "@/api/inputInvoiceApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function InputInvoicesScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    loadInvoices();
    loadProjects();
  }, []);

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
      if (response.success) {
        // Handle paginated response (Laravel paginate returns data in 'data' key)
        const responseData = response.data;
        if (responseData && typeof responseData === 'object') {
          // If paginated, data is in responseData.data
          if (responseData.data && Array.isArray(responseData.data)) {
            setInvoices(responseData.data);
          } 
          // If not paginated but is array
          else if (Array.isArray(responseData)) {
            setInvoices(responseData);
          }
          // If data is nested
          else if (responseData.data && Array.isArray(responseData.data)) {
            setInvoices(responseData.data);
          } else {
            setInvoices([]);
          }
        } else {
          setInvoices([]);
        }
      } else {
        setInvoices([]);
      }
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách hóa đơn");
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
        loadInvoices();
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
        loadInvoices();
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
                loadInvoices();
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
          <TouchableOpacity
            onPress={() => handleDeleteInvoice(item)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
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

  return (
    <PermissionGuard permission="accounting.manage">
      <View style={styles.container}>
        <ScreenHeader
          title="Hóa Đơn Đầu Vào"
          showBackButton
          rightComponent={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setShowCreateModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#3B82F6" />
            </TouchableOpacity>
          }
        />

        <FlatList
          data={invoices}
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
              <Text style={styles.emptyText}>Chưa có hóa đơn đầu vào</Text>
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
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ngày xuất *</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.pickerText}>
                      {formatDate(formData.issue_date)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(formData.issue_date)}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                          setFormData({
                            ...formData,
                            issue_date: date.toISOString().split("T")[0],
                          });
                        }
                      }}
                    />
                  )}
                </View>

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

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ngày xuất *</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.pickerText}>
                      {formatDate(formData.issue_date)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(formData.issue_date)}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                          setFormData({
                            ...formData,
                            issue_date: date.toISOString().split("T")[0],
                          });
                        }
                      }}
                    />
                  )}
                </View>

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
    </PermissionGuard>
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
});

