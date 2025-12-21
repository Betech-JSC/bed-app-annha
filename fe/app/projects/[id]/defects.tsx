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
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { defectApi, Defect } from "@/api/defectApi";
import { DefectItem, FileUploader } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import { acceptanceApi } from "@/api/acceptanceApi";

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
    before_image_ids: [] as number[],
  });
  const [stages, setStages] = useState<any[]>([]);
  const [fixModalVisible, setFixModalVisible] = useState(false);
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [afterImageIds, setAfterImageIds] = useState<number[]>([]);

  useEffect(() => {
    loadDefects();
    loadStages();
  }, [id]);

  const loadStages = async () => {
    try {
      const response = await acceptanceApi.getStages(id!);
      if (response.success) {
        setStages(response.data || []);
      }
    } catch (error) {
      console.error("Error loading stages:", error);
    }
  };

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
        before_image_ids: formData.before_image_ids.length > 0 ? formData.before_image_ids : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Lỗi đã được ghi nhận.");
        setModalVisible(false);
        setFormData({
          description: "",
          severity: "medium",
          acceptance_stage_id: "",
          before_image_ids: [],
        });
        loadDefects();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleBeforeImagesUpload = (files: any[]) => {
    const attachmentIds = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setFormData({ ...formData, before_image_ids: attachmentIds });
  };

  const handleAfterImagesUpload = (files: any[]) => {
    const attachmentIds = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setAfterImageIds(attachmentIds);
  };

  const handleFixDefect = async () => {
    if (!selectedDefectId) return;

    try {
      const response = await defectApi.updateDefect(id!, selectedDefectId, {
        status: "fixed",
        after_image_ids: afterImageIds.length > 0 ? afterImageIds : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Lỗi đã được đánh dấu là đã sửa.");
        setFixModalVisible(false);
        setSelectedDefectId(null);
        setAfterImageIds([]);
        loadDefects();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleUpdate = async (defectId: number, status: string) => {
    if (status === "fixed") {
      // Open modal to upload after images
      setSelectedDefectId(defectId);
      setFixModalVisible(true);
      return;
    }

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
            onPress={() => {
              if (item.acceptance_stage_id) {
                router.push(`/projects/${id}/acceptance`);
              }
            }}
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
              <Text style={styles.label}>Giai đoạn nghiệm thu (tùy chọn)</Text>
              <ScrollView style={styles.stageSelect} nestedScrollEnabled>
                {stages.map((stage) => (
                  <TouchableOpacity
                    key={stage.id}
                    style={[
                      styles.stageOption,
                      formData.acceptance_stage_id === stage.id.toString() &&
                        styles.stageOptionActive,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        acceptance_stage_id:
                          formData.acceptance_stage_id === stage.id.toString()
                            ? ""
                            : stage.id.toString(),
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.stageOptionText,
                        formData.acceptance_stage_id === stage.id.toString() &&
                          styles.stageOptionTextActive,
                      ]}
                    >
                      {stage.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hình ảnh lỗi (Trước khi khắc phục)</Text>
              <FileUploader
                onUploadComplete={handleBeforeImagesUpload}
                multiple={true}
                accept="image"
                maxFiles={10}
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
                <Text style={styles.submitButtonText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fix Defect Modal - Upload After Images */}
      <Modal
        visible={fixModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setFixModalVisible(false);
          setSelectedDefectId(null);
          setAfterImageIds([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload hình ảnh sau khi khắc phục</Text>
              <TouchableOpacity
                onPress={() => {
                  setFixModalVisible(false);
                  setSelectedDefectId(null);
                  setAfterImageIds([]);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Vui lòng upload hình ảnh sau khi đã khắc phục lỗi
                </Text>
                <FileUploader
                  onUploadComplete={handleAfterImagesUpload}
                  multiple={true}
                  accept="image"
                  maxFiles={10}
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setFixModalVisible(false);
                    setSelectedDefectId(null);
                    setAfterImageIds([]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleFixDefect}
                >
                  <Text style={styles.submitButtonText}>Đánh dấu đã sửa</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  stageSelect: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 8,
  },
  stageOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stageOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  stageOptionText: {
    fontSize: 14,
    color: "#1F2937",
  },
  stageOptionTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
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
