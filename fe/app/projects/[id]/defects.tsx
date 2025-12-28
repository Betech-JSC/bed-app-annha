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
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { defectApi, Defect } from "@/api/defectApi";
import { DefectItem, UniversalFileUploader, ScreenHeader } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import { ganttApi } from "@/api/ganttApi";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function DefectsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    task_id: "",
    before_image_ids: [] as number[],
  });
  const [beforeImages, setBeforeImages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // In progress modal
  const [inProgressModalVisible, setInProgressModalVisible] = useState(false);
  const [selectedDefectForProgress, setSelectedDefectForProgress] = useState<Defect | null>(null);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fix modal
  const [fixModalVisible, setFixModalVisible] = useState(false);
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [afterImageIds, setAfterImageIds] = useState<number[]>([]);
  const [afterImages, setAfterImages] = useState<any[]>([]);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadDefects();
    loadTasks();
  }, [id]);

  const loadTasks = async () => {
    try {
      const response = await ganttApi.getTasks(id!);
      if (response.success) {
        setTasks(response.data || []);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
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
        task_id: formData.task_id ? parseInt(formData.task_id) : undefined,
        before_image_ids: formData.before_image_ids.length > 0 ? formData.before_image_ids : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Lỗi đã được ghi nhận.");
        setModalVisible(false);
        setFormData({
          description: "",
          severity: "medium",
          task_id: "",
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
    setBeforeImages(files);
    const attachmentIds = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setFormData({ ...formData, before_image_ids: attachmentIds });
  };

  const handleAfterImagesUpload = (files: any[]) => {
    setAfterImages(files);
    const attachmentIds = files
      .map((f) => f.attachment_id || f.id)
      .filter((id) => id) as number[];
    setAfterImageIds(attachmentIds);
  };

  const handleStartProgress = async () => {
    if (!selectedDefectForProgress) return;

    if (!expectedCompletionDate) {
      Alert.alert("Lỗi", "Vui lòng nhập thời gian hoàn thành dự kiến");
      return;
    }

    try {
      const response = await defectApi.updateDefect(id!, selectedDefectForProgress.id, {
        status: "in_progress",
        expected_completion_date: expectedCompletionDate.toISOString().split('T')[0],
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã bắt đầu xử lý lỗi.");
        setInProgressModalVisible(false);
        setSelectedDefectForProgress(null);
        setExpectedCompletionDate(null);
        loadDefects();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleFixDefect = async () => {
    if (!selectedDefectId) return;

    if (afterImageIds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng upload hình ảnh đã sửa trước khi xác nhận hoàn thành");
      return;
    }

    try {
      const response = await defectApi.updateDefect(id!, selectedDefectId, {
        status: "fixed",
        after_image_ids: afterImageIds,
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
    const defect = defects.find(d => d.id === defectId);
    if (!defect) return;

    if (status === "in_progress") {
      setSelectedDefectForProgress(defect);
      setInProgressModalVisible(true);
      return;
    }

    if (status === "fixed") {
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

  const handleDefectPress = async (defect: Defect) => {
    try {
      const response = await defectApi.getDefect(id!, defect.id);
      if (response.success) {
        setSelectedDefect(response.data);
        setDetailModalVisible(true);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể tải chi tiết lỗi");
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Mở",
      in_progress: "Đang xử lý",
      fixed: "Đã sửa",
      verified: "Đã xác nhận",
    };
    return labels[status] || status;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: "Tạo mới",
      status_changed: "Thay đổi trạng thái",
      assigned: "Giao việc",
      updated: "Cập nhật",
      commented: "Bình luận",
    };
    return labels[action] || action;
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
      <ScreenHeader
        title="Lỗi Ghi Nhận"
        showBackButton
        rightComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={defects}
        renderItem={({ item }) => (
          <DefectItem
            defect={item}
            onPress={() => handleDefectPress(item)}
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

      {/* Create Defect Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ghi Nhận Lỗi</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setFormData({
                    description: "",
                    severity: "medium",
                    task_id: "",
                    before_image_ids: [],
                  });
                  setBeforeImages([]);
                  setShowTaskPicker(false);
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
              {/* Hạng mục thi công */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Hạng mục thi công <Text style={styles.optional}>(tùy chọn)</Text>
                </Text>
                <TouchableOpacity
                  style={styles.taskSelectButton}
                  onPress={() => setShowTaskPicker(!showTaskPicker)}
                >
                  <Text style={[styles.taskSelectText, !formData.task_id && styles.placeholderText]}>
                    {formData.task_id
                      ? tasks.find(t => t.id.toString() === formData.task_id)?.name || "Chọn hạng mục"
                      : "Chọn hạng mục thi công"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

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

              {/* Hình ảnh lỗi */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Hình ảnh lỗi (Trước khi khắc phục)
                  <Text style={styles.optional}> (tùy chọn)</Text>
                </Text>
                <UniversalFileUploader
                  onUploadComplete={handleBeforeImagesUpload}
                  multiple={true}
                  accept="image"
                  maxFiles={10}
                  initialFiles={beforeImages}
                />
              </View>
            </ScrollView>

            {/* Task Picker - Inside Modal */}
            {showTaskPicker && (
              <View style={styles.pickerModalOverlay}>
                <TouchableOpacity
                  style={styles.pickerModalOverlayBackdrop}
                  activeOpacity={1}
                  onPress={() => setShowTaskPicker(false)}
                />
                <View style={styles.pickerModalContainer} onStartShouldSetResponder={() => true}>
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
                        setFormData({ ...formData, task_id: "" });
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
                          formData.task_id === task.id.toString() && styles.pickerOptionActive,
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, task_id: task.id.toString() });
                          setShowTaskPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            formData.task_id === task.id.toString() && styles.pickerOptionTextActive,
                          ]}
                        >
                          {task.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setFormData({
                    description: "",
                    severity: "medium",
                    task_id: "",
                    before_image_ids: [],
                  });
                  setBeforeImages([]);
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
        </KeyboardAvoidingView>
      </Modal>

      {/* In Progress Modal */}
      <Modal
        visible={inProgressModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInProgressModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bắt đầu xử lý</Text>
              <TouchableOpacity
                onPress={() => {
                  setInProgressModalVisible(false);
                  setSelectedDefectForProgress(null);
                  setExpectedCompletionDate(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Thời gian hoàn thành dự kiến <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateInputText, !expectedCompletionDate && styles.placeholderText]}>
                    {expectedCompletionDate
                      ? expectedCompletionDate.toLocaleDateString('vi-VN')
                      : "Chọn ngày"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={expectedCompletionDate || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        setExpectedCompletionDate(date);
                      }
                    }}
                  />
                )}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setInProgressModalVisible(false);
                  setSelectedDefectForProgress(null);
                  setExpectedCompletionDate(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  !expectedCompletionDate && styles.submitButtonDisabled,
                ]}
                onPress={handleStartProgress}
                disabled={!expectedCompletionDate}
              >
                <Text style={styles.submitButtonText}>Bắt đầu xử lý</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fix Defect Modal */}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
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
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Hình ảnh sau khi khắc phục <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.helperText}>
                  Bắt buộc upload hình ảnh đã sửa để xác nhận hoàn thành. Bạn có thể chụp ảnh trực tiếp hoặc chọn từ thư viện.
                </Text>
                <UniversalFileUploader
                  onUploadComplete={handleAfterImagesUpload}
                  multiple={true}
                  accept="image"
                  maxFiles={10}
                  initialFiles={afterImages}
                />
                {afterImageIds.length === 0 && (
                  <Text style={styles.errorText}>
                    Vui lòng upload ít nhất một hình ảnh
                  </Text>
                )}
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
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  afterImageIds.length === 0 && styles.submitButtonDisabled,
                ]}
                onPress={handleFixDefect}
                disabled={afterImageIds.length === 0}
              >
                <Text style={styles.submitButtonText}>Xác nhận hoàn thành</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết lỗi</Text>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedDefect && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Mô tả</Text>
                    <Text style={styles.detailValue}>{selectedDefect.description}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Hạng mục thi công</Text>
                    <Text style={styles.detailValue}>
                      {selectedDefect.task?.name || "Không có"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Trạng thái</Text>
                    <Text style={styles.detailValue}>
                      {getStatusLabel(selectedDefect.status)}
                    </Text>
                  </View>

                  {selectedDefect.expected_completion_date && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Thời gian hoàn thành dự kiến</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedDefect.expected_completion_date).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  )}

                  {selectedDefect.attachments && selectedDefect.attachments.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Hình ảnh</Text>

                      {/* Ảnh trước khi sửa */}
                      {selectedDefect.attachments.filter((a: any) => a.description === 'before').length > 0 && (
                        <View style={styles.imageGroup}>
                          <Text style={styles.imageGroupLabel}>Trước khi sửa</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.imagesScrollContainer}
                          >
                            {selectedDefect.attachments
                              .filter((a: any) => a.description === 'before')
                              .map((attachment: any) => {
                                const imageUrl = attachment.file_url;
                                return (
                                  <TouchableOpacity
                                    key={attachment.id}
                                    style={styles.imageWrapper}
                                    onPress={() => setPreviewImage(imageUrl)}
                                  >
                                    <Image
                                      source={{ uri: imageUrl }}
                                      style={styles.thumbnailImage}
                                      resizeMode="cover"
                                    />
                                  </TouchableOpacity>
                                );
                              })}
                          </ScrollView>
                        </View>
                      )}

                      {/* Ảnh sau khi sửa */}
                      {selectedDefect.attachments.filter((a: any) => a.description === 'after').length > 0 && (
                        <View style={styles.imageGroup}>
                          <Text style={styles.imageGroupLabel}>Sau khi sửa</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.imagesScrollContainer}
                          >
                            {selectedDefect.attachments
                              .filter((a: any) => a.description === 'after')
                              .map((attachment: any) => {
                                const imageUrl = attachment.file_url;
                                return (
                                  <TouchableOpacity
                                    key={attachment.id}
                                    style={styles.imageWrapper}
                                    onPress={() => setPreviewImage(imageUrl)}
                                  >
                                    <Image
                                      source={{ uri: imageUrl }}
                                      style={styles.thumbnailImage}
                                      resizeMode="cover"
                                    />
                                  </TouchableOpacity>
                                );
                              })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}

                  {selectedDefect.histories && selectedDefect.histories.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Lịch sử xử lý</Text>
                      {selectedDefect.histories.map((history: any) => (
                        <View key={history.id} style={styles.historyItem}>
                          <View style={styles.historyHeader}>
                            <Text style={styles.historyAction}>
                              {getActionLabel(history.action)}
                            </Text>
                            <Text style={styles.historyDate}>
                              {new Date(history.created_at).toLocaleString('vi-VN')}
                            </Text>
                          </View>
                          {history.old_status && history.new_status && (
                            <Text style={styles.historyStatus}>
                              {getStatusLabel(history.old_status)} → {getStatusLabel(history.new_status)}
                            </Text>
                          )}
                          {history.comment && (
                            <Text style={styles.historyComment}>{history.comment}</Text>
                          )}
                          {history.user && (
                            <Text style={styles.historyUser}>
                              Bởi: {history.user.name || history.user.email}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.imagePreviewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          <View style={styles.imagePreviewContainer}>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closePreviewButton}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    position: "relative",
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
  formGroup: {
    marginBottom: 16,
    position: "relative",
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
  taskSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  taskSelectText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  pickerModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModalOverlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  pickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "90%",
    maxHeight: "70%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
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
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  dateInputText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
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
  detailSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  imagesContainer: {
    marginTop: 8,
  },
  imageGroup: {
    marginBottom: 20,
  },
  imageGroupLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  imagesScrollContainer: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 4,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 12,
  },
  thumbnailImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "90%",
    height: "90%",
  },
  closePreviewButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  historyItem: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  historyDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  historyStatus: {
    fontSize: 14,
    color: "#3B82F6",
    marginBottom: 4,
  },
  historyComment: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 4,
  },
  historyUser: {
    fontSize: 12,
    color: "#6B7280",
  },
});
