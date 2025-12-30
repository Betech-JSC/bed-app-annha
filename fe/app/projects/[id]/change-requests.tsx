import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { changeRequestApi, ChangeRequest } from "@/api/changeRequestApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function ChangeRequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    loadData();
  }, [id, filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter === "pending") {
        params.pending_only = true;
      } else if (filter !== "all") {
        params.status = filter;
      }
      const response = await changeRequestApi.getChangeRequests(id!, params);
      if (response.success) {
        setChangeRequests(response.data);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách yêu cầu thay đổi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      case "submitted":
      case "under_review":
        return "#F59E0B";
      case "implemented":
        return "#3B82F6";
      case "draft":
        return "#6B7280";
      case "cancelled":
        return "#9CA3AF";
      default:
        return "#6B7280";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#DC2626";
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scope":
        return "document-text-outline";
      case "schedule":
        return "time-outline";
      case "cost":
        return "cash-outline";
      case "quality":
        return "checkmark-circle-outline";
      case "resource":
        return "people-outline";
      default:
        return "document-outline";
    }
  };

  if (loading && changeRequests.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Yêu Cầu Thay Đổi" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  // Group by status
  const pendingRequests = changeRequests.filter((cr) => ["submitted", "under_review"].includes(cr.status));
  const approvedRequests = changeRequests.filter((cr) => cr.status === "approved");
  const rejectedRequests = changeRequests.filter((cr) => cr.status === "rejected");
  const otherRequests = changeRequests.filter(
    (cr) => !["submitted", "under_review", "approved", "rejected"].includes(cr.status)
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Yêu Cầu Thay Đổi"
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push(`/projects/${id}/change-requests/create`)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={[styles.scrollView, { marginBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: "all", label: "Tất cả" },
              { key: "pending", label: "Chờ duyệt" },
              { key: "approved", label: "Đã duyệt" },
              { key: "rejected", label: "Từ chối" },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
                onPress={() => setFilter(f.key as any)}
              >
                <Text
                  style={[styles.filterText, filter === f.key && styles.filterTextActive]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#F59E0B" }]}>{pendingRequests.length}</Text>
            <Text style={styles.summaryLabel}>Chờ duyệt</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#10B981" }]}>{approvedRequests.length}</Text>
            <Text style={styles.summaryLabel}>Đã duyệt</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#EF4444" }]}>{rejectedRequests.length}</Text>
            <Text style={styles.summaryLabel}>Từ chối</Text>
          </View>
        </View>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chờ Duyệt ({pendingRequests.length})</Text>
            {pendingRequests.map((cr) => (
              <ChangeRequestCard
                key={cr.id}
                changeRequest={cr}
                onPress={() => router.push(`/projects/${id}/change-requests/${cr.id}`)}
              />
            ))}
          </View>
        )}

        {/* Approved Requests */}
        {approvedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đã Duyệt ({approvedRequests.length})</Text>
            {approvedRequests.map((cr) => (
              <ChangeRequestCard
                key={cr.id}
                changeRequest={cr}
                onPress={() => router.push(`/projects/${id}/change-requests/${cr.id}`)}
              />
            ))}
          </View>
        )}

        {/* Rejected Requests */}
        {rejectedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Từ Chối ({rejectedRequests.length})</Text>
            {rejectedRequests.map((cr) => (
              <ChangeRequestCard
                key={cr.id}
                changeRequest={cr}
                onPress={() => router.push(`/projects/${id}/change-requests/${cr.id}`)}
              />
            ))}
          </View>
        )}

        {/* Other Requests */}
        {otherRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khác ({otherRequests.length})</Text>
            {otherRequests.map((cr) => (
              <ChangeRequestCard
                key={cr.id}
                changeRequest={cr}
                onPress={() => router.push(`/projects/${id}/change-requests/${cr.id}`)}
              />
            ))}
          </View>
        )}

        {changeRequests.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không có yêu cầu thay đổi</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push(`/projects/${id}/change-requests/create`)}
            >
              <Text style={styles.createButtonText}>Tạo yêu cầu mới</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ChangeRequestCard({
  changeRequest,
  onPress,
}: {
  changeRequest: ChangeRequest;
  onPress: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      case "submitted":
      case "under_review":
        return "#F59E0B";
      case "implemented":
        return "#3B82F6";
      case "draft":
        return "#6B7280";
      case "cancelled":
        return "#9CA3AF";
      default:
        return "#6B7280";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#DC2626";
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scope":
        return "document-text-outline";
      case "schedule":
        return "time-outline";
      case "cost":
        return "cash-outline";
      case "quality":
        return "checkmark-circle-outline";
      case "resource":
        return "people-outline";
      default:
        return "document-outline";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.changeRequestCard, { borderLeftColor: getStatusColor(changeRequest.status) }]}
      onPress={onPress}
    >
      <View style={styles.changeRequestHeader}>
        <View
          style={[
            styles.changeRequestIconContainer,
            { backgroundColor: getStatusColor(changeRequest.status) + "20" },
          ]}
        >
          <Ionicons
            name={getTypeIcon(changeRequest.change_type) as any}
            size={20}
            color={getStatusColor(changeRequest.status)}
          />
        </View>
        <View style={styles.changeRequestContent}>
          <Text style={styles.changeRequestTitle}>{changeRequest.title}</Text>
          <View style={styles.changeRequestMeta}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(changeRequest.status) + "20" },
              ]}
            >
              <Text
                style={[styles.statusText, { color: getStatusColor(changeRequest.status) }]}
              >
                {changeRequest.status}
              </Text>
            </View>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(changeRequest.priority) + "20" },
              ]}
            >
              <Text
                style={[styles.priorityText, { color: getPriorityColor(changeRequest.priority) }]}
              >
                {changeRequest.priority}
              </Text>
            </View>
            <Text style={styles.changeRequestType}>{changeRequest.change_type}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
      {changeRequest.description && (
        <Text style={styles.changeRequestDescription} numberOfLines={2}>
          {changeRequest.description}
        </Text>
      )}
      {changeRequest.estimated_cost_impact && (
        <Text style={styles.changeRequestImpact}>
          Tác động chi phí: {new Intl.NumberFormat("vi-VN").format(changeRequest.estimated_cost_impact)} VNĐ
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  filtersContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  changeRequestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  changeRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  changeRequestIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  changeRequestContent: {
    flex: 1,
  },
  changeRequestTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  changeRequestMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  changeRequestType: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  changeRequestDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  changeRequestImpact: {
    fontSize: 12,
    color: "#F59E0B",
    marginTop: 8,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    textAlign: "center",
  },
  createButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

