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
  const [beforeImages, setBeforeImages] = useState<any[]>([]); // Files đã upload để preview
  const [stages, setStages] = useState<any[]>([]);
  const [fixModalVisible, setFixModalVisible] = useState(false);
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [afterImageIds, setAfterImageIds] = useState<number[]>([]);
  const [afterImages, setAfterImages] = useState<any[]>([]); // Files đã upload để preview

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
        setBeforeImages([]);
        loadDefects();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleBeforeImagesUpload = (files: any[]) => {
    // Lưu cả files để preview và attachment IDs
    setBeforeImages(files);
    const attachmentIds = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setFormData({ ...formData, before_image_ids: attachmentIds });
  };

  const handleAfterImagesUpload = (files: any[]) => {
    // Lưu cả files để preview và attachment IDs
    setAfterImages(files);
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
        setAfterImages([]);
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
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ghi Nhận Lỗi</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setFormData({
                    description: "",
                    severity: "medium",
                    acceptance_stage_id: "",
                    before_image_ids: [],
                  });
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mô tả lỗi */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Mô tả lỗi <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Nhập mô tả chi tiết về lỗi..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
                {!formData.description && (
                  <Text style={styles.errorText}>
                    Vui lòng nhập mô tả lỗi
                  </Text>
                )}
              </View>

              {/* Mức độ nghiêm trọng */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mức độ nghiêm trọng</Text>
                <View style={styles.severityButtons}>
                  {(["low", "medium", "high", "critical"] as const).map((severity) => {
                    const severityConfig = {
                      low: { label: "Thấp", color: "#10B981", bg: "#10B98120" },
                      medium: { label: "Trung bình", color: "#F59E0B", bg: "#F59E0B20" },
                      high: { label: "Cao", color: "#F97316", bg: "#F9731620" },
                      critical: { label: "Nghiêm trọng", color: "#EF4444", bg: "#EF444420" },
                    };
                    const config = severityConfig[severity];
                    const isActive = formData.severity === severity;

                    return (
                      <TouchableOpacity
                        key={severity}
                        style={[
                          styles.severityButton,
                          isActive && {
                            backgroundColor: config.bg,
                            borderColor: config.color,
                            borderWidth: 2,
                          },
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, severity })
                        }
                      >
                        <View
                          style={[
                            styles.severityDot,
                            { backgroundColor: config.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.severityButtonText,
                            isActive && { color: config.color, fontWeight: "700" },
                          ]}
                        >
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Giai đoạn nghiệm thu */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Giai đoạn nghiệm thu <Text style={styles.optional}>(tùy chọn)</Text>
                </Text>
                {stages.length === 0 ? (
                  <View style={styles.emptyStages}>
                    <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                    <Text style={styles.emptyStagesText}>
                      Chưa có giai đoạn nghiệm thu
                    </Text>
                  </View>
                ) : (
                  <View style={styles.stageSelect}>
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      style={styles.stageSelectScroll}
                    >
                      {stages.map((stage) => {
                        const isSelected =
                          formData.acceptance_stage_id === stage.id.toString();
                        return (
                          <TouchableOpacity
                            key={stage.id}
                            style={[
                              styles.stageOption,
                              isSelected && styles.stageOptionActive,
                            ]}
                            onPress={() =>
                              setFormData({
                                ...formData,
                                acceptance_stage_id: isSelected
                                  ? ""
                                  : stage.id.toString(),
                              })
                            }
                          >
                            <View style={styles.stageOptionContent}>
                              <Ionicons
                                name={
                                  isSelected
                                    ? "checkmark-circle"
                                    : "ellipse-outline"
                                }
                                size={20}
                                color={isSelected ? "#3B82F6" : "#9CA3AF"}
                              />
                              <Text
                                style={[
                                  styles.stageOptionText,
                                  isSelected && styles.stageOptionTextActive,
                                ]}
                              >
                                {stage.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Hình ảnh lỗi */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Hình ảnh lỗi (Trước khi khắc phục)
                  <Text style={styles.optional}> (tùy chọn)</Text>
                </Text>
                <Text style={styles.helperText}>
                  Bạn có thể chụp ảnh trực tiếp hoặc chọn từ thư viện
                </Text>
                <FileUploader
                  onUploadComplete={handleBeforeImagesUpload}
                  multiple={true}
                  accept="image"
                  maxFiles={10}
                  initialFiles={beforeImages}
                />
              </View>
            </ScrollView>

            {/* Footer buttons - sticky */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setFormData({
                    description: "",
                    severity: "medium",
                    acceptance_stage_id: "",
                    before_image_ids: [],
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  !formData.description && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!formData.description}
              >
                <Text style={styles.submitButtonText}>Ghi nhận lỗi</Text>
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
          setAfterImages([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Khắc phục lỗi</Text>
              <TouchableOpacity
                onPress={() => {
                  setFixModalVisible(false);
                  setSelectedDefectId(null);
                  setAfterImageIds([]);
                  setAfterImages([]);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Hình ảnh sau khi khắc phục
                  <Text style={styles.optional}> (tùy chọn)</Text>
                </Text>
                <Text style={styles.helperText}>
                  Vui lòng upload hình ảnh sau khi đã khắc phục lỗi để làm bằng chứng. Bạn có thể chụp ảnh trực tiếp hoặc chọn từ thư viện.
                </Text>
                <FileUploader
                  onUploadComplete={handleAfterImagesUpload}
                  multiple={true}
                  accept="image"
                  maxFiles={10}
                  initialFiles={afterImages}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setFixModalVisible(false);
                  setSelectedDefectId(null);
                  setAfterImageIds([]);
                  setAfterImages([]);
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
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
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
    marginLeft: 12,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  stageSelect: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  stageSelectScroll: {
    maxHeight: 150,
  },
  stageOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  stageOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  stageOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stageOptionText: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  stageOptionTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  emptyStages: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyStagesText: {
    fontSize: 14,
    color: "#6B7280",
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
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 18,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    minWidth: 100,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  required: {
    color: "#EF4444",
  },
  optional: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6B7280",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
