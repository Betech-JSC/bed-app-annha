import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { timeTrackingApi, TimeTracking } from "@/api/timeTrackingApi";
import { Ionicons } from "@expo/vector-icons";

export default function TimeTrackingScreen() {
  const router = useRouter();
  const [timeTrackings, setTimeTrackings] = useState<TimeTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTimeTrackings();
  }, []);

  const loadTimeTrackings = async () => {
    try {
      setLoading(true);
      const response = await timeTrackingApi.getTimeTracking({ page: 1 });
      if (response.success) {
        setTimeTrackings(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading time trackings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTimeTrackings();
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await timeTrackingApi.approve(id);
      if (response.success) {
        Alert.alert("Thành công", "Đã duyệt chấm công");
        loadTimeTrackings();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể duyệt chấm công");
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await timeTrackingApi.reject(id);
      if (response.success) {
        Alert.alert("Thành công", "Đã từ chối chấm công");
        loadTimeTrackings();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể từ chối chấm công");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      default:
        return "#F59E0B";
    }
  };

  const renderItem = ({ item }: { item: TimeTracking }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.employeeName}>{item.user?.name || "N/A"}</Text>
          <Text style={styles.projectName}>{item.project?.name || "Không có dự án"}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status === "approved"
              ? "Đã duyệt"
              : item.status === "rejected"
                ? "Từ chối"
                : "Chờ duyệt"}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          {new Date(item.check_in_at).toLocaleString("vi-VN")}
        </Text>
      </View>

      {item.check_out_at && (
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            {new Date(item.check_out_at).toLocaleString("vi-VN")}
          </Text>
        </View>
      )}

      {item.total_hours && (
        <View style={styles.infoRow}>
          <Ionicons name="hourglass-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>{item.total_hours} giờ</Text>
        </View>
      )}

      {item.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
          >
            <Text style={styles.actionButtonText}>Duyệt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Text style={styles.actionButtonText}>Từ chối</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
      <FlatList
        data={timeTrackings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có dữ liệu</Text>
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
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  projectName: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
});
