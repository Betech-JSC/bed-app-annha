import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { attachmentApi, UploadResponse } from "@/api/attachmentApi";

export interface ImageItem {
  id?: string;
  url: string;
  attachment_id?: number;
  localUri?: string; // For preview before upload
  uploading?: boolean;
}

interface ImagePickerProps {
  value?: ImageItem[]; // Array of image URLs or objects
  onChange?: (images: ImageItem[]) => void;
  maxImages?: number;
  multiple?: boolean;
  disabled?: boolean;
  showPreview?: boolean;
}

export default function ImagePickerComponent({
  value = [],
  onChange,
  maxImages = 10,
  multiple = true,
  disabled = false,
  showPreview = true,
}: ImagePickerProps) {
  const [images, setImages] = useState<ImageItem[]>(value);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  // Request media library permissions
  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Cần quyền truy cập",
        "Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh."
      );
      return false;
    }
    return true;
  };

  // Take photo from camera
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  // Pick images from library
  const pickImages = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        quality: 0.8,
        selectionLimit: multiple ? maxImages - images.length : 1,
      });

      if (!result.canceled && result.assets) {
        await uploadImages(result.assets);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  // Upload single image
  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (images.length >= maxImages) {
      Alert.alert("Lỗi", `Chỉ được upload tối đa ${maxImages} ảnh`);
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const tempImage: ImageItem = {
      id: tempId,
      url: asset.uri,
      localUri: asset.uri,
      uploading: true,
    };

    setImages((prev) => [...prev, tempImage]);
    setUploading(true);

    try {
      const formData = new FormData();
      const fileExtension = asset.uri.split(".").pop() || "jpg";
      const fileName = asset.fileName || `image_${Date.now()}.${fileExtension}`;

      formData.append("files[0]", {
        uri: asset.uri,
        type: asset.mimeType || `image/${fileExtension}`,
        name: fileName,
      } as any);

      const response = await attachmentApi.upload(formData);

      if (response.success && response.data && response.data.length > 0) {
        const uploadedFile: UploadResponse = response.data[0];
        const newImage: ImageItem = {
          id: uploadedFile.attachment_id.toString(),
          url: uploadedFile.file_url,
          attachment_id: uploadedFile.attachment_id,
        };

        setImages((prev) => {
          const updated = prev.map((img) => (img.id === tempId ? newImage : img));
          onChange?.(updated);
          return updated;
        });
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Upload thất bại");
      setImages((prev) => prev.filter((img) => img.id !== tempId));
    } finally {
      setUploading(false);
    }
  };

  // Upload multiple images
  const uploadImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const remainingSlots = maxImages - images.length;
    if (assets.length > remainingSlots) {
      Alert.alert(
        "Lỗi",
        `Chỉ có thể thêm ${remainingSlots} ảnh nữa (tối đa ${maxImages} ảnh)`
      );
      return;
    }

    setUploading(true);

    const tempImages: ImageItem[] = [];

    try {
      const formData = new FormData();

      assets.forEach((asset, index) => {
        const tempId = `temp_${Date.now()}_${index}`;
        tempImages.push({
          id: tempId,
          url: asset.uri,
          localUri: asset.uri,
          uploading: true,
        });

        const fileExtension = asset.uri.split(".").pop() || "jpg";
        const fileName = asset.fileName || `image_${Date.now()}_${index}.${fileExtension}`;

        formData.append(`files[${index}]`, {
          uri: asset.uri,
          type: asset.mimeType || `image/${fileExtension}`,
          name: fileName,
        } as any);
      });

      setImages((prev) => [...prev, ...tempImages]);

      const response = await attachmentApi.upload(formData);

      if (response.success && response.data) {
        const uploadedFiles: UploadResponse[] = response.data;
        const newImages: ImageItem[] = uploadedFiles.map((file) => ({
          id: file.attachment_id.toString(),
          url: file.file_url,
          attachment_id: file.attachment_id,
        }));

        setImages((prev) => {
          const updated = prev
            .filter((img) => !tempImages.some((temp) => temp.id === img.id))
            .concat(newImages);
          onChange?.(updated);
          return updated;
        });
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Upload thất bại");
      setImages((prev) =>
        prev.filter((img) => !tempImages.some((temp) => temp.id === img.id))
      );
    } finally {
      setUploading(false);
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa ảnh này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);
            onChange?.(newImages);
          },
        },
      ]
    );
  };

  // Show image picker options
  const showImagePickerOptions = () => {
    Alert.alert(
      "Chọn ảnh",
      "Bạn muốn chụp ảnh mới hay chọn từ thư viện?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh", onPress: takePhoto },
        { text: "Chọn từ thư viện", onPress: pickImages },
      ]
    );
  };

  // Sync with value prop
  React.useEffect(() => {
    if (value && value.length >= 0) {
      setImages(value);
    }
  }, [value]);

  return (
    <View style={styles.container}>
      {/* Action buttons */}
      {!disabled && images.length < maxImages && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={takePhoto}
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
            <Text style={styles.actionButtonText}>
              {multiple ? "Chọn ảnh" : "Chọn ảnh"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.uploadingText}>Đang tải ảnh lên...</Text>
        </View>
      )}

      {/* Images grid */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
        >
          {images.map((image, index) => (
            <View key={image.id || index} style={styles.imageWrapper}>
              <TouchableOpacity
                onPress={() => showPreview && setPreviewImage(image.url)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: image.url }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {image.uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              {!disabled && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {!disabled && images.length < maxImages && (
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={showImagePickerOptions}
              disabled={uploading}
            >
              <Ionicons name="add-circle-outline" size={32} color="#9CA3AF" />
              <Text style={styles.addMoreText}>
                Thêm ({images.length}/{maxImages})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
  imagesContainer: {
    marginTop: 8,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
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
  },
});

