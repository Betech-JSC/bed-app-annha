import React, { useState, useEffect, useMemo } from "react";
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
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { defectApi, Defect } from "@/api/defectApi";
import { acceptanceApi, AcceptanceTemplate } from "@/api/acceptanceApi";
import { DefectItem, UniversalFileUploader, ScreenHeader, DatePickerInput, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ganttApi } from "@/api/ganttApi";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function DefectsScreen() {
  const router = useRouter();
  const { id, acceptance_stage_id } = useLocalSearchParams<{ id: string; acceptance_stage_id?: string }>();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const { hasPermission } = useProjectPermissions(id || null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [acceptanceStage, setAcceptanceStage] = useState<any>(null);
  const [formData, setFormData] = useState({
    description: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    task_id: "",
    acceptance_stage_id: acceptance_stage_id ? parseInt(acceptance_stage_id) : undefined,
    before_image_ids: [] as number[],
    defect_type: "standard_violation" as "standard_violation" | "other",
    acceptance_template_id: undefined as number | undefined,
    violated_criteria_ids: [] as number[],
  });
  const [beforeImages, setBeforeImages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<AcceptanceTemplate[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // In progress modal
  const [inProgressModalVisible, setInProgressModalVisible] = useState(false);
  const [selectedDefectForProgress, setSelectedDefectForProgress] = useState<Defect | null>(null);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<Date | null>(null);

  // Fix modal
  const [fixModalVisible, setFixModalVisible] = useState(false);
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);
  const [afterImageIds, setAfterImageIds] = useState<number[]>([]);
  const [afterImages, setAfterImages] = useState<any[]>([]);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [showStandardsModal, setShowStandardsModal] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  const canVerify = hasPermission(Permissions.DEFECT_VERIFY);

  // Filter tabs state
  const [filterVerification, setFilterVerification] = useState<"all" | "unverified" | "verified">("all");

  // Computed filtered defects
  const filteredDefects = useMemo(() => {
    switch (filterVerification) {
      case "verified":
        return defects.filter(d => d.status === "verified");
      case "unverified":
        return defects.filter(d => d.status !== "verified");
      default:
        return defects;
    }
  }, [defects, filterVerification]);

  // Counts for tab badges
  const verifiedCount = useMemo(() => defects.filter(d => d.status === "verified").length, [defects]);
  const unverifiedCount = useMemo(() => defects.filter(d => d.status !== "verified").length, [defects]);

  useEffect(() => {
    loadDefects();
    loadTasks();
    loadTemplates();
    if (acceptance_stage_id) {
      loadAcceptanceStage();
    }
  }, [id, acceptance_stage_id]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        loadDefects();
      }
    }, [id])
  );

  const loadAcceptanceStage = async () => {
    if (!acceptance_stage_id || !id) return;
    try {
      const response = await acceptanceApi.getStage(id, acceptance_stage_id);
      if (response.success) {
        setAcceptanceStage(response.data);
        // Auto-set task_id from acceptance stage if available
        if (response.data.task_id && !formData.task_id) {
          setFormData(prev => ({ ...prev, task_id: response.data.task_id.toString() }));
        }
      }
    } catch (error) {
      console.error("Error loading acceptance stage:", error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await acceptanceApi.getTemplates(false);
      if (response.success) {
        setTemplates(response.data || []);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

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
      setPermissionDenied(false);
      setPermissionMessage("");
      // BUSINESS RULE: Filter by acceptance_stage_id if provided
      const params: any = {};
      if (acceptance_stage_id) {
        params.acceptance_stage_id = parseInt(acceptance_stage_id);
      }
      const response = await defectApi.getDefects(id!, params);
      if (response.success) {
        setDefects(response.data || []);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem danh sách lỗi của dự án này.");
      } else {
        console.error("Error loading defects:", error);
      }
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
        acceptance_stage_id: formData.acceptance_stage_id,
        before_image_ids: formData.before_image_ids.length > 0 ? formData.before_image_ids : undefined,
        defect_type: formData.defect_type,
        acceptance_template_id: formData.acceptance_template_id,
        violated_criteria_ids: formData.violated_criteria_ids.length > 0 ? formData.violated_criteria_ids : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Lỗi đã được ghi nhận.");
        setModalVisible(false);
        setFormData({
          description: "",
          severity: "medium",
          task_id: acceptanceStage?.task_id?.toString() || "",
          acceptance_stage_id: acceptanceStage ? acceptanceStage.id : undefined,
          before_image_ids: [],
          defect_type: "standard_violation",
          acceptance_template_id: undefined,
          violated_criteria_ids: [],
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

  const handleReject = async () => {
    if (!selectedDefectId) return;

    if (!rejectionReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const response = await defectApi.updateDefect(id!, selectedDefectId, {
        status: "in_progress",
        rejection_reason: rejectionReason,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã từ chối kết quả xử lý.");
        setRejectModalVisible(false);
        setSelectedDefectId(null);
        setRejectionReason("");
        setDetailModalVisible(false);
        loadDefects();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleUpdate = async (defectId: number, status: string) => {
    const defect = defects.find(d => d.id === defectId);
    if (!defect) return;

    if (status === "in_progress" && defect.status !== "fixed" && defect.status !== "verified") {
      // Normal start progress
      setSelectedDefectForProgress(defect);
      setInProgressModalVisible(true);
      return;
    }

    if (status === "fixed") {
      setSelectedDefectId(defectId);
      setFixModalVisible(true);
      return;
    }

    if (status === "rejected") { // Custom status for frontend trigger
      setSelectedDefectId(defectId);
      setRejectModalVisible(true);
      return;
    }

    try {
      const response = await defectApi.updateDefect(id!, defectId, { status: status as any });
      if (response.success) {
        Alert.alert("Thành công", "Trạng thái lỗi đã được cập nhật.");
        if (status === "verified") {
          setDetailModalVisible(false);
        }
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

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Lỗi Ghi Nhận" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Lỗi Ghi Nhận" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Lỗi Ghi Nhận"
        showBackButton
        rightComponent={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PermissionGuard permission={Permissions.DEFECT_CREATE} projectId={id}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={24} color="#3B82F6" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterVerification === "all" && styles.filterTabActive]}
          onPress={() => setFilterVerification("all")}
        >
          <Text style={[styles.filterTabText, filterVerification === "all" && styles.filterTabTextActive]}>
            Tất cả
          </Text>
          <View style={[styles.filterTabBadge, filterVerification === "all" && styles.filterTabBadgeActive]}>
            <Text style={[styles.filterTabBadgeText, filterVerification === "all" && styles.filterTabBadgeTextActive]}>
              {defects.length}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterVerification === "unverified" && styles.filterTabActiveWarning]}
          onPress={() => setFilterVerification("unverified")}
        >
          <Ionicons name="alert-circle-outline" size={16} color={filterVerification === "unverified" ? "#FFFFFF" : "#F59E0B"} />
          <Text style={[styles.filterTabText, filterVerification === "unverified" && styles.filterTabTextActive]}>
            Chưa xác nhận
          </Text>
          <View style={[styles.filterTabBadge, filterVerification === "unverified" && styles.filterTabBadgeActive]}>
            <Text style={[styles.filterTabBadgeText, filterVerification === "unverified" && styles.filterTabBadgeTextActive]}>
              {unverifiedCount}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterVerification === "verified" && styles.filterTabActiveSuccess]}
          onPress={() => setFilterVerification("verified")}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={filterVerification === "verified" ? "#FFFFFF" : "#10B981"} />
          <Text style={[styles.filterTabText, filterVerification === "verified" && styles.filterTabTextActive]}>
            Đã xác nhận
          </Text>
          <View style={[styles.filterTabBadge, filterVerification === "verified" && styles.filterTabBadgeActive]}>
            <Text style={[styles.filterTabBadgeText, filterVerification === "verified" && styles.filterTabBadgeTextActive]}>
              {verifiedCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredDefects}
        renderItem={({ item }) => (
          <DefectItem
            defect={item}
            onPress={() => handleDefectPress(item)}
            onUpdate={handleUpdate}
            canEdit={hasPermission(Permissions.DEFECT_UPDATE)}
            canDelete={hasPermission(Permissions.DEFECT_DELETE)}
            canVerify={hasPermission(Permissions.DEFECT_VERIFY)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {filterVerification === "verified"
                ? "Chưa có lỗi đã xác nhận"
                : filterVerification === "unverified"
                  ? "Không có lỗi chưa xác nhận"
                  : "Không có lỗi nào"}
            </Text>
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View
              style={[styles.modalContent, { maxHeight: "90%" }]}
            >
              <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.modalTitle}>Ghi Nhận Lỗi</Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setFormData({
                      description: "",
                      severity: "medium",
                      task_id: "",
                      acceptance_stage_id: acceptance_stage_id ? parseInt(acceptance_stage_id) : undefined,
                      before_image_ids: [],
                      defect_type: "standard_violation",
                      acceptance_template_id: undefined,
                      violated_criteria_ids: [],
                    });
                    setBeforeImages([]);
                    setShowTaskPicker(false);
                  }}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {/* BUSINESS RULE: Show acceptance stage info if created from Acceptance */}
                {acceptance_stage_id && acceptanceStage && (
                  <View style={styles.acceptanceStageInfo}>
                    <View style={styles.acceptanceStageHeader}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#3B82F6" />
                      <Text style={styles.acceptanceStageTitle}>Giai đoạn nghiệm thu</Text>
                    </View>
                    <Text style={styles.acceptanceStageName}>{acceptanceStage.name}</Text>
                    {acceptanceStage.task && (
                      <Text style={styles.acceptanceStageTask}>
                        Công việc: {acceptanceStage.task.name}
                      </Text>
                    )}
                    <Text style={styles.acceptanceStageHelper}>
                      Lỗi này sẽ được liên kết với giai đoạn nghiệm thu và công việc trên
                    </Text>
                  </View>
                )}

                {/* Loại lỗi */}
                <View style={[styles.formGroup, { marginTop: 10 }]}>
                  <Text style={styles.label}>Loại lỗi</Text>
                  <View style={styles.defectTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.defectTypeButton,
                        formData.defect_type === "standard_violation" &&
                        styles.defectTypeButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, defect_type: "standard_violation" })
                      }
                    >
                      <Ionicons
                        name="list-outline"
                        size={20}
                        color={
                          formData.defect_type === "standard_violation"
                            ? "#3B82F6"
                            : "#6B7280"
                        }
                      />
                      <Text
                        style={[
                          styles.defectTypeText,
                          formData.defect_type === "standard_violation" &&
                          styles.defectTypeTextActive,
                        ]}
                      >
                        Vi phạm tiêu chuẩn
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.defectTypeButton,
                        formData.defect_type === "other" &&
                        styles.defectTypeButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, defect_type: "other" })
                      }
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={20}
                        color={
                          formData.defect_type === "other" ? "#3B82F6" : "#6B7280"
                        }
                      />
                      <Text
                        style={[
                          styles.defectTypeText,
                          formData.defect_type === "other" &&
                          styles.defectTypeTextActive,
                        ]}
                      >
                        Lỗi khác
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Template Picker - Only if standard_violation */}
                {formData.defect_type === "standard_violation" && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Bộ tiêu chuẩn nghiệm thu <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.taskSelectButton}
                      onPress={() => setShowTemplatePicker(true)}
                    >
                      <Text
                        style={[
                          styles.taskSelectText,
                          !formData.acceptance_template_id &&
                          styles.placeholderText,
                        ]}
                      >
                        {formData.acceptance_template_id
                          ? templates.find(
                            (t) => t.id === formData.acceptance_template_id
                          )?.name || "Chọn tiêu chuẩn"
                          : "Chọn bộ tiêu chuẩn"}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>

                    {/* Criteria Checkboxes */}
                    {formData.acceptance_template_id && (
                      <View style={styles.criteriaContainer}>
                        <Text style={[styles.label, { marginTop: 12 }]}>
                          Tiêu chí vi phạm:
                        </Text>
                        {templates
                          .find((t) => t.id === formData.acceptance_template_id)
                          ?.criteria?.map((criterion) => (
                            <TouchableOpacity
                              key={criterion.id}
                              style={styles.criterionItem}
                              onPress={() => {
                                let ids = [
                                  ...(formData.violated_criteria_ids || []),
                                ];
                                if (ids.includes(criterion.id)) {
                                  ids = ids.filter((id) => id !== criterion.id);
                                } else {
                                  ids.push(criterion.id);
                                }
                                setFormData({
                                  ...formData,
                                  violated_criteria_ids: ids,
                                });
                              }}
                            >
                              <Ionicons
                                name={
                                  formData.violated_criteria_ids?.includes(
                                    criterion.id
                                  )
                                    ? "checkbox"
                                    : "square-outline"
                                }
                                size={24}
                                color={
                                  formData.violated_criteria_ids?.includes(
                                    criterion.id
                                  )
                                    ? "#EF4444"
                                    : "#9CA3AF"
                                }
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.criterionName}>
                                  {criterion.name}
                                </Text>
                                {criterion.is_critical && (
                                  <Text style={styles.criterionCritical}>
                                    (Bắt buộc)
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Template Picker - Inside Modal */}
                {showTemplatePicker && (
                  <View style={styles.pickerModalOverlay}>
                    <TouchableOpacity
                      style={styles.pickerModalOverlayBackdrop}
                      activeOpacity={1}
                      onPress={() => setShowTemplatePicker(false)}
                    />
                    <View
                      style={styles.pickerModalContainer}
                      onStartShouldSetResponder={() => true}
                    >
                      <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>Chọn tiêu chuẩn</Text>
                        <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                          <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.pickerList}>
                        <TouchableOpacity
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData({
                              ...formData,
                              acceptance_template_id: undefined,
                              violated_criteria_ids: [],
                            });
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
                              formData.acceptance_template_id === template.id &&
                              styles.pickerOptionActive,
                            ]}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                acceptance_template_id: template.id,
                                violated_criteria_ids: [], // Reset criteria when changing template
                              });
                              setShowTemplatePicker(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerOptionText,
                                formData.acceptance_template_id === template.id &&
                                styles.pickerOptionTextActive,
                              ]}
                            >
                              {template.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}

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
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
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

              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setFormData({
                      description: "",
                      severity: "medium",
                      task_id: "",
                      acceptance_stage_id: acceptance_stage_id ? parseInt(acceptance_stage_id) : undefined,
                      before_image_ids: [],
                      defect_type: "standard_violation",
                      acceptance_template_id: undefined,
                      violated_criteria_ids: [],
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
        </TouchableOpacity>
      </Modal>

      {/* In Progress Modal */}
      <Modal
        visible={inProgressModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInProgressModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInProgressModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View
              style={[styles.modalContent, { maxHeight: "90%" }]}
            >
              <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.modalTitle}>Bắt đầu xử lý</Text>
                <TouchableOpacity
                  onPress={() => {
                    setInProgressModalVisible(false);
                    setSelectedDefectForProgress(null);
                    setExpectedCompletionDate(null);
                  }}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <DatePickerInput
                  label="Thời gian hoàn thành dự kiến"
                  value={expectedCompletionDate}
                  onChange={setExpectedCompletionDate}
                  placeholder="Chọn ngày"
                  required
                  minimumDate={new Date()}
                  containerStyle={styles.formGroup}
                />
              </ScrollView>
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
        </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setFixModalVisible(false);
            setSelectedDefectId(null);
            setAfterImageIds([]);
            setAfterImages([]);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View
              style={[styles.modalContent, { maxHeight: "90%" }]}
            >
              <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.modalTitle}>Khắc phục lỗi</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFixModalVisible(false);
                    setSelectedDefectId(null);
                    setAfterImageIds([]);
                    setAfterImages([]);
                  }}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
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
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
        </TouchableOpacity>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDetailModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { maxHeight: "95%" }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
              <Text style={styles.modalTitle}>Chi tiết lỗi</Text>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
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

            {/* Action Buttons for Fixed Defects */}
            {selectedDefect && selectedDefect.status === 'fixed' && canVerify && (
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20), paddingTop: 10 }]}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#EF4444', marginRight: 8 }]}
                  onPress={() => handleUpdate(selectedDefect.id, 'rejected')}
                >
                  <Text style={styles.submitButtonText}>Từ chối</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#10B981', marginLeft: 8 }]}
                  onPress={() => handleUpdate(selectedDefect.id, 'verified')}
                >
                  <Text style={styles.submitButtonText}>Duyệt</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setRejectModalVisible(false);
          setSelectedDefectId(null);
          setRejectionReason("");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setRejectModalVisible(false);
            setSelectedDefectId(null);
            setRejectionReason("");
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={[styles.modalContent, { maxHeight: "90%" }]}>
              <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.modalTitle}>Từ chối kết quả</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRejectModalVisible(false);
                    setSelectedDefectId(null);
                    setRejectionReason("");
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Lý do từ chối <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    placeholder="Nhập lý do từ chối..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setRejectModalVisible(false);
                    setSelectedDefectId(null);
                    setRejectionReason("");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    { backgroundColor: '#EF4444' },
                    !rejectionReason.trim() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleReject}
                  disabled={!rejectionReason.trim()}
                >
                  <Text style={styles.submitButtonText}>Xác nhận từ chối</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
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
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                style={{ flex: 1, width: '100%' }}
              >
                <Image
                  source={{ uri: previewImage }}
                  style={[styles.previewImage, { width: '100%', height: '100%' }]}
                  resizeMode="contain"
                />
              </ScrollView>
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

      {/* Standards/Acceptance Templates Modal */}
      <AcceptanceStandardsModal
        visible={showStandardsModal}
        onClose={() => setShowStandardsModal(false)}
      />
    </View >
  );
}

function AcceptanceStandardsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await acceptanceApi.getTemplates(true);
      if (response.success) {
        setTemplates(response.data || []);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.fullScreenModal]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bộ Tiêu Chuẩn Nghiệm Thu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={styles.standardItem}>
                  <TouchableOpacity
                    style={styles.standardHeader}
                    onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.standardName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.standardDesc} numberOfLines={expandedId === item.id ? 0 : 1}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={expandedId === item.id ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>

                  {expandedId === item.id && (
                    <View style={styles.standardBody}>
                      {item.standard && (
                        <View style={styles.standardSection}>
                          <Text style={styles.standardLabel}>Tiêu chuẩn:</Text>
                          <Text style={styles.standardText}>{item.standard}</Text>
                        </View>
                      )}

                      {/* Documents */}
                      {(item.documents?.length > 0 || item.attachments?.length > 0) && (
                        <View style={styles.standardSection}>
                          <Text style={styles.standardLabel}>Tài liệu đính kèm:</Text>
                          {(item.documents || item.attachments).map((doc: any, index: number) => (
                            <TouchableOpacity key={index} style={styles.docItem}>
                              <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
                              <Text style={styles.docName}>{doc.file_name || doc.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Images */}
                      {item.images?.length > 0 && (
                        <View style={styles.standardSection}>
                          <Text style={styles.standardLabel}>Hình ảnh minh họa:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {item.images.map((img: any, index: number) => (
                              <Image
                                key={index}
                                source={{ uri: img.url }}
                                style={styles.standardImage}
                              />
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có bộ tiêu chuẩn nào</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
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
  settingsButton: {
    padding: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
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
    // flex: 1, // Removed to allow content to determine height up to maxHeight
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    position: "relative",
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
  acceptanceStageInfo: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3B82F620",
  },
  acceptanceStageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  acceptanceStageTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  acceptanceStageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  acceptanceStageTask: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  acceptanceStageHelper: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  fullScreenModal: {
    height: "100%",
    borderRadius: 0,
    marginTop: 0,
  },
  standardItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  standardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  standardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  standardDesc: {
    fontSize: 13,
    color: "#6B7280",
  },
  standardBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  standardSection: {
    marginBottom: 16,
  },
  standardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  standardText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    marginBottom: 8,
  },
  docName: {
    fontSize: 13,
    color: "#2563EB",
    flex: 1,
  },
  standardImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },
  defectTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  defectTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  defectTypeButtonActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  defectTypeText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  defectTypeTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  criteriaContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  criterionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  criterionName: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  criterionCritical: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 2,
    fontWeight: "500",
  },
  filterTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterTabActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterTabActiveWarning: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  filterTabActiveSuccess: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  filterTabBadge: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: "center",
  },
  filterTabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  filterTabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  filterTabBadgeTextActive: {
    color: "#FFFFFF",
  },
});

