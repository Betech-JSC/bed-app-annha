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
import { Ionicons } from "@expo/vector-icons";
import api from "@/api/api";

interface FileUploaderProps {
  onUploadComplete: (files: any[]) => void;
  multiple?: boolean;
  accept?: "image" | "document" | "all";
  maxFiles?: number;
  initialFiles?: any[]; // Files đã có sẵn để preview
}

export default function FileUploader({
  onUploadComplete,
  multiple = false,
  accept = "all",
  maxFiles = 5,
  initialFiles = [],
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>(initialFiles);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Sync với initialFiles
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setUploadedFiles(initialFiles);
    }
  }, [initialFiles]);

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

  // Take photo from camera (single or multiple)
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      if (multiple) {
        // Chụp nhiều ảnh liên tiếp
        const photos: ImagePicker.ImagePickerAsset[] = [];
        let continueTaking = true;

        while (continueTaking && photos.length < maxFiles - uploadedFiles.length) {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            photos.push(result.assets[0]);
            
            // Hỏi có muốn chụp thêm không
            if (photos.length < maxFiles - uploadedFiles.length) {
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
          await uploadFiles(photos);
        }
      } else {
        // Chụp 1 ảnh
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadFiles([result.assets[0]]);
        }
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        quality: 0.8,
        selectionLimit: multiple ? maxFiles - uploadedFiles.length : 1,
      });

      if (!result.canceled && result.assets) {
        await uploadFiles(result.assets);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const pickDocument = async () => {
    // For now, use image picker for documents too
    // In production, you might want to use expo-document-picker
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: multiple,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        await uploadFiles(result.assets);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chọn tài liệu");
    }
  };

  const uploadFiles = async (files: any[]) => {
    if (uploadedFiles.length + files.length > maxFiles) {
      Alert.alert("Lỗi", `Chỉ được upload tối đa ${maxFiles} file`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        const fileExtension = file.uri.split(".").pop();
        const fileType = file.mimeType || `image/${fileExtension}`;

        formData.append(`files[${index}]`, {
          uri: file.uri,
          type: fileType,
          name: file.fileName || `file_${Date.now()}_${index}.${fileExtension}`,
        } as any);
      });

      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        const newFiles = response.data.data || [];
        const allFiles = [...uploadedFiles, ...newFiles];
        setUploadedFiles(allFiles);
        onUploadComplete(allFiles);
        Alert.alert("Thành công", "Upload file thành công");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadComplete(newFiles);
  };

  const showPicker = () => {
    if (accept === "image") {
      Alert.alert("Chọn ảnh", "Bạn muốn chụp ảnh mới hay chọn từ thư viện?", [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh", onPress: takePhoto },
        { text: "Chọn từ thư viện", onPress: pickImage },
      ]);
    } else if (accept === "document") {
      pickDocument();
    } else {
      Alert.alert("Chọn loại file", "", [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh", onPress: takePhoto },
        { text: "Chọn ảnh", onPress: pickImage },
        { text: "Tài liệu", onPress: pickDocument },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={showPicker}
        disabled={uploading || uploadedFiles.length >= maxFiles}
      >
        {uploading ? (
          <ActivityIndicator color="#3B82F6" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={24} color="#3B82F6" />
            <Text style={styles.uploadButtonText}>
              {uploadedFiles.length >= maxFiles
                ? "Đã đạt giới hạn"
                : "Chọn file để upload"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Preview uploaded images */}
      {uploadedFiles.length > 0 && (
        <View style={styles.filesContainer}>
          <Text style={styles.previewTitle}>
            Đã tải lên ({uploadedFiles.length}/{maxFiles})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesGrid}
          >
            {uploadedFiles.map((file, index) => {
              const imageUrl = file.file_url || file.url || file.location;
              const isImage = file.type === "image" || imageUrl;

              return (
                <View key={index} style={styles.imageWrapper}>
                  {isImage ? (
                    <TouchableOpacity
                      onPress={() => setPreviewImage(imageUrl)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.imageThumbnail}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.fileIcon}>
                      <Ionicons name="document-outline" size={32} color="#3B82F6" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeFile(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  {!isImage && (
                    <View style={styles.fileInfoOverlay}>
                      <Text style={styles.fileNameSmall} numberOfLines={1}>
                        {file.original_name || "File"}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Fullscreen image preview modal */}
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
    marginVertical: 16,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 2,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
  },
  filesContainer: {
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: "row",
    gap: 12,
  },
  imageWrapper: {
    position: "relative",
  },
  imageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 2,
  },
  fileIcon: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 4,
  },
  fileNameSmall: {
    fontSize: 10,
    color: "#FFFFFF",
    textAlign: "center",
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
