import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { additionalCostApi, AdditionalCost } from "@/api/additionalCostApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function AdditionalCostDetailScreen() {
  const router = useRouter();
  const { id, costId } = useLocalSearchParams<{ id: string; costId: string }>();
  const tabBarHeight = useTabBarHeight();
  const [cost, setCost] = useState<AdditionalCost | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadCostDetail();
  }, [id, costId]);

  const loadCostDetail = async () => {
    try {
      setLoading(true);
      const response = await additionalCostApi.getAdditionalCost(id!, costId!);
      if (response.success) {
        setCost(response.data);
      }
    } catch (error) {
      console.error("Error loading cost detail:", error);
      Alert.alert("Lỗi", "Không thể tải chi tiết chi phí phát sinh");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCostDetail();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending_approval":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Đã duyệt";
      case "pending_approval":
        return "Chờ duyệt";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const handleApprove = async () => {
    try {
      const response = await additionalCostApi.approveAdditionalCost(id!, costId!);
      if (response.success) {
        Alert.alert("Thành công", "Chi phí phát sinh đã được duyệt.");
        loadCostDetail();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleReject = () => {
    Alert.prompt(
      "Từ chối chi phí phát sinh",
      "Vui lòng nhập lý do từ chối:",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async (reason) => {
            if (!reason || reason.trim() === "") {
              Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
              return;
            }
            try {
              const response = await additionalCostApi.rejectAdditionalCost(
                id!,
                costId!,
                reason
              );
              if (response.success) {
                Alert.alert("Thành công", "Chi phí phát sinh đã bị từ chối.");
                loadCostDetail();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const openFile = (fileUrl: string, mimeType: string) => {
    if (mimeType?.startsWith("image/")) {
      setPreviewImage(fileUrl);
    } else {
      // For documents, you might want to open in a browser or document viewer
      Alert.alert("Mở file", "File sẽ được mở trong trình duyệt");
      // You can use Linking.openURL(fileUrl) here if needed
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!cost) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Tiết Chi Phí Phát Sinh" showBackButton />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Không tìm thấy chi phí phát sinh</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Chi Tiết Chi Phí Phát Sinh" showBackButton />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Thông tin cơ bản */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Thông Tin Cơ Bản</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số tiền:</Text>
            <Text style={styles.infoValue}>{formatCurrency(cost.amount)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái:</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(cost.status) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(cost.status) },
                ]}
              >
                {getStatusText(cost.status)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mô tả:</Text>
          </View>
          <Text style={styles.description}>{cost.description}</Text>
        </View>

        {/* Thông tin người đề xuất */}
        {cost.proposer && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Người Đề Xuất</Text>
            </View>
            <Text style={styles.infoValue}>{cost.proposer.name}</Text>
            <Text style={styles.infoSubtext}>{cost.proposer.email}</Text>
            {cost.created_at && (
              <Text style={styles.infoSubtext}>
                Ngày tạo: {new Date(cost.created_at).toLocaleDateString("vi-VN")}
              </Text>
            )}
          </View>
        )}

        {/* Thông tin người duyệt */}
        {cost.approver && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.cardTitle}>Người Duyệt</Text>
            </View>
            <Text style={styles.infoValue}>{cost.approver.name}</Text>
            <Text style={styles.infoSubtext}>{cost.approver.email}</Text>
            {cost.approved_at && (
              <Text style={styles.infoSubtext}>
                Ngày duyệt: {new Date(cost.approved_at).toLocaleDateString("vi-VN")}
              </Text>
            )}
          </View>
        )}

        {/* Lý do từ chối */}
        {cost.status === "rejected" && cost.rejected_reason && (
          <View style={[styles.card, styles.rejectedCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
              <Text style={styles.cardTitle}>Lý Do Từ Chối</Text>
            </View>
            <Text style={styles.rejectedReason}>{cost.rejected_reason}</Text>
          </View>
        )}

        {/* File đính kèm */}
        {cost.attachments && cost.attachments.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="attach" size={24} color="#F59E0B" />
              <Text style={styles.cardTitle}>
                File Đính Kèm ({cost.attachments.length})
              </Text>
            </View>
            <View style={styles.attachmentsGrid}>
              {cost.attachments.map((attachment) => {
                const isImage = attachment.mime_type?.startsWith("image/");
                return (
                  <TouchableOpacity
                    key={attachment.id}
                    style={styles.attachmentItem}
                    onPress={() => openFile(attachment.file_url, attachment.mime_type || "")}
                  >
                    {isImage ? (
                      <Image
                        source={{ uri: attachment.file_url }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.attachmentDocument}>
                        <Ionicons name="document" size={32} color="#3B82F6" />
                        <Text style={styles.attachmentFileName} numberOfLines={1}>
                          {attachment.original_name || attachment.file_name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions - Chỉ hiển thị nếu chờ duyệt */}
        {cost.status === "pending_approval" && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Duyệt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Từ Chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  rejectedReason: {
    fontSize: 14,
    color: "#DC2626",
    lineHeight: 20,
  },
  attachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  attachmentItem: {
    width: "47%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  attachmentImage: {
    width: "100%",
    height: 120,
  },
  attachmentDocument: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  attachmentFileName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewClose: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
});



