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
import { defectApi, Defect } from "@/api/defectApi";
import { DefectItem } from "@/components";
import { Ionicons } from "@expo/vector-icons";

export default function DefectsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    acceptance_stage_id: "",
  });

  useEffect(() => {
    loadDefects();
  }, [id]);

  const loadDefects = async () => {
    try {
      setLoading(true);
      const response = await defectApi.getDefects(id!);
      if (response.success) {
        setDefects(response.data || []);
      }
    } catch (error) {
      console.error("Error loading defects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.description) {
      Alert.alert("Lỗi", "Vui lòng nhập mô tả lỗi");
      return;
    }

    try {
      const response = await defectApi.createDefect(id!, {
        description: formData.description,
        severity: formData.severity,
        acceptance_stage_id: formData.acceptance_stage_id
          ? parseInt(formData.acceptance_stage_id)
          : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Lỗi đã được ghi nhận.");
        setModalVisible(false);
        setFormData({
          description: "",
          severity: "medium",
          acceptance_stage_id: "",
        });
        loadDefects();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleUpdate = async (defectId: number, status: string) => {
    try {
      const response = await defectApi.updateDefect(id!, defectId, { status });
      if (response.success) {
        Alert.alert("Thành công", "Trạng thái lỗi đã được cập nhật.");
        loadDefects();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

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
        <Text style={styles.headerTitle}>Lỗi Ghi Nhận</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={defects}
        renderItem={({ item }) => (
          <DefectItem
            defect={item}
            onUpdate={handleUpdate}
            canEdit={true}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không có lỗi nào</Text>
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
            <Text style={styles.modalTitle}>Ghi Nhận Lỗi</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả lỗi</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Nhập mô tả chi tiết về lỗi..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mức độ nghiêm trọng</Text>
              <View style={styles.severityButtons}>
                {(["low", "medium", "high", "critical"] as const).map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.severityButton,
                      formData.severity === severity && styles.severityButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, severity })
                    }
                  >
                    <Text
                      style={[
                        styles.severityButtonText,
                        formData.severity === severity &&
                        styles.severityButtonTextActive,
                      ]}
                    >
                      {severity === "low"
                        ? "Thấp"
                        : severity === "medium"
                          ? "Trung bình"
                          : severity === "high"
                            ? "Cao"
                            : "Nghiêm trọng"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
                <Text style={styles.submitButtonText}>Gửi</Text>
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
  severityButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  severityButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  severityButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  severityButtonTextActive: {
    color: "#FFFFFF",
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
