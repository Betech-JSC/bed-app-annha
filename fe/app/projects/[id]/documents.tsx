import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { documentApi, ProjectDocument } from "@/api/documentApi";
import { FileUploader } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import api from "@/api/api";

export default function DocumentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentDescription, setCurrentDescription] = useState("");

  useEffect(() => {
    loadDocuments();
  }, [id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentApi.getDocuments(id!);
      if (response.success) {
        setDocuments(response.data || []);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (files: any[]) => {
    if (files.length === 0) return;

    // Nếu có nhiều file, hiển thị modal nhập description cho từng file
    if (files.length > 0) {
      setPendingFiles(files);
      setCurrentFileIndex(0);
      setCurrentDescription("");
      setShowDescriptionModal(true);
    }
  };

  const handleSaveDescription = async () => {
    if (currentFileIndex < pendingFiles.length) {
      const file = pendingFiles[currentFileIndex];
      try {
        await documentApi.attachDocument(
          id!,
          file.attachment_id || file.id,
          currentDescription.trim() || undefined
        );

        // Chuyển sang file tiếp theo
        if (currentFileIndex < pendingFiles.length - 1) {
          setCurrentFileIndex(currentFileIndex + 1);
          setCurrentDescription("");
        } else {
          // Đã xong tất cả files
          setShowDescriptionModal(false);
          setPendingFiles([]);
          setCurrentFileIndex(0);
          setCurrentDescription("");
          loadDocuments();
          Alert.alert("Thành công", "Đã tải lên tất cả tài liệu");
        }
      } catch (error) {
        console.error("Error attaching document:", error);
        Alert.alert("Lỗi", "Không thể đính kèm tài liệu");
      }
    }
  };

  const handleSkipDescription = async () => {
    // Bỏ qua description, attach ngay
    await handleSaveDescription();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const renderDocumentItem = ({ item }: { item: ProjectDocument }) => (
    <TouchableOpacity style={styles.documentCard}>
      {item.type === "image" ? (
        <Image source={{ uri: item.file_url }} style={styles.documentThumbnail} />
      ) : (
        <View style={styles.documentIcon}>
          <Ionicons name="document-outline" size={32} color="#3B82F6" />
        </View>
      )}
      <View style={styles.documentInfo}>
        <Text style={styles.documentName} numberOfLines={1}>
          {item.original_name}
        </Text>
        {item.description && (
          <Text style={styles.documentDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={styles.documentSize}>{formatFileSize(item.file_size)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Hồ Sơ & Tài Liệu</Text>
      </View>

      <View style={styles.uploadSection}>
        <FileUploader
          onUploadComplete={handleUploadComplete}
          multiple={true}
          accept="all"
          maxFiles={10}
        />
      </View>

      {/* Description Modal */}
      <Modal
        visible={showDescriptionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowDescriptionModal(false);
          setPendingFiles([]);
          setCurrentFileIndex(0);
          setCurrentDescription("");
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Ghi chú mô tả ({currentFileIndex + 1}/{pendingFiles.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowDescriptionModal(false);
                setPendingFiles([]);
                setCurrentFileIndex(0);
                setCurrentDescription("");
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.fileInfo}>
              <Ionicons name="document-outline" size={32} color="#3B82F6" />
              <Text style={styles.fileName} numberOfLines={2}>
                {pendingFiles[currentFileIndex]?.original_name || pendingFiles[currentFileIndex]?.name || "File"}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả file (tùy chọn)</Text>
              <Text style={styles.helperText}>
                Ví dụ: Bản vẽ thiết kế, Hợp đồng scan, Bản vẽ chỉnh sửa...
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={currentDescription}
                onChangeText={setCurrentDescription}
                placeholder="Nhập mô tả để dễ tìm kiếm sau này"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.skipButton]}
                onPress={handleSkipDescription}
              >
                <Text style={styles.skipButtonText}>Bỏ qua</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveDescription}
              >
                <Text style={styles.saveButtonText}>
                  {currentFileIndex < pendingFiles.length - 1 ? "Tiếp tục" : "Hoàn thành"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có tài liệu nào</Text>
          </View>
        }
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  uploadSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
  },
  documentCard: {
    flexDirection: "row",
    alignItems: "center",
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
  documentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  documentIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 2,
    marginBottom: 2,
    fontStyle: "italic",
  },
  documentSize: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    padding: 16,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
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
  helperText: {
    fontSize: 12,
    color: "#6B7280",
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
  skipButton: {
    backgroundColor: "#E5E7EB",
  },
  skipButtonText: {
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
});
