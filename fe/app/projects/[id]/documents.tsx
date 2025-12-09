import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { documentApi, ProjectDocument } from "@/api/documentApi";
import { FileUploader } from "@/components";
import { Ionicons } from "@expo/vector-icons";

export default function DocumentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);

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

    try {
      for (const file of files) {
        await documentApi.attachDocument(id!, file.attachment_id || file.id);
      }
      loadDocuments();
    } catch (error) {
      console.error("Error attaching documents:", error);
    }
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
  documentSize: {
    fontSize: 12,
    color: "#6B7280",
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
