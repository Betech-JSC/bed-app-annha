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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { constructionLogApi, ConstructionLog } from "@/api/constructionLogApi";
import { attachmentApi, Attachment } from "@/api/attachmentApi";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

export default function ConstructionLogsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [logs, setLogs] = useState<ConstructionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<ConstructionLog | null>(null);
  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split("T")[0],
    weather: "",
    personnel_count: "",
    completion_percentage: "",
    notes: "",
  });
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [id]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await constructionLogApi.getLogs(id!);
      if (response.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Lỗi", "Cần quyền truy cập thư viện ảnh");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        await handleUploadFiles(result.assets.map((asset) => asset.uri));
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("Lỗi", "Không thể chọn hình ảnh");
    }
  };

  const handlePickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        await handleUploadFiles(result.assets.map((asset) => asset.uri));
      }
    } catch (error) {
      console.error("Error picking documents:", error);
      Alert.alert("Lỗi", "Không thể chọn tài liệu");
    }
  };

  const handleUploadFiles = async (fileUris: string[]) => {
    setUploading(true);
    try {
      const formData = new FormData();
      
      for (let i = 0; i < fileUris.length; i++) {
        const uri = fileUris[i];
        const fileName = uri.split("/").pop() || `file_${i}.jpg`;
        const fileType = fileName.split(".").pop() || "jpg";
        
        formData.append("files[]", {
          uri,
          name: fileName,
          type: `image/${fileType}`,
        } as any);
      }

      const response = await attachmentApi.upload(formData);
      if (response.success && response.data) {
        const newAttachments = response.data.map((item: any) => ({
          id: item.attachment_id,
          file_url: item.file_url,
          original_name: item.file_url.split("/").pop() || "",
          type: "image" as const,
        }));
        setUploadedAttachments([...uploadedAttachments, ...newAttachments]);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = [...uploadedAttachments];
    newAttachments.splice(index, 1);
    setUploadedAttachments(newAttachments);
  };

  const openEditModal = (log: ConstructionLog) => {
    setEditingLog(log);
    setFormData({
      log_date: log.log_date,
      weather: log.weather || "",
      personnel_count: log.personnel_count?.toString() || "",
      completion_percentage: log.completion_percentage?.toString() || "",
      notes: log.notes || "",
    });
    setUploadedAttachments(log.attachments || []);
    setModalVisible(true);
  };

  const handleDelete = async (log: ConstructionLog) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa nhật ký này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await constructionLogApi.deleteLog(id!, log.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa nhật ký");
                loadLogs();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa nhật ký");
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.log_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày");
      return;
    }

    try {
      const attachmentIds = uploadedAttachments.map((att) => att.id);
      const data = {
        log_date: formData.log_date,
        weather: formData.weather || undefined,
        personnel_count: formData.personnel_count
          ? parseInt(formData.personnel_count)
          : undefined,
        completion_percentage: formData.completion_percentage
          ? parseFloat(formData.completion_percentage)
          : undefined,
        notes: formData.notes || undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      };

      let response;
      if (editingLog) {
        response = await constructionLogApi.updateLog(id!, editingLog.id, data);
      } else {
        response = await constructionLogApi.createLog(id!, data);
      }

      if (response.success) {
        Alert.alert("Thành công", editingLog ? "Nhật ký đã được cập nhật." : "Nhật ký đã được tạo.");
        handleCloseModal();
        loadLogs();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingLog(null);
    setFormData({
      log_date: new Date().toISOString().split("T")[0],
      weather: "",
      personnel_count: "",
      completion_percentage: "",
      notes: "",
    });
    setUploadedAttachments([]);
  };

  const renderLogItem = ({ item }: { item: ConstructionLog }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logHeaderLeft}>
          <Text style={styles.logDate}>
            {new Date(item.log_date).toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
          {item.completion_percentage > 0 && (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>
                {item.completion_percentage}%
              </Text>
            </View>
          )}
        </View>
        <View style={styles.logActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
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

      <View style={styles.logDetails}>
        {item.weather && (
          <View style={styles.detailRow}>
            <Ionicons name="partly-sunny-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.weather}</Text>
          </View>
        )}
        {item.personnel_count && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {item.personnel_count} người
            </Text>
          </View>
        )}
      </View>

      {item.notes && (
        <Text style={styles.notes}>{item.notes}</Text>
      )}

      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentsContainer}>
          <Text style={styles.attachmentsLabel}>
            {item.attachments.length} file đính kèm
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentsScroll}>
            {item.attachments.map((attachment: any, index: number) => (
              <View key={attachment.id || index} style={styles.attachmentItem}>
                {attachment.type === "image" ? (
                  <Image
                    source={{ uri: attachment.file_url }}
                    style={styles.attachmentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.attachmentFile}>
                    <Ionicons name="document-outline" size={24} color="#3B82F6" />
                    <Text style={styles.attachmentFileName} numberOfLines={1}>
                      {attachment.original_name || "File"}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhật Ký Công Trình</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            handleCloseModal();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhật ký nào</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLog ? "Chỉnh Sửa Nhật Ký" : "Thêm Nhật Ký"}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày</Text>
              <TextInput
                style={styles.input}
                value={formData.log_date}
                onChangeText={(text) =>
                  setFormData({ ...formData, log_date: text })
                }
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Thời tiết</Text>
              <TextInput
                style={styles.input}
                value={formData.weather}
                onChangeText={(text) =>
                  setFormData({ ...formData, weather: text })
                }
                placeholder="Ví dụ: Nắng, Mưa..."
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Số nhân sự</Text>
                <TextInput
                  style={styles.input}
                  value={formData.personnel_count}
                  onChangeText={(text) =>
                    setFormData({ ...formData, personnel_count: text })
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>% Hoàn thành</Text>
                <TextInput
                  style={styles.input}
                  value={formData.completion_percentage}
                  onChangeText={(text) =>
                    setFormData({ ...formData, completion_percentage: text })
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData({ ...formData, notes: text })
                }
                placeholder="Nhập ghi chú..."
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Upload Files Section */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Hình ảnh & Tài liệu</Text>
              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                  onPress={handlePickImages}
                  disabled={uploading}
                >
                  <Ionicons name="images-outline" size={20} color="#3B82F6" />
                  <Text style={styles.uploadButtonText}>Chọn ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                  onPress={handlePickDocuments}
                  disabled={uploading}
                >
                  <Ionicons name="document-outline" size={20} color="#3B82F6" />
                  <Text style={styles.uploadButtonText}>Chọn file</Text>
                </TouchableOpacity>
              </View>

              {uploading && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.uploadingText}>Đang upload...</Text>
                </View>
              )}

              {uploadedAttachments.length > 0 && (
                <View style={styles.uploadedFilesContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {uploadedAttachments.map((attachment, index) => (
                      <View key={attachment.id || index} style={styles.uploadedFileItem}>
                        {attachment.type === "image" ? (
                          <Image
                            source={{ uri: attachment.file_url }}
                            style={styles.uploadedImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.uploadedFile}>
                            <Ionicons name="document-outline" size={24} color="#3B82F6" />
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.removeFileButton}
                          onPress={() => handleRemoveAttachment(index)}
                        >
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={uploading}
              >
                <Text style={styles.submitButtonText}>
                  {editingLog ? "Cập nhật" : "Tạo"}
                </Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
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
  logCard: {
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
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressBadge: {
    backgroundColor: "#3B82F620",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  logDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  notes: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  attachmentsScroll: {
    marginTop: 8,
  },
  attachmentItem: {
    marginRight: 8,
    position: "relative",
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  attachmentFile: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  attachmentFileName: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalScroll: {
    maxHeight: "70%",
  },
  uploadButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
    gap: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  uploadedFilesContainer: {
    marginTop: 12,
  },
  uploadedFileItem: {
    marginRight: 8,
    position: "relative",
  },
  uploadedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  uploadedFile: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  removeFileButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
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
    height: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
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
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
