import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AcceptanceItem, AcceptanceStage, acceptanceApi } from "@/api/acceptanceApi";
import AcceptanceItemForm from "./AcceptanceItemForm";
import { PermissionGuard } from "./PermissionGuard";

interface AcceptanceItemListProps {
  stage: AcceptanceStage;
  projectId: string | number;
  items: AcceptanceItem[];
  onRefresh: () => void;
  onItemApprove: (itemId: number) => Promise<void>;
  onItemReject: (itemId: number, reason: string) => Promise<void>;
}

export default function AcceptanceItemList({
  stage,
  projectId,
  items,
  onRefresh,
  onItemApprove,
  onItemReject,
}: AcceptanceItemListProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AcceptanceItem | null>(null);
  const [expanded, setExpanded] = useState(true);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      case "pending":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "approved":
        return "Đạt";
      case "rejected":
        return "Không đạt";
      case "pending":
        return "Chưa nghiệm thu";
      case "not_started":
        return "Chưa bắt đầu";
      default:
        return status;
    }
  };

  const handleCreateItem = async (data: any) => {
    try {
      await acceptanceApi.createItem(projectId, stage.id, data);
      Alert.alert("Thành công", "Đã tạo hạng mục");
      onRefresh();
    } catch (error: any) {
      throw error;
    }
  };

  const handleUpdateItem = async (data: any) => {
    if (!selectedItem) return;
    try {
      await acceptanceApi.updateItem(projectId, stage.id, selectedItem.id, data);
      Alert.alert("Thành công", "Đã cập nhật hạng mục");
      onRefresh();
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa hạng mục này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await acceptanceApi.deleteItem(projectId, stage.id, itemId);
              Alert.alert("Thành công", "Đã xóa hạng mục");
              onRefresh();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa hạng mục");
            }
          },
        },
      ]
    );
  };

  const handleApprove = async (item: AcceptanceItem) => {
    if (!item.can_accept) {
      Alert.alert("Lỗi", "Hạng mục chỉ được nghiệm thu sau khi hoàn thành (ngày kết thúc đã qua)");
      return;
    }

    Alert.prompt(
      "Nghiệm thu hạng mục",
      "Nhập ghi chú (tùy chọn):",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đạt",
          onPress: async (notes) => {
            try {
              await acceptanceApi.approveItem(projectId, stage.id, item.id, notes);
              Alert.alert("Thành công", "Hạng mục đã được nghiệm thu (Đạt)");
              onRefresh();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể nghiệm thu");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleReject = async (item: AcceptanceItem) => {
    if (!item.can_accept) {
      Alert.alert("Lỗi", "Hạng mục chỉ được nghiệm thu sau khi hoàn thành (ngày kết thúc đã qua)");
      return;
    }

    Alert.prompt(
      "Từ chối nghiệm thu",
      "Nhập lý do từ chối:",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Không đạt",
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
              return;
            }
            try {
              await acceptanceApi.rejectItem(projectId, stage.id, item.id, reason);
              Alert.alert("Thành công", "Hạng mục đã bị từ chối nghiệm thu (Không đạt)");
              onRefresh();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối nghiệm thu");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={20}
            color="#6B7280"
          />
          <Text style={styles.headerTitle}>Hạng mục ({items.length})</Text>
          <View
            style={[
              styles.completionBadge,
              {
                backgroundColor:
                  stage.completion_percentage === 100
                    ? "#10B98120"
                    : stage.completion_percentage > 0
                      ? "#F59E0B20"
                      : "#6B728020",
              },
            ]}
          >
            <Text
              style={[
                styles.completionText,
                {
                  color:
                    stage.completion_percentage === 100
                      ? "#10B981"
                      : stage.completion_percentage > 0
                        ? "#F59E0B"
                        : "#6B7280",
                },
              ]}
            >
              {stage.completion_percentage?.toFixed(0) || 0}%
            </Text>
          </View>
        </View>
        <PermissionGuard permission="acceptance.create">
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedItem(null);
              setShowForm(true);
            }}
          >
            <Ionicons name="add" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </PermissionGuard>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.itemsContainer}>
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có hạng mục</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderLeft}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(item.acceptance_status) },
                      ]}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDates}>
                        {new Date(item.start_date).toLocaleDateString("vi-VN")} -{" "}
                        {new Date(item.end_date).toLocaleDateString("vi-VN")}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.acceptance_status) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(item.acceptance_status) },
                      ]}
                    >
                      {getStatusLabel(item.acceptance_status)}
                    </Text>
                  </View>
                </View>

                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}

                {item.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Ghi chú:</Text>
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                )}

                {item.rejection_reason && (
                  <View style={styles.rejectionContainer}>
                    <Text style={styles.rejectionLabel}>Lý do từ chối:</Text>
                    <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
                  </View>
                )}

                {item.approved_at && (
                  <Text style={styles.approvedText}>
                    Đã nghiệm thu: {new Date(item.approved_at).toLocaleString("vi-VN")}
                  </Text>
                )}

                <View style={styles.itemActions}>
                  {item.can_accept && item.acceptance_status === "pending" && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(item)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <Text style={styles.approveButtonText}>Đạt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(item)}
                      >
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                        <Text style={styles.rejectButtonText}>Không đạt</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <PermissionGuard permission="acceptance.update">
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setSelectedItem(item);
                        setShowForm(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#3B82F6" />
                    </TouchableOpacity>
                    {item.acceptance_status !== "approved" && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteItem(item.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </PermissionGuard>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <AcceptanceItemForm
        visible={showForm}
        item={selectedItem}
        onClose={() => {
          setShowForm(false);
          setSelectedItem(null);
        }}
        onSubmit={selectedItem ? handleUpdateItem : handleCreateItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  completionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  addButton: {
    padding: 4,
  },
  itemsContainer: {
    marginTop: 8,
    gap: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemDates: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  notesContainer: {
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#1F2937",
  },
  rejectionContainer: {
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: "#DC2626",
  },
  approvedText: {
    fontSize: 12,
    color: "#10B981",
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveButton: {
    backgroundColor: "#10B98120",
  },
  approveButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF444420",
  },
  rejectButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  editButton: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
  },
});

