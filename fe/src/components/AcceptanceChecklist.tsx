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
import { acceptanceApi } from "@/api/acceptanceApi";
import { PermissionGuard } from "@/components/PermissionGuard";
import AcceptanceItemList from "@/components/AcceptanceItemList";
import api from "@/api/api";

interface AcceptanceChecklistProps {
  stages: AcceptanceStage[];
  projectId?: string | number;
  isProjectManager?: boolean;
  isCustomer?: boolean;
  onRefresh?: () => void;
  onNavigateToDefects?: () => void;
}

export default function AcceptanceChecklist({
  stages,
  projectId,
  isProjectManager = false,
  isCustomer = false,
  onRefresh,
  onNavigateToDefects,
}: AcceptanceChecklistProps) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState<AcceptanceStage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateAcceptanceStageData>({
    name: "",
    description: "",
    order: undefined,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
          </View>
        )}

        {stages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có giai đoạn nghiệm thu</Text>
            <Text style={styles.emptySubtext}>Nhấn nút "Thêm giai đoạn" để bắt đầu</Text>
          </View>
        ) : (
          stages.map((stage) => {
            const icon = getStatusIcon(stage.status);
            const hasOpenDefects = stage.defects?.some(
              (d: any) => d.status === "open" || d.status === "in_progress"
            );

            // Tính completion dựa trên acceptance_status thực tế: approved = hoàn thành
            const totalItems = stage.items?.length || 0;
            const approvedItems = stage.items?.filter((i: any) =>
              i.acceptance_status === 'approved'
            ).length || 0;
            const completionPercentage = totalItems > 0 ? (approvedItems / totalItems) * 100 : 0;

            return (
              <View key={stage.id} style={styles.stageCard}>
                {/* Stage Header - Gọn gàng hơn */}
                <View style={styles.stageHeader}>
                  <View style={styles.stageInfo}>
                    <View style={[styles.statusIconContainer, { backgroundColor: icon.color + '20' }]}>
                      <Ionicons name={icon.name as any} size={20} color={icon.color} />
                    </View>
                    <View style={styles.stageText}>
                      <Text style={styles.stageName}>{stage.name}</Text>
                      {/* Gộp progress và items count vào một dòng */}
                      {totalItems > 0 && (
                        <View style={styles.stageMeta}>
                          <View style={styles.progressInfoInline}>
                            <Text style={styles.progressLabelInline}>Tiến độ:</Text>
                            <Text style={styles.progressValueInline}>
                              {approvedItems}/{totalItems} hạng mục ({completionPercentage.toFixed(0)}%)
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Action buttons */}
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

                {/* Progress Bar - Chỉ hiện khi có items */}
                {totalItems > 0 && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${completionPercentage}%`,
                            backgroundColor: completionPercentage === 100 ? '#10B981' : completionPercentage > 0 ? '#3B82F6' : '#E5E7EB'
                          }
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Warning Box - Chỉ hiện khi có lỗi chưa xử lý (ưu tiên hiển thị) */}
                {hasOpenDefects && (
                  <TouchableOpacity
                    style={styles.warningBox}
                    onPress={onNavigateToDefects}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="warning-outline" size={20} color="#EF4444" />
                    <View style={styles.warningContent}>
                      <Text style={styles.warningText}>
                        Còn {stage.defects?.filter((d: any) => d.status === "open" || d.status === "in_progress").length || 0} lỗi chưa được khắc phục
                      </Text>
                      <Text style={styles.warningLink}>
                        Xem chi tiết →
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Acceptance Items Section - Luôn hiển thị để người dùng thấy rõ các hạng mục */}
                {projectId && (
                  <View style={styles.itemsSection}>
                    <AcceptanceItemList
                      stage={stage}
                      projectId={projectId}
                      items={stage.items || []}
                      onRefresh={onRefresh || (() => { })}
                      isProjectManager={isProjectManager}
                      isCustomer={isCustomer}
                      onItemApprove={async (itemId: number) => {
                        const item = stage.items?.find((i) => i.id === itemId);
                        if (!item) return;
                        await acceptanceApi.approveItem(projectId, stage.id, itemId);
                      }}
                      onItemReject={async (itemId: number, reason: string) => {
                        await acceptanceApi.rejectItem(projectId, stage.id, itemId, reason);
                      }}
                    />
                  </View>
                )}

              </View>
            );
          })
        )}
      </ScrollView>

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

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewCloseButton}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
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
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  stageText: {
    marginLeft: 12,
    flex: 1,
  },
  stageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  stageMeta: {
    marginTop: 4,
  },
  progressInfoInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressLabelInline: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressValueInline: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressSection: {
    marginTop: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningContent: {
    flex: 1,
  },
  warningText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
    lineHeight: 18,
  },
  warningLink: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
    marginTop: 4,
  },
  itemsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
  uploadButtonInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    marginLeft: "auto",
  },
  uploadButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  noImagesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    marginTop: 8,
  },
  noImagesText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  imagesContainer: {
    marginTop: 8,
  },
  imagesScrollContent: {
    paddingRight: 12,
  },
  imageWrapper: {
    marginRight: 12,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
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
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
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
