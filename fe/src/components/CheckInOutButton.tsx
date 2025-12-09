import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { timeTrackingApi } from "@/api/timeTrackingApi";

interface CheckInOutButtonProps {
  hasOpenCheckIn: boolean;
  openTrackingId?: number | null;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
}

export default function CheckInOutButton({
  hasOpenCheckIn,
  openTrackingId,
  onCheckIn,
  onCheckOut,
}: CheckInOutButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [location, setLocation] = useState("");

  const handleCheckIn = async () => {
    try {
      const response = await timeTrackingApi.checkIn({
        check_in_location: location || undefined,
      });
      if (response.success) {
        Alert.alert("Thành công", "Đã check-in");
        setModalVisible(false);
        setLocation("");
        onCheckIn?.();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể check-in");
    }
  };

  const handleCheckOut = async () => {
    if (!openTrackingId) return;

    try {
      const response = await timeTrackingApi.checkOut(openTrackingId, {
        check_out_location: location || undefined,
      });
      if (response.success) {
        Alert.alert("Thành công", "Đã check-out");
        setModalVisible(false);
        setLocation("");
        onCheckOut?.();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể check-out");
    }
  };

  return (
    <>
      {!hasOpenCheckIn ? (
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="time-outline" size={24} color="#FFFFFF" />
          <Text style={styles.buttonText}>Check-in</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.checkOutButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="time" size={24} color="#FFFFFF" />
          <Text style={styles.buttonText}>Check-out</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {hasOpenCheckIn ? "Check-out" : "Check-in"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập địa điểm (tùy chọn)"
              value={location}
              onChangeText={setLocation}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setLocation("");
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={hasOpenCheckIn ? handleCheckOut : handleCheckIn}
              >
                <Text style={styles.modalButtonText}>
                  {hasOpenCheckIn ? "Check-out" : "Check-in"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  checkInButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
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
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
    backgroundColor: "#3B82F6",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
