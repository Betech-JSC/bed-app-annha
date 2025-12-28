import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { timeTrackingApi, TimeTracking } from "@/api/timeTrackingApi";
import { projectApi, Project } from "@/api/projectApi";
import { ScreenHeader } from "@/components";

// Try to import expo-location, fallback if not available
let Location: any = null;
try {
  Location = require("expo-location");
} catch (error) {
  console.log("expo-location not available");
}

export default function CheckInOutScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasOpenCheckIn, setHasOpenCheckIn] = useState(false);
  const [openTracking, setOpenTracking] = useState<TimeTracking | null>(null);
  const [todayTrackings, setTodayTrackings] = useState<TimeTracking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [location, setLocation] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutLocation, setCheckOutLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (!Location) {
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        getCurrentLocation();
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  };

  const getCurrentLocation = async () => {
    if (!Location) {
      Alert.alert(
        "Thông báo",
        "Tính năng GPS chưa được cài đặt. Vui lòng nhập địa điểm thủ công."
      );
      return;
    }
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get address
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addresses.length > 0) {
          const addr = addresses[0];
          const addressParts = [
            addr.street,
            addr.district,
            addr.city,
            addr.region,
          ].filter(Boolean);
          setLocation(addressParts.join(", ") || "Đang lấy địa chỉ...");
          setCurrentLocation((prev) => ({
            ...prev!,
            address: addressParts.join(", "),
          }));
        }
      } catch (error) {
        console.error("Error reverse geocoding:", error);
        setLocation(
          `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
        );
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Thông báo",
        "Không thể lấy vị trí GPS. Bạn có thể nhập thủ công."
      );
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [trackingRes, projectsRes] = await Promise.all([
        timeTrackingApi.getMyTimeTracking({ page: 1 }),
        projectApi.getProjects({ my_projects: true }),
      ]);

      if (trackingRes.success) {
        const trackings = trackingRes.data.data || [];
        setTodayTrackings(trackings.slice(0, 5));

        // Check for open check-in
        const today = new Date().toISOString().split("T")[0];
        const open = trackings.find(
          (t: TimeTracking) =>
            !t.check_out_at &&
            t.status !== "rejected" &&
            t.check_in_at.startsWith(today)
        );
        setHasOpenCheckIn(!!open);
        setOpenTracking(open || null);
      }

      if (projectsRes.success) {
        setProjects(projectsRes.data.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await timeTrackingApi.checkIn({
        project_id: selectedProject || undefined,
        check_in_location: location || currentLocation?.address || undefined,
        notes: notes || undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã check-in thành công!", [
          {
            text: "OK",
            onPress: () => {
              setShowCheckInModal(false);
              setSelectedProject(null);
              setLocation("");
              setNotes("");
              loadData();
            },
          },
        ]);
      } else {
        Alert.alert("Lỗi", response.message || "Không thể check-in");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể check-in. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!openTracking || submitting) return;

    try {
      setSubmitting(true);
      const response = await timeTrackingApi.checkOut(openTracking.id, {
        check_out_location:
          checkOutLocation || currentLocation?.address || undefined,
        notes: notes || undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã check-out thành công!", [
          {
            text: "OK",
            onPress: () => {
              setShowCheckOutModal(false);
              setCheckOutLocation("");
              setNotes("");
              loadData();
            },
          },
        ]);
      } else {
        Alert.alert("Lỗi", response.message || "Không thể check-out");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể check-out. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayRecords = todayTrackings.filter((t) =>
      t.check_in_at.startsWith(today)
    );

    const totalHours = todayRecords.reduce((sum, t) => {
      return sum + (t.total_hours || 0);
    }, 0);

    return {
      count: todayRecords.length,
      totalHours: totalHours.toFixed(1),
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const stats = getTodayStats();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Chấm Công" showBackButton />

      <ScrollView style={styles.content}>
        {/* Today Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Hôm Nay</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>Lần chấm công</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalHours}</Text>
              <Text style={styles.statLabel}>Tổng giờ</Text>
            </View>
          </View>
        </View>

        {/* Current Status */}
        <View
          style={[
            styles.statusCard,
            hasOpenCheckIn ? styles.statusCardActive : styles.statusCardInactive,
          ]}
        >
          <View style={styles.statusHeader}>
            <Ionicons
              name={hasOpenCheckIn ? "time" : "time-outline"}
              size={32}
              color={hasOpenCheckIn ? "#EF4444" : "#10B981"}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {hasOpenCheckIn ? "Đang làm việc" : "Chưa check-in"}
              </Text>
              {openTracking && (
                <Text style={styles.statusTime}>
                  Check-in:{" "}
                  {new Date(openTracking.check_in_at).toLocaleTimeString(
                    "vi-VN"
                  )}
                </Text>
              )}
            </View>
          </View>

          {hasOpenCheckIn && openTracking && (
            <View style={styles.workingTime}>
              <Text style={styles.workingTimeLabel}>Thời gian làm việc:</Text>
              <Text style={styles.workingTimeValue}>
                {(() => {
                  const checkInTime = new Date(openTracking.check_in_at);
                  const now = new Date();
                  const diffMs = now.getTime() - checkInTime.getTime();
                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                  const minutes = Math.floor(
                    (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                  );
                  return `${hours}h ${minutes}m`;
                })()}
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            hasOpenCheckIn ? styles.checkOutButton : styles.checkInButton,
          ]}
          onPress={() => {
            if (hasOpenCheckIn) {
              setShowCheckOutModal(true);
              getCurrentLocation();
            } else {
              setShowCheckInModal(true);
              getCurrentLocation();
            }
          }}
          disabled={submitting}
        >
          <Ionicons
            name={hasOpenCheckIn ? "log-out" : "log-in"}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.actionButtonText}>
            {hasOpenCheckIn ? "Check-out" : "Check-in"}
          </Text>
        </TouchableOpacity>

        {/* Recent Records */}
        {todayTrackings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lịch sử hôm nay</Text>
            {todayTrackings.map((tracking) => (
              <View key={tracking.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTime}>
                    {new Date(tracking.check_in_at).toLocaleTimeString("vi-VN")}
                    {tracking.check_out_at &&
                      ` - ${new Date(tracking.check_out_at).toLocaleTimeString("vi-VN")}`}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          tracking.status === "approved"
                            ? "#10B98120"
                            : tracking.status === "rejected"
                              ? "#EF444420"
                              : "#F59E0B20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            tracking.status === "approved"
                              ? "#10B981"
                              : tracking.status === "rejected"
                                ? "#EF4444"
                                : "#F59E0B",
                        },
                      ]}
                    >
                      {tracking.status === "approved"
                        ? "Đã duyệt"
                        : tracking.status === "rejected"
                          ? "Từ chối"
                          : "Chờ duyệt"}
                    </Text>
                  </View>
                </View>
                {tracking.total_hours && (
                  <Text style={styles.recordHours}>
                    {tracking.total_hours} giờ
                  </Text>
                )}
                {tracking.check_in_location && (
                  <Text style={styles.recordLocation}>
                    📍 {tracking.check_in_location}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Check-in Modal */}
      <Modal
        visible={showCheckInModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Check-in</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCheckInModal(false);
                  setSelectedProject(null);
                  setLocation("");
                  setNotes("");
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Project Selection */}
              {projects.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Dự án (tùy chọn)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.projectScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.projectChip,
                        selectedProject === null && styles.projectChipActive,
                      ]}
                      onPress={() => setSelectedProject(null)}
                    >
                      <Text
                        style={[
                          styles.projectChipText,
                          selectedProject === null &&
                          styles.projectChipTextActive,
                        ]}
                      >
                        Không chọn
                      </Text>
                    </TouchableOpacity>
                    {projects.map((project) => (
                      <TouchableOpacity
                        key={project.id}
                        style={[
                          styles.projectChip,
                          selectedProject === project.id &&
                          styles.projectChipActive,
                        ]}
                        onPress={() => setSelectedProject(project.id)}
                      >
                        <Text
                          style={[
                            styles.projectChipText,
                            selectedProject === project.id &&
                            styles.projectChipTextActive,
                          ]}
                        >
                          {project.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Địa điểm{" "}
                  <TouchableOpacity onPress={getCurrentLocation}>
                    <Ionicons name="location" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập địa điểm hoặc bấm icon để lấy GPS"
                  value={location}
                  onChangeText={setLocation}
                  multiline
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ghi chú (tùy chọn)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập ghi chú..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCheckInModal(false);
                  setSelectedProject(null);
                  setLocation("");
                  setNotes("");
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCheckIn}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Check-in</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Check-out Modal */}
      <Modal
        visible={showCheckOutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckOutModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Check-out</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCheckOutModal(false);
                  setCheckOutLocation("");
                  setNotes("");
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {openTracking && (
              <View style={styles.checkInInfo}>
                <Text style={styles.checkInInfoLabel}>Check-in lúc:</Text>
                <Text style={styles.checkInInfoValue}>
                  {new Date(openTracking.check_in_at).toLocaleString("vi-VN")}
                </Text>
                {openTracking.check_in_location && (
                  <Text style={styles.checkInInfoLocation}>
                    📍 {openTracking.check_in_location}
                  </Text>
                )}
              </View>
            )}

            <ScrollView>
              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Địa điểm{" "}
                  <TouchableOpacity onPress={getCurrentLocation}>
                    <Ionicons name="location" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập địa điểm hoặc bấm icon để lấy GPS"
                  value={checkOutLocation}
                  onChangeText={setCheckOutLocation}
                  multiline
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ghi chú (tùy chọn)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập ghi chú..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCheckOutModal(false);
                  setCheckOutLocation("");
                  setNotes("");
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCheckOut}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Check-out</Text>
                )}
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
  content: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#3B82F6",
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  statusCardInactive: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusTime: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  workingTime: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  workingTimeLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  workingTimeValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#EF4444",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkInButton: {
    backgroundColor: "#10B981",
  },
  checkOutButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recordTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  recordHours: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: 4,
  },
  recordLocation: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  projectScroll: {
    marginTop: 8,
  },
  projectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  projectChipActive: {
    backgroundColor: "#3B82F6",
  },
  projectChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  projectChipTextActive: {
    color: "#FFFFFF",
  },
  checkInInfo: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  checkInInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  checkInInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  checkInInfoLocation: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  confirmButton: {
    backgroundColor: "#3B82F6",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
