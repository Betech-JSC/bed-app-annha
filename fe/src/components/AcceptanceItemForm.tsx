import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AcceptanceItem, acceptanceApi, AcceptanceTemplate } from "@/api/acceptanceApi";
import { ganttApi } from "@/api/ganttApi";
import { UniversalFileUploader } from "@/components";

interface AcceptanceItemFormProps {
  visible: boolean;
  item?: AcceptanceItem | null;
  projectId: string | number;
  onClose: () => void;
  onSubmit: (data: {
    task_id?: number;
    acceptance_template_id?: number;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    notes?: string;
    attachment_ids?: number[];
  }) => Promise<void>;
}

export default function AcceptanceItemForm({
  visible,
  item,
  projectId,
  onClose,
  onSubmit,
}: AcceptanceItemFormProps) {
  const [taskId, setTaskId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [standard, setStandard] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<AcceptanceTemplate[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadTasks();
      loadTemplates();
    }
  }, [visible, projectId]);

  useEffect(() => {
    if (item) {
      setTaskId(item.task_id?.toString() || "");
      setTemplateId(item.acceptance_template_id?.toString() || "");
      setName(item.name);
      setDescription(item.description || "");
      setStandard(item.template?.standard || "");
      setStartDate(new Date(item.start_date));
      setEndDate(new Date(item.end_date));
      setNotes(item.notes || "");
      setUploadedFiles(item.attachments || []);
      setAttachmentIds(item.attachments?.map((a: any) => a.id) || []);
    } else {
      resetForm();
    }
  }, [item, visible]);

  const loadTasks = async () => {
    try {
      const response = await ganttApi.getTasks(projectId);
      if (response.success) {
        setTasks(response.data || []);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await acceptanceApi.getTemplates(true);
      if (response.success) {
        setTemplates(response.data || []);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handleTemplateSelect = (template: AcceptanceTemplate) => {
    setTemplateId(template.id.toString());
    setName(template.name);
    setDescription(template.description || "");
    setStandard(template.standard || "");
    setShowTemplatePicker(false);
  };

  const resetForm = () => {
    setTaskId("");
    setTemplateId("");
    setName("");
    setDescription("");
    setStandard("");
    setStartDate(new Date());
    setEndDate(new Date());
    setNotes("");
    setAttachmentIds([]);
    setUploadedFiles([]);
  };

  const handleFilesUpload = (files: any[]) => {
    setUploadedFiles(files);
    const ids = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setAttachmentIds(ids);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên hạng mục");
      return;
    }

    if (endDate < startDate) {
      Alert.alert("Lỗi", "Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    try {
      setSubmitting(true);
      const data = {
        task_id: taskId ? parseInt(taskId) : undefined,
        acceptance_template_id: templateId ? parseInt(templateId) : undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        notes: notes.trim() || undefined,
        // Không gửi attachment_ids ở bước 1 - sẽ upload ở bước 2
        attachment_ids: item && attachmentIds.length > 0 ? attachmentIds : undefined,
      };

      await onSubmit(data);
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu hạng mục"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {item ? "Sửa hồ sơ nghiệm thu" : "Bước 1: Tạo hồ sơ nghiệm thu"}
              </Text>
              {!item && (
                <Text style={styles.subtitle}>
                  Chọn hạng mục thi công và bộ tài liệu nghiệm thu
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" contentContainerStyle={{ position: "relative" }}>
            {/* Hạng mục thi công */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name="construct-outline" size={16} color="#6B7280" />
                <Text style={styles.label}>Hạng mục thi công</Text>
              </View>
              <TouchableOpacity
                style={[styles.selectButton, taskId && styles.selectButtonActive]}
                onPress={() => setShowTaskPicker(!showTaskPicker)}
              >
                <Text style={[styles.selectText, !taskId && styles.placeholderText]}>
                  {taskId
                    ? tasks.find(t => t.id.toString() === taskId)?.name || "Chọn hạng mục"
                    : "Chọn hạng mục thi công"}
                </Text>
                <Ionicons name="chevron-down" size={20} color={taskId ? "#3B82F6" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            {/* Bộ tài liệu nghiệm thu */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                <Text style={styles.label}>Bộ tài liệu nghiệm thu</Text>
              </View>
              <TouchableOpacity
                style={[styles.selectButton, templateId && styles.selectButtonActive]}
                onPress={() => setShowTemplatePicker(!showTemplatePicker)}
              >
                <Text style={[styles.selectText, !templateId && styles.placeholderText]}>
                  {templateId
                    ? templates.find(t => t.id.toString() === templateId)?.name || "Chọn bộ tài liệu"
                    : "Chọn bộ tài liệu nghiệm thu"}
                </Text>
                <Ionicons name="chevron-down" size={20} color={templateId ? "#3B82F6" : "#6B7280"} />
              </TouchableOpacity>


              {/* Hiển thị thông tin template khi đã chọn */}
              {templateId && (() => {
                const selectedTemplate = templates.find(t => t.id.toString() === templateId);
                if (!selectedTemplate) return null;

                return (
                  <View style={styles.templateInfo}>
                    {/* Tên công việc */}
                    {selectedTemplate.name && (
                      <View style={styles.templateSection}>
                        <Text style={styles.templateLabel}>Tên công việc:</Text>
                        <Text style={styles.templateValue}>{selectedTemplate.name}</Text>
                      </View>
                    )}

                    {/* Mô tả */}
                    {selectedTemplate.description && (
                      <View style={styles.templateSection}>
                        <Text style={styles.templateLabel}>Mô tả:</Text>
                        <Text style={styles.templateValue}>{selectedTemplate.description}</Text>
                      </View>
                    )}

                    {/* Tiêu chuẩn cho phép */}
                    {selectedTemplate.standard && (
                      <View style={styles.templateSection}>
                        <Text style={styles.templateLabel}>Tiêu chuẩn cho phép:</Text>
                        <Text style={styles.templateValue}>{selectedTemplate.standard}</Text>
                      </View>
                    )}

                    {/* Hình ảnh mẫu */}
                    {selectedTemplate.attachments && selectedTemplate.attachments.length > 0 && (
                      <View style={styles.templateSection}>
                        <Text style={styles.templateLabel}>Hình ảnh mẫu:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sampleImagesContainer}>
                          {selectedTemplate.attachments.map((img: any) => (
                            <Image
                              key={img.id}
                              source={{ uri: img.file_url || img.url || img.path }}
                              style={styles.sampleImage}
                              resizeMode="cover"
                            />
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>

            {/* Name */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
                <Text style={styles.label}>
                  Tên công việc <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên công việc"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                <Text style={styles.label}>Mô tả</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Nhập mô tả (tùy chọn)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Start Date */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.label}>
                  Ngày bắt đầu <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {startDate.toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) {
                      setStartDate(date);
                      if (date > endDate) {
                        setEndDate(date);
                      }
                    }
                  }}
                />
              )}
            </View>

            {/* End Date */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.label}>
                  Ngày kết thúc <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  minimumDate={startDate}
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>

            {/* Notes - Ghi chú cho hồ sơ */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                <Text style={styles.label}>Ghi chú hồ sơ</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Nhập ghi chú cho hồ sơ nghiệm thu (tùy chọn)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Info Box */}
            {!item && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Sau khi tạo hồ sơ, bạn sẽ upload hình ảnh thực tế nghiệm thu ở bước tiếp theo.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Task Picker - Inside modal */}
          {showTaskPicker && (
            <>
              <TouchableOpacity
                style={styles.pickerBackdrop}
                activeOpacity={1}
                onPress={() => setShowTaskPicker(false)}
              />
              <View style={styles.pickerModalContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn hạng mục</Text>
                  <TouchableOpacity onPress={() => setShowTaskPicker(false)}>
                    <Ionicons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.pickerList}>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setTaskId("");
                      setShowTaskPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Không chọn</Text>
                  </TouchableOpacity>
                  {tasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        styles.pickerOption,
                        taskId === task.id.toString() && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        setTaskId(task.id.toString());
                        setShowTaskPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          taskId === task.id.toString() && styles.pickerOptionTextActive,
                        ]}
                      >
                        {task.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          {/* Template Picker - Inside modal */}
          {showTemplatePicker && (
            <>
              <TouchableOpacity
                style={styles.pickerBackdrop}
                activeOpacity={1}
                onPress={() => setShowTemplatePicker(false)}
              />
              <View style={styles.pickerModalContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn bộ tài liệu</Text>
                  <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                    <Ionicons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.pickerList}>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setTemplateId("");
                      setName("");
                      setDescription("");
                      setStandard("");
                      setShowTemplatePicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Không chọn</Text>
                  </TouchableOpacity>
                  {templates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.pickerOption,
                        templateId === template.id.toString() && styles.pickerOptionActive,
                      ]}
                      onPress={() => handleTemplateSelect(template)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          templateId === template.id.toString() && styles.pickerOptionTextActive,
                        ]}
                      >
                        {template.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  dateText: {
    fontSize: 14,
    color: "#1F2937",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  selectButtonActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  selectText: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  pickerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 9998,
    elevation: 9998,
  },
  pickerModalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    zIndex: 9999,
    elevation: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#1F2937",
  },
  pickerOptionTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  templateInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  templateSection: {
    marginBottom: 12,
  },
  templateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  templateValue: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  sampleImagesContainer: {
    marginTop: 8,
  },
  sampleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 18,
  },
});

