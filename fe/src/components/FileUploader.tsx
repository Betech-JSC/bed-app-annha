import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import api from "@/api/api";

interface FileUploaderProps {
  onUploadComplete: (files: any[]) => void;
  multiple?: boolean;
  accept?: "image" | "document" | "all";
  maxFiles?: number;
}

export default function FileUploader({
  onUploadComplete,
  multiple = false,
  accept = "all",
  maxFiles = 5,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        quality: 0.8,
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
      pickImage();
    } else if (accept === "document") {
      pickDocument();
    } else {
      Alert.alert("Chọn loại file", "", [
        { text: "Hủy", style: "cancel" },
        { text: "Ảnh", onPress: pickImage },
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

      {uploadedFiles.length > 0 && (
        <View style={styles.filesContainer}>
          {uploadedFiles.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              {file.type === "image" ? (
                <Image
                  source={{ uri: file.file_url }}
                  style={styles.fileThumbnail}
                />
              ) : (
                <View style={styles.fileIcon}>
                  <Ionicons name="document-outline" size={32} color="#3B82F6" />
                </View>
              )}
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.original_name || "File"}
                </Text>
                <Text style={styles.fileSize}>
                  {file.file_size
                    ? `${(file.file_size / 1024).toFixed(2)} KB`
                    : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFile(index)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
    gap: 12,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  fileThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  fileIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: "#6B7280",
  },
  removeButton: {
    padding: 4,
  },
});
