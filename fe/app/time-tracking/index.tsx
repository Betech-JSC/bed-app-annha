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
  TextInput,
  Modal,
} from "react-native";
import { timeTrackingApi, TimeTracking } from "@/api/timeTrackingApi";
import { Ionicons } from "@expo/vector-icons";

export default function MyTimeTrackingScreen() {
  const [timeTrackings, setTimeTrackings] = useState<TimeTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasOpenCheckIn, setHasOpenCheckIn] = useState(false);
  const [openTrackingId, setOpenTrackingId] = useState<number | null>(null);
  const [checkOutModalVisible, setCheckOutModalVisible] = useState(false);
  const [checkOutLocation, setCheckOutLocation] = useState("");

  useEffect(() => {
    loadTimeTrackings();
  }, []);

  const loadTimeTrackings = async () => {
    try {
      setLoading(true);
      const response = await timeTrackingApi.getMyTimeTracking({ page: 1 });
      if (response.success) {
        const trackings = response.data.data || [];
        setTimeTrackings(trackings);

        // Check for open check-in
        const open = trackings.find(
          (t: TimeTracking) => !t.check_out_at && t.status !== "rejected"
        );
        setHasOpenCheckIn(!!open);
        setOpenTrackingId(open?.id || null);
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

  const handleCheckIn = async () => {
    Alert.prompt(
      "Check-in",
      "Nhập địa điểm:",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Check-in",
          onPress: async (location) => {
            try {
              const response = await timeTrackingApi.checkIn({
                check_in_location: location || undefined,
              });
              if (response.success) {
                Alert.alert("Thành công", "Đã check-in");
                loadTimeTrackings();
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể check-in");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleCheckOut = async () => {
    if (!openTrackingId) return;

    try {
      const response = await timeTrackingApi.checkOut(openTrackingId, {
        check_out_location: checkOutLocation,
      });
      if (response.success) {
        Alert.alert("Thành công", "Đã check-out");
        setCheckOutModalVisible(false);
        setCheckOutLocation("");
        loadTimeTrackings();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể check-out");
    }
  };

  const renderItem = ({ item }: { item: TimeTracking }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>
          {new Date(item.check_in_at).toLocaleDateString("vi-VN")}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "approved"
                  ? "#10B98120"
                  : item.status === "rejected"
                    ? "#EF444420"
                    : "#F59E0B20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === "approved"
                    ? "#10B981"
                    : item.status === "rejected"
                      ? "#EF4444"
                      : "#F59E0B",
              },
            ]}
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
        <Text style={styles.infoLabel}>Check-in:</Text>
        <Text style={styles.infoValue}>
          {new Date(item.check_in_at).toLocaleTimeString("vi-VN")}
        </Text>
      </View>

      {item.check_out_at && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Check-out:</Text>
          <Text style={styles.infoValue}>
            {new Date(item.check_out_at).toLocaleTimeString("vi-VN")}
          </Text>
        </View>
      )}

      {item.total_hours && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tổng giờ:</Text>
          <Text style={styles.infoValue}>{item.total_hours} giờ</Text>
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
      <View style={styles.actionContainer}>
        {!hasOpenCheckIn ? (
          <TouchableOpacity
            style={styles.checkInButton}
            onPress={handleCheckIn}
          >
            <Ionicons name="time-outline" size={24} color="#FFFFFF" />
            <Text style={styles.checkInButtonText}>Check-in</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.checkOutButton}
            onPress={() => setCheckOutModalVisible(true)}
          >
            <Ionicons name="time" size={24} color="#FFFFFF" />
            <Text style={styles.checkOutButtonText}>Check-out</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={timeTrackings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có lịch sử chấm công</Text>
          </View>
        }
      />

      <Modal
        visible={checkOutModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckOutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Check-out</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập địa điểm"
              value={checkOutLocation}
              onChangeText={setCheckOutLocation}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCheckOutModalVisible(false);
                  setCheckOutLocation("");
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCheckOut}
              >
                <Text style={styles.modalButtonText}>Check-out</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  actionContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  checkInButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  checkOutButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkOutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
    alignItems: "center",
    marginBottom: 12,
  },
  date: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
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
    justifyContent: "space-between",
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  confirmButton: {
    backgroundColor: "#EF4444",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
