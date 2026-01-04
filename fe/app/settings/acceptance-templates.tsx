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
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { acceptanceApi, AcceptanceTemplate } from "@/api/acceptanceApi";
import { Ionicons } from "@expo/vector-icons";
import { UniversalFileUploader, ScreenHeader } from "@/components";

export default function AcceptanceTemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AcceptanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AcceptanceTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    standard: "",
    is_active: true,
    order: 0,
  });
  const [imageIds, setImageIds] = useState<number[]>([]);
  const [documentIds, setDocumentIds] = useState<number[]>([]);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await acceptanceApi.getTemplates(false);
      if (response.success) {
        setTemplates(response.data || []);
      }
    } catch (error: any) {
      console.error("Error loading templates:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách bộ tài liệu nghiệm thu");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: AcceptanceTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || "",
        standard: template.standard || "",
        is_active: template.is_active,
        order: template.order,
      });
      setUploadedImages(template.images || []);
      setUploadedDocuments(template.documents || []);
      setImageIds(template.images?.map((a: any) => a.id || a.attachment_id) || []);
      setDocumentIds(template.documents?.map((a: any) => a.id || a.attachment_id) || []);
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        standard: "",
        is_active: true,
        order: 0,
      });
      setUploadedImages([]);
      setUploadedDocuments([]);
      setImageIds([]);
      setDocumentIds([]);
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      standard: "",
      is_active: true,
      order: 0,
    });
    setUploadedImages([]);
    setUploadedDocuments([]);
    setImageIds([]);
    setDocumentIds([]);
  };

  const handleImagesUpload = (files: any[]) => {
    setUploadedImages(files);
    const ids = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setImageIds(ids);
  };

  const handleDocumentsUpload = (files: any[]) => {
    setUploadedDocuments(files);
    const ids = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setDocumentIds(ids);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên công việc");
      return;
    }

    try {
      setSaving(true);
      const data = {
        ...formData,
        image_ids: imageIds.length > 0 ? imageIds : undefined,
        document_ids: documentIds.length > 0 ? documentIds : undefined,
      };

      if (editingTemplate) {
        await acceptanceApi.updateTemplate(editingTemplate.id, data);
        Alert.alert("Thành công", "Đã cập nhật bộ tài liệu nghiệm thu");
      } else {
        await acceptanceApi.createTemplate(data);
        Alert.alert("Thành công", "Đã tạo bộ tài liệu nghiệm thu");
      }
      handleCloseModal();
      loadTemplates();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu bộ tài liệu nghiệm thu"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (template: AcceptanceTemplate) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa bộ tài liệu nghiệm thu "${template.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await acceptanceApi.deleteTemplate(template.id);
              Alert.alert("Thành công", "Đã xóa bộ tài liệu nghiệm thu");
              loadTemplates();
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể xóa bộ tài liệu nghiệm thu"
              );
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: AcceptanceTemplate }) => (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.is_active ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>Hoạt động</Text>
            </View>
          ) : (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>Tạm khóa</Text>
            </View>
          )}
        </View>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.standard && (
          <Text style={styles.itemStandard} numberOfLines={2}>
            Tiêu chuẩn: {item.standard}
          </Text>
        )}
        <View style={styles.filesPreview}>
          {item.documents && item.documents.length > 0 && (
            <View style={styles.fileBadge}>
              <Ionicons name="document-text" size={14} color="#3B82F6" />
              <Text style={styles.fileCount}>
                {item.documents.length} tài liệu
              </Text>
            </View>
          )}
          {item.images && item.images.length > 0 && (
            <View style={styles.fileBadge}>
              <Ionicons name="images-outline" size={14} color="#10B981" />
              <Text style={styles.fileCount}>
                {item.images.length} hình ảnh
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        {(item.documents && item.documents.length > 0) || (item.images && item.images.length > 0) ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/settings/acceptance-templates/${item.id}/documents`)}
          >
            <Ionicons name="folder-open-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleOpenModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Bộ Tài Liệu Nghiệm Thu"
        showBackButton
        rightComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleOpenModal()}
          >
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={templates}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có bộ tài liệu nghiệm thu nào</Text>
            <Text style={styles.emptySubtext}>
              Nhấn nút + để tạo bộ tài liệu nghiệm thu mới
            </Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTemplate ? "Chỉnh Sửa" : "Tạo Mới"} Bộ Tài Liệu Nghiệm Thu
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Tên công việc <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên công việc"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập mô tả"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tiêu chuẩn cho phép</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập tiêu chuẩn cho phép"
                  value={formData.standard}
                  onChangeText={(text) =>
                    setFormData({ ...formData, standard: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tài liệu chính (PDF, Word, Excel)</Text>
                <Text style={styles.helperText}>
                  Upload các tài liệu chính: PDF, Word, Excel
                </Text>
                <UniversalFileUploader
                  onUploadComplete={handleDocumentsUpload}
                  multiple={true}
                  accept="document"
                  maxFiles={20}
                  initialFiles={uploadedDocuments}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hình ảnh minh họa</Text>
                <Text style={styles.helperText}>
                  Upload hình ảnh minh họa để đối chiếu khi nghiệm thu
                </Text>
                <UniversalFileUploader
                  onUploadComplete={handleImagesUpload}
                  multiple={true}
                  accept="image"
                  maxFiles={20}
                  initialFiles={uploadedImages}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Thứ tự sắp xếp</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.order.toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      order: parseInt(text) || 0,
                    })
                  }
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={styles.toggleContainer}
                onPress={() =>
                  setFormData({ ...formData, is_active: !formData.is_active })
                }
              >
                <Text style={styles.label}>Trạng thái</Text>
                <View style={styles.toggle}>
                  <Text
                    style={[
                      styles.toggleText,
                      formData.is_active && styles.toggleTextActive,
                    ]}
                  >
                    {formData.is_active ? "Hoạt động" : "Tạm khóa"}
                  </Text>
                  <Ionicons
                    name={formData.is_active ? "checkmark-circle" : "close-circle"}
                    size={24}
                    color={formData.is_active ? "#10B981" : "#EF4444"}
                  />
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  addButton: {
    padding: 4,
  },
  list: {
    padding: 16,
  },
  item: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  activeBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  inactiveBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inactiveText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  itemDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 4,
  },
  itemStandard: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginBottom: 4,
  },
  filesPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    flexWrap: "wrap",
  },
  fileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
  },
  fileCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  itemActions: {
    flexDirection: "row",
    gap: 12,
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
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
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 18,
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
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleText: {
    fontSize: 16,
    color: "#6B7280",
  },
  toggleTextActive: {
    color: "#1F2937",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

