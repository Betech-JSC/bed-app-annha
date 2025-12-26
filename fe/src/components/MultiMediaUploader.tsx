import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { attachmentApi, UploadResponse } from "@/api/attachmentApi";

export interface MediaItem {
  id?: string;
  url: string;
  attachment_id?: number;
  localUri?: string; // For preview before upload
  uploading?: boolean;
  type?: "image" | "document";
  name?: string;
  size?: number;
}

interface MultiMediaUploaderProps {
  value?: MediaItem[]; // Array of media items
  onChange?: (items: MediaItem[]) => void;
  maxFiles?: number;
  accept?: "image" | "document" | "all";
  disabled?: boolean;
  showPreview?: boolean;
  label?: string;
}

export default function MultiMediaUploader({
  value = [],
  onChange,
  maxFiles = 10,
  accept = "all",
  disabled = false,
  showPreview = true,
  label = "Tải lên ảnh/tài liệu",
}: MultiMediaUploaderProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(value);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Sync with value prop
  useEffect(() => {
    if (value && value.length >= 0) {
      setMediaItems(value);
    }
  }, [value]);

  // Request camera permissions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Cần quyền truy cập",
        "Ứng dụng cần quyền truy cập camera để chụp ảnh."
      );
      return false;
    }
    return true;
  };

  // Request media library permissions (không hiển thị alert nếu bị từ chối)
  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // Cho phép truy cập mà không cần xin phép, hệ thống sẽ tự xử lý
    return status === "granted" || status === "limited";
  };

  // Take multiple photos from camera
  const takePhotos = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const remainingSlots = maxFiles - mediaItems.length;
    if (remainingSlots <= 0) {
      Alert.alert("Lỗi", `Đã đạt giới hạn ${maxFiles} file`);
      return;
    }

    try {
      const photos: ImagePicker.ImagePickerAsset[] = [];
      let continueTaking = true;

      while (continueTaking && photos.length < remainingSlots) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          photos.push(result.assets[0]);

          // Ask if want to take more
          if (photos.length < remainingSlots) {
            const shouldContinue = await new Promise<boolean>((resolve) => {
              Alert.alert(
                "Chụp thêm ảnh?",
                `Đã chụp ${photos.length} ảnh. Bạn có muốn chụp thêm không?`,
                [
                  { text: "Xong", onPress: () => resolve(false) },
                  { text: "Chụp thêm", onPress: () => resolve(true) },
                ]
              );
            });
            continueTaking = shouldContinue;
          } else {
            continueTaking = false;
          }
        } else {
          continueTaking = false;
        }
      }

      if (photos.length > 0) {
        await uploadMedia(photos.map((asset) => ({ ...asset, type: "image" as const })));
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  // Pick multiple images from library (không cần xin phép trước)
  const pickImages = async () => {
    const remainingSlots = maxFiles - mediaItems.length;
    if (remainingSlots <= 0) {
      Alert.alert("Lỗi", `Đã đạt giới hạn ${maxFiles} file`);
      return;
    }

    try {
      // Tự động request permission nếu cần, không hiển thị alert
      await ImagePicker.requestMediaLibraryPermissionsAsync();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets) {
        await uploadMedia(
          result.assets.map((asset) => ({ ...asset, type: "image" as const }))
        );
      }
    } catch (error) {
      // Không hiển thị alert, để hệ thống tự xử lý
      console.error("Error picking images:", error);
    }
  };

  // Pick multiple documents
  const pickDocuments = async () => {
    const remainingSlots = maxFiles - mediaItems.length;
    if (remainingSlots <= 0) {
      Alert.alert("Lỗi", `Đã đạt giới hạn ${maxFiles} file`);
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const documents = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name || "document",
          mimeType: asset.mimeType || "application/octet-stream",
          size: asset.size || 0,
          type: "document" as const,
        }));

        await uploadMedia(documents);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chọn tài liệu");
    }
  };

  // Upload media files
  const uploadMedia = async (files: any[]) => {
    const remainingSlots = maxFiles - mediaItems.length;
    if (files.length > remainingSlots) {
      Alert.alert(
        "Lỗi",
        `Chỉ có thể thêm ${remainingSlots} file nữa (tối đa ${maxFiles} file)`
      );
      return;
    }

    setUploading(true);

    const tempItems: MediaItem[] = [];

    try {
      const formData = new FormData();

      files.forEach((file, index) => {
        const tempId = `temp_${Date.now()}_${index}`;
        const fileExtension = file.uri?.split(".").pop() || "jpg";
        const fileName = file.name || file.fileName || `file_${Date.now()}_${index}.${fileExtension}`;

        tempItems.push({
          id: tempId,
          url: file.uri,
          localUri: file.uri,
          uploading: true,
          type: file.type || "image",
          name: fileName,
          size: file.size,
        });

        formData.append(`files[${index}]`, {
          uri: file.uri,
          type: file.mimeType || (file.type === "document" ? "application/octet-stream" : `image/${fileExtension}`),
          name: fileName,
        } as any);
      });

      setMediaItems((prev) => [...prev, ...tempItems]);

      const response = await attachmentApi.upload(formData);

      if (response.success && response.data) {
        const uploadedFiles: UploadResponse[] = response.data;
        const newItems: MediaItem[] = uploadedFiles.map((file, index) => ({
          id: file.attachment_id.toString(),
          url: file.file_url,
          attachment_id: file.attachment_id,
          type: tempItems[index]?.type || "image",
          name: file.original_name || tempItems[index]?.name,
          size: file.file_size,
        }));

        setMediaItems((prev) => {
          const updated = prev
            .filter((item) => !tempItems.some((temp) => temp.id === item.id))
            .concat(newItems);
          onChange?.(updated);
          return updated;
        });
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Upload thất bại");
      setMediaItems((prev) =>
        prev.filter((item) => !tempItems.some((temp) => temp.id === item.id))
      );
    } finally {
      setUploading(false);
    }
  };

  // Remove media item
  const removeItem = (index: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa file này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            const newItems = mediaItems.filter((_, i) => i !== index);
            setMediaItems(newItems);
            onChange?.(newItems);
          },
        },
      ]
    );
  };

  // Show picker options
  const showPickerOptions = () => {
    if (accept === "image") {
      Alert.alert("Chọn ảnh", "Bạn muốn chụp ảnh mới hay chọn từ thư viện?", [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh", onPress: takePhotos },
        { text: "Chọn từ thư viện", onPress: pickImages },
      ]);
    } else if (accept === "document") {
      pickDocuments();
    } else {
      Alert.alert("Chọn loại file", "", [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh", onPress: takePhotos },
        { text: "Chọn ảnh", onPress: pickImages },
        { text: "Tài liệu", onPress: pickDocuments },
      ]);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <View style={styles.container}>
      {/* Action buttons */}
      {!disabled && mediaItems.length < maxFiles && (
        <View style={styles.actionsContainer}>
          {accept !== "document" && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={takePhotos}
                disabled={uploading}
              >
                <Ionicons name="camera-outline" size={20} color="#3B82F6" />
                <Text style={styles.actionButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={pickImages}
                disabled={uploading}
              >
                <Ionicons name="images-outline" size={20} color="#3B82F6" />
                <Text style={styles.actionButtonText}>Chọn ảnh</Text>
              </TouchableOpacity>
            </>
          )}
          {accept !== "image" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={pickDocuments}
              disabled={uploading}
            >
              <Ionicons name="document-outline" size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Tài liệu</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.uploadingText}>Đang tải lên...</Text>
        </View>
      )}

      {/* Media grid */}
      {mediaItems.length > 0 && (
        <View style={styles.mediaContainer}>
          <Text style={styles.mediaTitle}>
            {label} ({mediaItems.length}/{maxFiles})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaGrid}
          >
            {mediaItems.map((item, index) => {
              const isImage = item.type === "image" || item.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

              return (
                <View key={item.id || index} style={styles.mediaWrapper}>
                  {isImage ? (
                    <TouchableOpacity
                      onPress={() => showPreview && setPreviewImage(item.url)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: item.url }}
                        style={styles.mediaThumbnail}
                        resizeMode="cover"
                      />
                      {item.uploading && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.documentIcon}>
                      <Ionicons name="document-outline" size={32} color="#3B82F6" />
                      <Text style={styles.documentName} numberOfLines={1}>
                        {item.name || "File"}
                      </Text>
                      {item.size && (
                        <Text style={styles.documentSize}>{formatFileSize(item.size)}</Text>
                      )}
                      {item.uploading && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  )}
                  {!disabled && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {!disabled && mediaItems.length < maxFiles && (
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={showPickerOptions}
                disabled={uploading}
              >
                <Ionicons name="add-circle-outline" size={32} color="#9CA3AF" />
                <Text style={styles.addMoreText}>Thêm</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Image preview modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.previewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          <View style={styles.previewContainer}>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closePreviewButton}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  mediaContainer: {
    marginTop: 8,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  mediaGrid: {
    flexDirection: "row",
    gap: 12,
  },
  mediaWrapper: {
    position: "relative",
  },
  mediaThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  documentIcon: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  documentName: {
    fontSize: 10,
    color: "#1F2937",
    marginTop: 4,
    textAlign: "center",
  },
  documentSize: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  addMoreButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  addMoreText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "90%",
    height: "90%",
  },
  closePreviewButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
});

