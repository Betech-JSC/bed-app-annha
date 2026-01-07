import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { acceptanceApi, AcceptanceTemplate } from "@/api/acceptanceApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";

export default function AcceptanceTemplateDocumentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [template, setTemplate] = useState<AcceptanceTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await acceptanceApi.getTemplate(Number(id));
      if (response.success) {
        setTemplate(response.data);
      }
    } catch (error: any) {
      console.error("Error loading template:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin bộ tài liệu nghiệm thu");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (fileUrl: string) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert("Lỗi", "Không thể mở file này");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể mở file");
    }
  };

  const getFileIcon = (mimeType?: string, type?: string) => {
    if (type === "image" || (mimeType && mimeType.startsWith("image/"))) {
      return "image-outline";
    }
    if (mimeType?.includes("pdf")) {
      return "document-text-outline";
    }
    if (mimeType?.includes("word") || mimeType?.includes("document")) {
      return "document-text-outline";
    }
    if (mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) {
      return "document-text-outline";
    }
    return "document-outline";
  };

  const getFileTypeLabel = (mimeType?: string, type?: string) => {
    if (type === "image" || (mimeType && mimeType.startsWith("image/"))) {
      return "Hình ảnh";
    }
    if (mimeType?.includes("pdf")) {
      return "PDF";
    }
    if (mimeType?.includes("word") || mimeType?.includes("document")) {
      return "Word";
    }
    if (mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) {
      return "Excel";
    }
    return "Tài liệu";
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy bộ tài liệu nghiệm thu</Text>
      </View>
    );
  }

  const documents = template.documents || [];
  const images = template.images || [];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Danh Sách Tài Liệu"
        showBackButton
      />

      <View style={styles.header}>
        <Text style={styles.templateName}>{template.name}</Text>
        {template.description && (
          <Text style={styles.templateDescription}>{template.description}</Text>
        )}
      </View>

      {/* Documents Section */}
      {documents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Tài Liệu Chính ({documents.length})</Text>
          </View>
          <FlatList
            data={documents}
            keyExtractor={(item, index) => `doc-${item.id || item.attachment_id || index}`}
            renderItem={({ item }) => {
              const fileUrl = item.file_url || item.url || item.location;
              const mimeType = item.mime_type || item.type;
              const fileName = item.original_name || "Tài liệu";

              return (
                <TouchableOpacity
                  style={styles.fileItem}
                  onPress={() => fileUrl && handleOpenFile(fileUrl)}
                >
                  <View style={styles.fileIconContainer}>
                    <Ionicons
                      name={getFileIcon(mimeType, item.type)}
                      size={32}
                      color="#3B82F6"
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {fileName}
                    </Text>
                    <Text style={styles.fileType}>
                      {getFileTypeLabel(mimeType, item.type)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              );
            }}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Images Section */}
      {images.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images-outline" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Hình Ảnh Minh Họa ({images.length})</Text>
          </View>
          <FlatList
            data={images}
            keyExtractor={(item, index) => `img-${item.id || item.attachment_id || index}`}
            numColumns={2}
            columnWrapperStyle={styles.imageRow}
            renderItem={({ item }) => {
              const imageUrl = item.file_url || item.url || item.location;

              return (
                <TouchableOpacity
                  style={styles.imageItem}
                  onPress={() => imageUrl && handleOpenFile(imageUrl)}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageName} numberOfLines={1}>
                      {item.original_name || "Hình ảnh"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            scrollEnabled={false}
          />
        </View>
      )}

      {documents.length === 0 && images.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có tài liệu nào</Text>
          <Text style={styles.emptySubtext}>
            Quay lại để thêm tài liệu cho bộ nghiệm thu này
          </Text>
        </View>
      )}
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
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  templateName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
  fileType: {
    fontSize: 12,
    color: "#6B7280",
  },
  imageRow: {
    justifyContent: "space-between",
  },
  imageItem: {
    width: "48%",
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: 150,
  },
  imagePlaceholder: {
    width: "100%",
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 8,
  },
  imageName: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
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
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});




