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
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { costApi, Cost } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";

export default function CostDetailScreen() {
  const router = useRouter();
  const { id, costId } = useLocalSearchParams<{ id: string; costId: string }>();
  const [cost, setCost] = useState<Cost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCost();
  }, [id, costId]);

  const loadCost = async () => {
    try {
      setLoading(true);
      const response = await costApi.getCost(id!, costId!);
      if (response.success) {
        setCost(response.data);
      }
    } catch (error: any) {
      console.error("Error loading cost:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin chi phí");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusColor = (status: Cost["status"]) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending_management_approval":
        return "#F59E0B";
      case "pending_accountant_approval":
        return "#3B82F6";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: Cost["status"]) => {
    switch (status) {
      case "draft":
        return "Nháp";
      case "pending_management_approval":
        return "Chờ Ban điều hành";
      case "pending_accountant_approval":
        return "Chờ Kế toán";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Từ chối";
      default:
        return status;
    }
  };

  const handleOpenFile = (url: string) => {
    Linking.openURL(url).catch((err) => {
      Alert.alert("Lỗi", "Không thể mở file");
    });
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
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy chi phí</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Chi Phí</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(cost.status) + "20" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(cost.status) }]}
            >
              {getStatusText(cost.status)}
            </Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông Tin Cơ Bản</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tên chi phí</Text>
              <Text style={styles.infoValue}>{cost.name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nhóm chi phí</Text>
              <Text style={styles.infoValue}>
                {cost.cost_group?.name || "Chưa phân loại"}
              </Text>
            </View>
            {cost.subcontractor && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nhà thầu phụ</Text>
                  <Text style={styles.infoValue}>{cost.subcontractor.name}</Text>
                </View>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tiền</Text>
              <Text style={[styles.infoValue, styles.amountValue]}>
                {formatCurrency(cost.amount)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày phát sinh</Text>
              <Text style={styles.infoValue}>
                {new Date(cost.cost_date).toLocaleDateString("vi-VN")}
              </Text>
            </View>
            {cost.description && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mô tả</Text>
                  <Text style={styles.infoValue}>{cost.description}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Attachments */}
        {cost.attachments && cost.attachments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tài Liệu Đính Kèm</Text>
            <View style={styles.card}>
              {cost.attachments.map((attachment, index) => {
                const imageUrl = attachment.file_url || attachment.url || attachment.location;
                const isImage = attachment.type === "image" || 
                  (imageUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl));

                return (
                  <TouchableOpacity
                    key={attachment.id || index}
                    style={styles.attachmentItem}
                    onPress={() => handleOpenFile(imageUrl)}
                  >
                    {isImage ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.attachmentThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.attachmentIconContainer}>
                        <Ionicons name="document-outline" size={32} color="#3B82F6" />
                      </View>
                    )}
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachment.original_name || "File"}
                      </Text>
                      <Text style={styles.attachmentType}>
                        {attachment.type || "Document"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Approval Info */}
        {(cost.status === "approved" || cost.status === "rejected") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông Tin Duyệt</Text>
            <View style={styles.card}>
              {cost.management_approver && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ban điều hành duyệt</Text>
                    <Text style={styles.infoValue}>
                      {cost.management_approver.name || "N/A"}
                    </Text>
                  </View>
                  {cost.management_approved_at && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày duyệt (Ban điều hành)</Text>
                        <Text style={styles.infoValue}>
                          {new Date(cost.management_approved_at).toLocaleDateString("vi-VN")}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
              {cost.accountant_approver && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Kế toán xác nhận</Text>
                    <Text style={styles.infoValue}>
                      {cost.accountant_approver.name || "N/A"}
                    </Text>
                  </View>
                  {cost.accountant_approved_at && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày xác nhận (Kế toán)</Text>
                        <Text style={styles.infoValue}>
                          {new Date(cost.accountant_approved_at).toLocaleDateString("vi-VN")}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
              {cost.rejected_reason && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Lý do từ chối</Text>
                    <Text style={[styles.infoValue, styles.rejectedReason]}>
                      {cost.rejected_reason}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Creator Info */}
        {cost.creator && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông Tin Người Tạo</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Người tạo</Text>
                <Text style={styles.infoValue}>
                  {cost.creator.name || "N/A"}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày tạo</Text>
                <Text style={styles.infoValue}>
                  {new Date(cost.created_at).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
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
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginLeft: 12,
  },
  placeholder: {
    width: 32,
  },
  content: {
    padding: 16,
  },
  statusSection: {
    marginBottom: 16,
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "right",
  },
  amountValue: {
    fontSize: 18,
    color: "#EF4444",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  attachmentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  attachmentType: {
    fontSize: 12,
    color: "#6B7280",
  },
  rejectedReason: {
    color: "#EF4444",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
});

