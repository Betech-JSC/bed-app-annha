import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { constructionLogApi, ConstructionLog } from "@/api/constructionLogApi";
import { Ionicons } from "@expo/vector-icons";

export default function ConstructionLogsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [logs, setLogs] = useState<ConstructionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    log_date: new Date().toISOString().split("T")[0],
    weather: "",
    personnel_count: "",
    completion_percentage: "",
    notes: "",
  });

  useEffect(() => {
    loadLogs();
  }, [id]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await constructionLogApi.getLogs(id!);
      if (response.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.log_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày");
      return;
    }

    try {
      const response = await constructionLogApi.createLog(id!, {
        log_date: formData.log_date,
        weather: formData.weather || undefined,
        personnel_count: formData.personnel_count
          ? parseInt(formData.personnel_count)
          : undefined,
        completion_percentage: formData.completion_percentage
          ? parseFloat(formData.completion_percentage)
          : undefined,
        notes: formData.notes || undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Nhật ký đã được tạo.");
        setModalVisible(false);
        setFormData({
          log_date: new Date().toISOString().split("T")[0],
          weather: "",
          personnel_count: "",
          completion_percentage: "",
          notes: "",
        });
        loadLogs();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const renderLogItem = ({ item }: { item: ConstructionLog }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>
          {new Date(item.log_date).toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
        {item.completion_percentage > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {item.completion_percentage}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.logDetails}>
        {item.weather && (
          <View style={styles.detailRow}>
            <Ionicons name="partly-sunny-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.weather}</Text>
          </View>
        )}
        {item.personnel_count && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {item.personnel_count} người
            </Text>
          </View>
        )}
      </View>

      {item.notes && (
        <Text style={styles.notes}>{item.notes}</Text>
      )}

      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentsRow}>
          <Ionicons name="images-outline" size={16} color="#3B82F6" />
          <Text style={styles.attachmentsText}>
            {item.attachments.length} hình ảnh
          </Text>
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhật Ký Công Trình</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhật ký nào</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Nhật Ký</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày</Text>
              <TextInput
                style={styles.input}
                value={formData.log_date}
                onChangeText={(text) =>
                  setFormData({ ...formData, log_date: text })
                }
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Thời tiết</Text>
              <TextInput
                style={styles.input}
                value={formData.weather}
                onChangeText={(text) =>
                  setFormData({ ...formData, weather: text })
                }
                placeholder="Ví dụ: Nắng, Mưa..."
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Số nhân sự</Text>
                <TextInput
                  style={styles.input}
                  value={formData.personnel_count}
                  onChangeText={(text) =>
                    setFormData({ ...formData, personnel_count: text })
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>% Hoàn thành</Text>
                <TextInput
                  style={styles.input}
                  value={formData.completion_percentage}
                  onChangeText={(text) =>
                    setFormData({ ...formData, completion_percentage: text })
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData({ ...formData, notes: text })
                }
                placeholder="Nhập ghi chú..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Lưu</Text>
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
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  logCard: {
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
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressBadge: {
    backgroundColor: "#3B82F620",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  logDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  notes: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
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
    height: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
