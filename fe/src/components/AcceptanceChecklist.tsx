import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { AcceptanceStage, CreateAcceptanceStageData } from "@/api/acceptanceApi";
import { Ionicons } from "@expo/vector-icons";
import { FileUploader } from "@/components";
import { acceptanceApi } from "@/api/acceptanceApi";
import { PermissionGuard } from "@/components/PermissionGuard";
import api from "@/api/api";

interface AcceptanceChecklistProps {
  stages: AcceptanceStage[];
  onApprove?: (stageId: number, approvalType: string) => void;
  canApprove?: boolean;
  projectId?: string | number;
  isProjectManager?: boolean;
  onRefresh?: () => void;
  onNavigateToDefects?: () => void;
}

export default function AcceptanceChecklist({
  stages,
  onApprove,
  canApprove = false,
  projectId,
  isProjectManager = false,
  onRefresh,
  onNavigateToDefects,
}: AcceptanceChecklistProps) {
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState<AcceptanceStage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateAcceptanceStageData>({
    name: "",
    description: "",
    order: undefined,
  });

  const handleUploadComplete = async (files: any[]) => {
    if (!selectedStageId || !projectId || files.length === 0) return;

    try {
      setUploading(true);
      const attachmentIds = files
        .map((f) => f.attachment_id || f.id)
        .filter((id) => id);

      if (attachmentIds.length > 0) {
        await acceptanceApi.attachFiles(projectId, selectedStageId, attachmentIds);
        Alert.alert("Thành công", "Đã đính kèm hình ảnh nghiệm thu");
        setUploadModalVisible(false);
        setSelectedStageId(null);
        onRefresh?.();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể đính kèm file");
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = (stageId: number) => {
    setSelectedStageId(stageId);
    setUploadModalVisible(true);
  };

  const openCreateModal = () => {
    setFormData({ name: "", description: "", order: undefined });
    setCreateModalVisible(true);
  };

  const openEditModal = (stage: AcceptanceStage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      description: stage.description || "",
      order: stage.order,
    });
    setEditModalVisible(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên giai đoạn nghiệm thu");
      return;
    }

    if (!projectId) return;

    try {
      setSaving(true);
      await acceptanceApi.createStage(projectId, formData);
      Alert.alert("Thành công", "Đã tạo giai đoạn nghiệm thu mới");
      setCreateModalVisible(false);
      setFormData({ name: "", description: "", order: undefined });
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo giai đoạn nghiệm thu");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên giai đoạn nghiệm thu");
      return;
    }

    if (!projectId || !editingStage) return;

    try {
      setSaving(true);
      await acceptanceApi.updateStage(projectId, editingStage.id, formData);
      Alert.alert("Thành công", "Đã cập nhật giai đoạn nghiệm thu");
      setEditModalVisible(false);
      setEditingStage(null);
      setFormData({ name: "", description: "", order: undefined });
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật giai đoạn nghiệm thu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stage: AcceptanceStage) => {
    if (!projectId) return;

    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa giai đoạn "${stage.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await acceptanceApi.deleteStage(projectId, stage.id);
              Alert.alert("Thành công", "Đã xóa giai đoạn nghiệm thu");
              onRefresh?.();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa giai đoạn nghiệm thu");
            }
          },
        },
      ]
    );
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "owner_approved":
        return { name: "checkmark-circle", color: "#10B981" };
      case "design_approved":
        return { name: "checkmark-circle", color: "#3B82F6" };
      case "customer_approved":
        return { name: "checkmark-circle", color: "#8B5CF6" };
      case "internal_approved":
        return { name: "checkmark-circle", color: "#F59E0B" };
      case "rejected":
        return { name: "close-circle", color: "#EF4444" };
      default:
        return { name: "ellipse-outline", color: "#9CA3AF" };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ duyệt";
      case "internal_approved":
        return "Đã duyệt nội bộ";
      case "customer_approved":
        return "Đã duyệt khách hàng";
      case "design_approved":
        return "Đã duyệt thiết kế";
      case "owner_approved":
        return "Đã duyệt chủ nhà";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const getNextApprovalType = (status: string): string | null => {
    switch (status) {
      case "pending":
        return "internal";
      case "internal_approved":
        return "customer";
      case "customer_approved":
        return "design";
      case "design_approved":
        return "owner";
      default:
        return null;
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header với nút thêm mới */}
        {projectId && (
          <View style={styles.headerActions}>
            <PermissionGuard permission="acceptance.create">
              <TouchableOpacity
                style={styles.addButton}
                onPress={openCreateModal}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Thêm giai đoạn</Text>
              </TouchableOpacity>
            </PermissionGuard>
            {stages.length === 0 && (
              <PermissionGuard permission="acceptance.create">
                <TouchableOpacity
                  style={styles.createDefaultButton}
                  onPress={async () => {
                    try {
                      await acceptanceApi.createDefaultStages(projectId);
                      Alert.alert("Thành công", "Đã tạo danh sách nghiệm thu mặc định");
                      onRefresh?.();
                    } catch (error: any) {
                      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
                    }
                  }}
                >
                  <Text style={styles.createDefaultButtonText}>
                    Tạo danh sách mặc định
                  </Text>
                </TouchableOpacity>
              </PermissionGuard>
            )}
          </View>
        )}

        {stages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có giai đoạn nghiệm thu</Text>
          </View>
        ) : (
          stages.map((stage) => {
            const icon = getStatusIcon(stage.status);
            const nextApproval = getNextApprovalType(stage.status);
            const hasOpenDefects = stage.defects?.some(
              (d: any) => d.status === "open" || d.status === "in_progress"
            );

            return (
              <View key={stage.id} style={styles.stageCard}>
                <View style={styles.stageHeader}>
                  <View style={styles.stageInfo}>
                    <Ionicons name={icon.name as any} size={24} color={icon.color} />
                    <View style={styles.stageText}>
                      <Text style={styles.stageName}>{stage.name}</Text>
                      <Text style={styles.stageStatus}>
                        {getStatusText(stage.status)}
                      </Text>
                    </View>
                  </View>
                  {/* Action buttons - chỉ hiện khi chưa được duyệt hoàn toàn */}
                  {stage.status !== "owner_approved" && (
                    <View style={styles.stageActions}>
                      <PermissionGuard permission="acceptance.update">
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openEditModal(stage)}
                        >
                          <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                      </PermissionGuard>
                      <PermissionGuard permission="acceptance.delete">
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDelete(stage)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </PermissionGuard>
                    </View>
                  )}
                </View>

                {stage.description && (
                  <Text style={styles.stageDescription}>{stage.description}</Text>
                )}

                {/* Defects Section */}
                {stage.defects && stage.defects.length > 0 && (
                  <View style={styles.defectsSection}>
                    <View style={styles.defectsHeader}>
                      <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                      <Text style={styles.defectsTitle}>
                        Lỗi ghi nhận ({stage.defects.length})
                      </Text>
                    </View>
                    {stage.defects.slice(0, 3).map((defect: any) => (
                      <View key={defect.id} style={styles.defectItem}>
                        <View style={styles.defectInfo}>
                          <Text style={styles.defectDescription} numberOfLines={2}>
                            {defect.description}
                          </Text>
                          <View style={styles.defectMeta}>
                            <View
                              style={[
                                styles.defectSeverityBadge,
                                {
                                  backgroundColor:
                                    defect.severity === "critical"
                                      ? "#EF444420"
                                      : defect.severity === "high"
                                        ? "#F9731620"
                                        : defect.severity === "medium"
                                          ? "#F59E0B20"
                                          : "#10B98120",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.defectSeverityText,
                                  {
                                    color:
                                      defect.severity === "critical"
                                        ? "#EF4444"
                                        : defect.severity === "high"
                                          ? "#F97316"
                                          : defect.severity === "medium"
                                            ? "#F59E0B"
                                            : "#10B981",
                                  },
                                ]}
                              >
                                {defect.severity === "critical"
                                  ? "Nghiêm trọng"
                                  : defect.severity === "high"
                                    ? "Cao"
                                    : defect.severity === "medium"
                                      ? "Trung bình"
                                      : "Thấp"}
                              </Text>
                            </View>
                            <Text style={styles.defectStatus}>
                              {defect.status === "open"
                                ? "Mở"
                                : defect.status === "in_progress"
                                  ? "Đang xử lý"
                                  : defect.status === "fixed"
                                    ? "Đã sửa"
                                    : "Đã xác nhận"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                    {stage.defects.length > 3 && (
                      <TouchableOpacity
                        style={styles.viewAllDefectsButton}
                        onPress={onNavigateToDefects}
                      >
                        <Text style={styles.viewAllDefectsText}>
                          Xem tất cả {stage.defects.length} lỗi →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {hasOpenDefects && (
                  <TouchableOpacity
                    style={styles.warningBox}
                    onPress={onNavigateToDefects}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="warning-outline" size={20} color="#EF4444" />
                    <View style={styles.warningContent}>
                      <Text style={styles.warningText}>
                        ⚠️ Còn {stage.defects?.filter((d: any) => d.status === "open" || d.status === "in_progress").length || 0} lỗi chưa được khắc phục. Vui lòng khắc phục tất cả lỗi trước khi nghiệm thu.
                      </Text>
                      <Text style={styles.warningLink}>
                        Xem chi tiết lỗi →
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {nextApproval && canApprove && !hasOpenDefects && (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => onApprove?.(stage.id, nextApproval)}
                  >
                    <Text style={styles.approveButtonText}>
                      Duyệt {nextApproval === "internal"
                        ? "nội bộ"
                        : nextApproval === "customer"
                          ? "khách hàng"
                          : nextApproval === "design"
                            ? "thiết kế"
                            : "chủ nhà"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Attachments Section */}
                <View style={styles.attachmentsSection}>
                  <View style={styles.attachmentsHeader}>
                    <Ionicons name="images-outline" size={16} color="#3B82F6" />
                    <Text style={styles.attachmentsTitle}>
                      Hình ảnh nghiệm thu ({stage.attachments?.length || 0})
                    </Text>
                  </View>

                  {isProjectManager && stage.status === "pending" && (
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => openUploadModal(stage.id)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                      <Text style={styles.uploadButtonText}>Thêm hình ảnh</Text>
                    </TouchableOpacity>
                  )}

                  {stage.attachments && stage.attachments.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.imagesContainer}
                    >
                      {stage.attachments.map((attachment: any, index: number) => (
                        <View key={index} style={styles.imageWrapper}>
                          <Image
                            source={{ uri: attachment.file_url }}
                            style={styles.attachmentImage}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Workflow Steps */}
                <View style={styles.workflowSection}>
                  <Text style={styles.workflowTitle}>Quy trình duyệt:</Text>
                  <View style={styles.workflowSteps}>
                    <View
                      style={[
                        styles.workflowStep,
                        stage.status !== "pending" && styles.workflowStepCompleted,
                      ]}
                    >
                      <Ionicons
                        name={
                          stage.status !== "pending"
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={16}
                        color={stage.status !== "pending" ? "#10B981" : "#9CA3AF"}
                      />
                      <Text
                        style={[
                          styles.workflowStepText,
                          stage.status !== "pending" && styles.workflowStepTextCompleted,
                        ]}
                      >
                        Quản lý dự án
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.workflowStep,
                        ["internal_approved", "customer_approved", "design_approved", "owner_approved"].includes(
                          stage.status
                        ) && styles.workflowStepCompleted,
                      ]}
                    >
                      <Ionicons
                        name={
                          ["internal_approved", "customer_approved", "design_approved", "owner_approved"].includes(
                            stage.status
                          )
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={16}
                        color={
                          ["internal_approved", "customer_approved", "design_approved", "owner_approved"].includes(
                            stage.status
                          )
                            ? "#10B981"
                            : "#9CA3AF"
                        }
                      />
                      <Text
                        style={[
                          styles.workflowStepText,
                          ["internal_approved", "customer_approved", "design_approved", "owner_approved"].includes(
                            stage.status
                          ) && styles.workflowStepTextCompleted,
                        ]}
                      >
                        Giám sát nội bộ
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.workflowStep,
                        ["customer_approved", "design_approved", "owner_approved"].includes(
                          stage.status
                        ) && styles.workflowStepCompleted,
                      ]}
                    >
                      <Ionicons
                        name={
                          ["customer_approved", "design_approved", "owner_approved"].includes(
                            stage.status
                          )
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={16}
                        color={
                          ["customer_approved", "design_approved", "owner_approved"].includes(
                            stage.status
                          )
                            ? "#10B981"
                            : "#9CA3AF"
                        }
                      />
                      <Text
                        style={[
                          styles.workflowStepText,
                          ["customer_approved", "design_approved", "owner_approved"].includes(
                            stage.status
                          ) && styles.workflowStepTextCompleted,
                        ]}
                      >
                        Giám sát chủ nhà/thiết kế
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.workflowStep,
                        stage.status === "owner_approved" && styles.workflowStepCompleted,
                      ]}
                    >
                      <Ionicons
                        name={
                          stage.status === "owner_approved"
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={16}
                        color={
                          stage.status === "owner_approved" ? "#10B981" : "#9CA3AF"
                        }
                      />
                      <Text
                        style={[
                          styles.workflowStepText,
                          stage.status === "owner_approved" &&
                          styles.workflowStepTextCompleted,
                        ]}
                      >
                        Chủ nhà xác nhận
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload hình ảnh nghiệm thu</Text>
              <TouchableOpacity
                onPress={() => setUploadModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <FileUploader
                onUploadComplete={handleUploadComplete}
                multiple={true}
                accept="image"
                maxFiles={10}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Stage Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm giai đoạn nghiệm thu</Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tên giai đoạn <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên giai đoạn nghiệm thu"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập mô tả (tùy chọn)"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Thứ tự</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tự động (để trống)"
                  value={formData.order?.toString() || ""}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      order: text ? parseInt(text) : undefined,
                    })
                  }
                  keyboardType="numeric"
                />
                <Text style={styles.helperText}>
                  Để trống để tự động thêm vào cuối danh sách
                </Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setCreateModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Tạo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Stage Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa giai đoạn nghiệm thu</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tên giai đoạn <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên giai đoạn nghiệm thu"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập mô tả (tùy chọn)"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Thứ tự</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Thứ tự"
                  value={formData.order?.toString() || ""}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      order: text ? parseInt(text) : undefined,
                    })
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Cập nhật</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  stageActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 6,
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
  required: {
    color: "#EF4444",
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
    height: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
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
  cancelButtonText: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  stageCard: {
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
  stageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stageText: {
    marginLeft: 12,
    flex: 1,
  },
  stageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  stageStatus: {
    fontSize: 14,
    color: "#6B7280",
  },
  stageDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningContent: {
    flex: 1,
  },
  warningText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    marginBottom: 4,
  },
  warningLink: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
    marginTop: 4,
  },
  defectsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  defectsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  defectsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  defectItem: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  defectInfo: {
    flex: 1,
  },
  defectDescription: {
    fontSize: 13,
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 18,
  },
  defectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  defectSeverityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defectSeverityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  defectStatus: {
    fontSize: 11,
    color: "#6B7280",
  },
  viewAllDefectsButton: {
    padding: 8,
    alignItems: "center",
    marginTop: 8,
  },
  viewAllDefectsText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
  },
  approveButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  attachmentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  uploadButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  imagesContainer: {
    marginTop: 8,
  },
  imageWrapper: {
    marginRight: 12,
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  workflowSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  workflowSteps: {
    gap: 8,
  },
  workflowStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  workflowStepCompleted: {
    opacity: 1,
  },
  workflowStepText: {
    fontSize: 13,
    color: "#6B7280",
  },
  workflowStepTextCompleted: {
    color: "#10B981",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
  },
  createDefaultButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  createDefaultButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
});
