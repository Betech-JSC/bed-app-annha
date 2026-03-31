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
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  RefreshControl,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { documentApi, ProjectDocument } from "@/api/documentApi";
import { UniversalFileUploader, ScreenHeader, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Permissions } from "@/constants/Permissions";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Ionicons } from "@expo/vector-icons";

import ImageViewer from "@/components/ImageViewer";

export default function DocumentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<number, string>>({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem tài liệu của dự án này.");
      } else {
        console.error("Error loading documents:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDocuments();
  }, [id]);

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

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa tài liệu này không?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await documentApi.deleteDocument(id!, selectedDocument.id);
              setShowDetailModal(false);
              setSelectedDocument(null);
              loadDocuments();
              Alert.alert("Thành công", "Đã xóa tài liệu");
            } catch (error: any) {
              console.error("Error deleting document:", error);
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa tài liệu");
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const renderDocumentItem = ({ item }: { item: ProjectDocument }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => {
        if (item.type === "image") {
          const imageDocs = documents.filter((doc) => doc.type === "image");
          const index = imageDocs.findIndex((doc) => doc.id === item.id);
          if (index !== -1) {
            setInitialImageIndex(index);
            setImageViewerVisible(true);
          }
        } else {
          handleViewDocument(item);
        }
      }}
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
      <View style={styles.container}>
        <ScreenHeader title="Hồ Sơ & Tài Liệu" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Hồ Sơ & Tài Liệu" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Hồ Sơ & Tài Liệu" showBackButton />

      <PermissionGuard permission={Permissions.PROJECT_DOCUMENT_UPLOAD} projectId={id}>
        <View style={styles.uploadSection}>
          <UniversalFileUploader
            onUploadComplete={handleUploadComplete}
            multiple={true}
            accept="all"
            maxFiles={10}
          />
        </View>
      </PermissionGuard>

      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={Keyboard.dismiss}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardAvoiding}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                <ScrollView 
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableWithoutFeedback>
                    <View>
                      {uploadedFiles.map((file, index) => (
                        <View key={index} style={styles.fileInputGroup}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.original_name || file.name || `File ${index + 1}`}
                          </Text>
                          <TextInput
                            style={styles.descriptionInput}
                            placeholder="Nhập mô tả (ví dụ: bản vẽ thiết kế, hợp đồng scan...)"
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
                            returnKeyType="done"
                            blurOnSubmit={true}
                            onSubmitEditing={Keyboard.dismiss}
                          />
                        </View>
                      ))}
                    </View>
                  </TouchableWithoutFeedback>
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
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Document Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedDocument(null);
        }}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowDetailModal(false);
                setSelectedDocument(null);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle}>Chi tiết tài liệu</Text>
            <View style={{ width: 28 }} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <ScrollView style={styles.fullscreenBody} contentContainerStyle={{ paddingBottom: 100 }}>
              {selectedDocument && (
                <>
                  {/* File Preview */}
                  <View style={styles.previewContainer}>
                    {selectedDocument.type === "image" ? (
                      <TouchableOpacity
                        onPress={() => {
                          const imageDocs = documents.filter((doc) => doc.type === "image");
                          const index = imageDocs.findIndex((doc) => doc.id === selectedDocument.id);
                          if (index !== -1) {
                            setInitialImageIndex(index);
                            setImageViewerVisible(true);
                          }
                        }}
                      >
                        <Image
                          source={{ uri: selectedDocument.file_url }}
                          style={styles.fullscreenPreviewImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.iconPreview}>
                        <Ionicons name="document-text-outline" size={80} color="#3B82F6" />
                        <Text style={styles.previewExtension}>{selectedDocument.original_name.split('.').pop()?.toUpperCase() || 'FILE'}</Text>
                      </View>
                    )}
                  </View>

                  {/* Info Card */}
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Tên tài liệu</Text>
                      <Text style={styles.infoValue}>{selectedDocument.original_name}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Kích thước</Text>
                      <Text style={styles.infoValue}>{formatFileSize(selectedDocument.file_size)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Loại</Text>
                      <Text style={styles.infoValue}>{selectedDocument.type || 'Tài liệu'}</Text>
                    </View>
                  </View>

                  {/* Description Editor */}
                  <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>Ghi chú / Mô tả</Text>
                    <PermissionGuard
                      permission={Permissions.PROJECT_DOCUMENT_UPLOAD}
                      projectId={id}
                      fallback={
                        <View style={styles.readOnlyDescription}>
                          <Text style={styles.descriptionText}>
                            {editingDescription || "Chưa có mô tả cho tài liệu này."}
                          </Text>
                        </View>
                      }
                    >
                      <TextInput
                        style={styles.fullscreenInput}
                        placeholder="Thêm mô tả chi tiết cho tài liệu này..."
                        placeholderTextColor="#9CA3AF"
                        value={editingDescription}
                        onChangeText={setEditingDescription}
                        multiline
                        textAlignVertical="top"
                      />
                    </PermissionGuard>
                    <Text style={styles.inputHint}>
                      Mô tả giúp các thành viên khác hiểu rõ hơn về nội dung tài liệu.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Action Footer */}
            <View style={styles.fullscreenFooter}>
              <PermissionGuard
                permission={Permissions.PROJECT_DOCUMENT_DELETE}
                projectId={id}
                style={{ flex: 1 }}
              >
                <TouchableOpacity
                  style={styles.footerDeleteButton}
                  onPress={handleDeleteDocument}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={styles.footerDeleteText}>Xóa file</Text>
                </TouchableOpacity>
              </PermissionGuard>

              <PermissionGuard
                permission={Permissions.PROJECT_DOCUMENT_UPLOAD}
                projectId={id}
                style={{ flex: 2 }}
              >
                <TouchableOpacity
                  style={styles.footerSaveButton}
                  onPress={async () => {
                    if (selectedDocument) {
                      try {
                        await documentApi.updateDocument(id!, selectedDocument.id, editingDescription || undefined);
                        Alert.alert("Thành công", "Đã cập nhật thông tin tài liệu");
                        // Optional: Don't close modal immediately to show success
                        loadDocuments();
                      } catch (error: any) {
                        Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật mô tả");
                      }
                    }
                  }}
                >
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.footerSaveText}>Lưu thay đổi</Text>
                </TouchableOpacity>
              </PermissionGuard>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      {/* ImageViewer */}
      <ImageViewer
        visible={imageViewerVisible}
        images={documents
          .filter((doc) => doc.type === "image")
          .map((doc) => ({
            uri: doc.file_url,
            name: doc.original_name,
          }))}
        initialIndex={initialImageIndex}
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKeyboardAvoiding: {
    width: "100%",
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
  deleteButton: {
    backgroundColor: "#FEE2E2",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
  // Fullscreen Modal Styles
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  fullscreenBody: {
    flex: 1,
    padding: 20,
  },
  previewContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  fullscreenPreviewImage: {
    width: "100%",
    height: "100%",
  },
  iconPreview: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewExtension: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "right",
    paddingLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  fullscreenInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    minHeight: 120,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  readOnlyDescription: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    minHeight: 120,
  },
  descriptionText: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
  },
  inputHint: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
    fontStyle: "italic",
  },
  fullscreenFooter: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  footerDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  footerDeleteText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  footerSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  footerSaveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
