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
import BackButton from "@/components/BackButton";

export default function DocumentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<number, string>>({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

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
    setUploadedFiles(files);
    setShowUploadModal(true);
  };

  const handleConfirmUpload = async () => {
    try {
      for (const file of uploadedFiles) {
        const description = fileDescriptions[file.attachment_id || file.id] || "";
        await documentApi.attachDocument(
          id!,
          file.attachment_id || file.id,
          description
        );
      }
      setShowUploadModal(false);
      setUploadedFiles([]);
      setFileDescriptions({});
      loadDocuments();
      Alert.alert("Thành công", "Đã tải lên tài liệu thành công");
    } catch (error) {
      console.error("Error attaching documents:", error);
      Alert.alert("Lỗi", "Không thể tải lên tài liệu");
    }
  };

  const handleViewDocument = (document: ProjectDocument) => {
    setSelectedDocument(document);
    setEditingDescription(document.description || "");
    setShowDetailModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const renderDocumentItem = ({ item }: { item: ProjectDocument }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => handleViewDocument(item)}
    >
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
        {item.description ? (
          <Text style={styles.documentDescription} numberOfLines={1}>
            {item.description}
          </Text>
        ) : (
          <Text style={styles.documentSize}>{formatFileSize(item.file_size)}</Text>
        )}
        {item.description && (
          <Text style={styles.documentSize}>{formatFileSize(item.file_size)}</Text>
        )}
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
        <BackButton />
        <Text style={styles.headerTitle}>Hồ Sơ & Tài Liệu</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.uploadSection}>
        <FileUploader
          onUploadComplete={handleUploadComplete}
          multiple={true}
          accept="all"
          maxFiles={10}
        />
      </View>

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

      {/* Upload Confirmation Modal with Description */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowUploadModal(false);
          setUploadedFiles([]);
          setFileDescriptions({});
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mô tả tài liệu</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowUploadModal(false);
                  setUploadedFiles([]);
                  setFileDescriptions({});
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {uploadedFiles.map((file, index) => (
                <View key={index} style={styles.fileInputGroup}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.original_name || file.name || `File ${index + 1}`}
                  </Text>
                  <TextInput
                    style={styles.descriptionInput}
                    placeholder="Nhập mô tả (ví dụ: bản vẽ thiết kế, hợp đồng scan, bản vẽ chỉnh sửa...)"
                    placeholderTextColor="#9CA3AF"
                    value={fileDescriptions[file.attachment_id || file.id] || ""}
                    onChangeText={(text) => {
                      setFileDescriptions({
                        ...fileDescriptions,
                        [file.attachment_id || file.id]: text,
                      });
                    }}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowUploadModal(false);
                  setUploadedFiles([]);
                  setFileDescriptions({});
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleConfirmUpload}
              >
                <Text style={styles.saveButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Document Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedDocument(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết tài liệu</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedDocument(null);
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedDocument && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Tên file</Text>
                    <Text style={styles.detailValue}>{selectedDocument.original_name}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Kích thước</Text>
                    <Text style={styles.detailValue}>
                      {formatFileSize(selectedDocument.file_size)}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Mô tả</Text>
                    <TextInput
                      style={[styles.descriptionInput, styles.detailDescription]}
                      placeholder="Nhập mô tả tài liệu..."
                      placeholderTextColor="#9CA3AF"
                      value={editingDescription}
                      onChangeText={setEditingDescription}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedDocument(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  if (selectedDocument) {
                    try {
                      await documentApi.updateDocument(id!, selectedDocument.id, editingDescription || undefined);
                      Alert.alert("Thành công", "Đã cập nhật mô tả");
                      setShowDetailModal(false);
                      setSelectedDocument(null);
                      loadDocuments();
                    } catch (error: any) {
                      Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật mô tả");
                    }
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 32,
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
  documentSize: {
    fontSize: 12,
    color: "#6B7280",
  },
  documentDescription: {
    fontSize: 13,
    color: "#3B82F6",
    marginBottom: 4,
    fontStyle: "italic",
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
  fileInputGroup: {
    marginBottom: 20,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 80,
    textAlignVertical: "top",
  },
  detailDescription: {
    marginTop: 8,
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
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: "#1F2937",
  },
});
