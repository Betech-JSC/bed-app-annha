import React, { useState, useEffect, useRef } from "react";
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
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Acceptance, newAcceptanceApi } from "@/api/acceptanceApi";
import { acceptanceApi } from "@/api/acceptanceApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { ganttApi } from "@/api/ganttApi";
import { ProjectTask } from "@/types/ganttTypes";
import api from "@/api/api";
import { UniversalFileUploader } from "@/components";
import type { UploadedFile } from "@/components/UniversalFileUploader";
import { defectApi, Defect, CreateDefectData } from "@/api/defectApi";
import { useRouter } from "expo-router";
import { Permissions } from "@/constants/Permissions";
import { API_URL } from "@env";

// Helper to build storage URL from API_URL instead of hardcoded localhost
const getStorageUrl = (filePath: string): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const baseUrl = (API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  return `${baseUrl}/storage/${filePath}`;
};

interface AcceptanceChecklistProps {
  stages: Acceptance[]; // keep prop name "stages" for backward compat with acceptance.tsx caller
  projectId?: string | number;
  isProjectManager?: boolean;
  isCustomer?: boolean;
  isSupervisor?: boolean;
  isAdmin?: boolean; // BUSINESS RULE: Admin có full quyền xem và duyệt tất cả
  canApproveLevel1?: boolean;
  canApproveLevel2?: boolean;
  canApproveLevel3?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canCreateDefect?: boolean;
  onRefresh?: () => void;
  onNavigateToDefects?: (stageId?: number) => void;
}

export default function AcceptanceChecklist({
  stages,
  projectId,
  isProjectManager = false,
  isCustomer = false,
  isSupervisor = false,
  isAdmin = false,
  canApproveLevel1 = false,
  canApproveLevel2 = false,
  canApproveLevel3 = false,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  canCreateDefect = false,
  onRefresh,
  onNavigateToDefects,
}: AcceptanceChecklistProps) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState<Acceptance | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{ task_id?: number; name: string; description: string }>({
    task_id: undefined,
    name: "",
    description: "",
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingAcceptance, setRejectingAcceptance] = useState<Acceptance | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [savingReject, setSavingReject] = useState(false);

  useEffect(() => {
    if (projectId && (createModalVisible || editModalVisible)) {
      loadChildTasks();
    }
  }, [projectId, createModalVisible, editModalVisible]);

  // Load child tasks (tasks that have a parent_id) for creating acceptances
  const loadChildTasks = async () => {
    if (!projectId) return;
    try {
      setLoadingTasks(true);
      const response = await ganttApi.getTasks(projectId.toString());
      if (response.success) {
        const allTasks = response.data.data || response.data || [];
        // Filter child tasks (have parent_id)
        const childTasks = allTasks.filter((task: ProjectTask) => !!(task as any).parent_id);
        setTasks(childTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ task_id: undefined, name: "", description: "" });
    setCreateModalVisible(true);
  };

  const openEditModal = (acceptance: Acceptance) => {
    setEditingStage(acceptance);
    setFormData({
      task_id: acceptance.task_id,
      name: acceptance.name,
      description: acceptance.description || "",
    });
    if (projectId) {
      loadChildTasks();
    }
    setEditModalVisible(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên hạng mục nghiệm thu");
      return;
    }

    if (!formData.task_id) {
      Alert.alert("Lỗi", "Vui lòng chọn công việc");
      return;
    }

    if (!projectId) return;

    try {
      setSaving(true);
      await newAcceptanceApi.create(projectId, { task_id: formData.task_id, name: formData.name, description: formData.description });
      Alert.alert("Thành công", "Đã tạo hạng mục nghiệm thu mới");
      setCreateModalVisible(false);
      setFormData({ task_id: undefined, name: "", description: "" });
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo hạng mục nghiệm thu");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên hạng mục nghiệm thu");
      return;
    }

    if (!projectId || !editingStage) return;

    try {
      setSaving(true);
      await newAcceptanceApi.update(projectId, editingStage.id, { name: formData.name, description: formData.description });
      Alert.alert("Thành công", "Đã cập nhật hạng mục nghiệm thu");
      setEditModalVisible(false);
      setEditingStage(null);
      setFormData({ task_id: undefined, name: "", description: "" });
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật hạng mục nghiệm thu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (acceptance: Acceptance) => {
    if (!projectId) return;

    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa hạng mục "${acceptance.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await newAcceptanceApi.remove(projectId, acceptance.id);
              Alert.alert("Thành công", "Đã xóa hạng mục nghiệm thu");
              onRefresh?.();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa hạng mục nghiệm thu");
            }
          },
        },
      ]
    );
  };

  const handleSupervisorApprove = async (acceptance: Acceptance) => {
    if (!projectId) return;
    try {
      await newAcceptanceApi.supervisorApprove(projectId, acceptance.id);
      Alert.alert("Thành công", "Đã duyệt (GS) thành công");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
    }
  };

  const handleCustomerApprove = async (acceptance: Acceptance) => {
    if (!projectId) return;
    try {
      await newAcceptanceApi.customerApprove(projectId, acceptance.id);
      Alert.alert("Thành công", "Đã duyệt (KH) thành công");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
    }
  };

  const openRejectModal = (acceptance: Acceptance) => {
    setRejectingAcceptance(acceptance);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!projectId || !rejectingAcceptance) return;
    if (!rejectReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setSavingReject(true);
      await newAcceptanceApi.reject(projectId, rejectingAcceptance.id, rejectReason);
      Alert.alert("Thành công", "Đã từ chối hạng mục nghiệm thu");
      setRejectModalVisible(false);
      setRejectingAcceptance(null);
      setRejectReason("");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối");
    } finally {
      setSavingReject(false);
    }
  };

  const handleRevert = async (acceptance: Acceptance) => {
    if (!projectId) return;
    try {
      await newAcceptanceApi.revert(projectId, acceptance.id);
      Alert.alert("Thành công", "Đã hoàn duyệt");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể hoàn duyệt");
    }
  };

  const handleBatchSupervisorApprove = async (parentTaskId: number) => {
    if (!projectId) return;
    try {
      await newAcceptanceApi.batchSupervisorApprove(projectId, parentTaskId);
      Alert.alert("Thành công", "Đã duyệt tất cả (GS)");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt hàng loạt");
    }
  };

  const handleBatchCustomerApprove = async (parentTaskId: number) => {
    if (!projectId) return;
    try {
      await newAcceptanceApi.batchCustomerApprove(projectId, parentTaskId);
      Alert.alert("Thành công", "Đã duyệt tất cả (KH)");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt hàng loạt");
    }
  };

  // BUSINESS RULE: Locked = customer_approved
  const isLocked = (acceptance: Acceptance) => acceptance.workflow_status === 'customer_approved';

  // Map workflow_status to display info
  const getWorkflowStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { color: '#9CA3AF', bgColor: '#9CA3AF15', borderColor: '#9CA3AF40', label: 'Nháp', icon: 'ellipse-outline' as const };
      case 'submitted':
        return { color: '#F59E0B', bgColor: '#F59E0B15', borderColor: '#F59E0B40', label: 'Chờ GS duyệt', icon: 'time-outline' as const };
      case 'supervisor_approved':
        return { color: '#06B6D4', bgColor: '#06B6D415', borderColor: '#06B6D440', label: 'Chờ KH duyệt', icon: 'checkmark-circle-outline' as const };
      case 'customer_approved':
        return { color: '#10B981', bgColor: '#10B98115', borderColor: '#10B98140', label: 'Đã nghiệm thu', icon: 'checkmark-circle' as const };
      case 'rejected':
        return { color: '#EF4444', bgColor: '#EF444415', borderColor: '#EF444440', label: 'Từ chối', icon: 'close-circle' as const };
      default:
        return { color: '#9CA3AF', bgColor: '#9CA3AF15', borderColor: '#9CA3AF40', label: 'Nháp', icon: 'ellipse-outline' as const };
    }
  };

  // Group acceptances by parent task
  const groups: { parentTaskId: number | 'ungrouped'; parentTaskName: string; items: Acceptance[] }[] = [];
  const groupMap: Record<string | number, typeof groups[0]> = {};
  stages.forEach(a => {
    const parentId = a.task?.parent_id ?? 'ungrouped';
    const parentName = a.task?.parent?.name ?? a.task?.name ?? 'Chưa phân nhóm';
    if (!groupMap[parentId]) {
      groupMap[parentId] = { parentTaskId: parentId as number, parentTaskName: parentName, items: [] };
      groups.push(groupMap[parentId]);
    }
    groupMap[parentId].items.push(a);
  });

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, flexGrow: 1 }}
      >
        {/* Add Button */}
        {canCreate && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Thêm hạng mục</Text>
            </TouchableOpacity>
          </View>
        )}

        {stages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có hạng mục nghiệm thu</Text>
          </View>
        ) : (
          groups.map((group) => {
            const hasSubmitted = group.items.some(a => a.workflow_status === 'submitted');
            const hasSupervisorApproved = group.items.some(a => a.workflow_status === 'supervisor_approved');

            return (
              <View key={String(group.parentTaskId)} style={styles.groupContainer}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <Ionicons name="folder-outline" size={18} color="#3B82F6" />
                  <Text style={styles.groupTitle}>{group.parentTaskName}</Text>
                  <Text style={styles.groupCount}>{group.items.length} hạng mục</Text>
                </View>

                {/* Batch approve buttons */}
                {(hasSubmitted && canApproveLevel1) || (hasSupervisorApproved && canApproveLevel3) ? (
                  <View style={styles.batchButtonsRow}>
                    {hasSubmitted && canApproveLevel1 && group.parentTaskId !== 'ungrouped' && (
                      <TouchableOpacity
                        style={styles.batchButton}
                        onPress={() => handleBatchSupervisorApprove(group.parentTaskId as number)}
                      >
                        <Ionicons name="checkmark-done-outline" size={16} color="#06B6D4" />
                        <Text style={styles.batchButtonText}>Duyệt tất cả (GS)</Text>
                      </TouchableOpacity>
                    )}
                    {hasSupervisorApproved && canApproveLevel3 && group.parentTaskId !== 'ungrouped' && (
                      <TouchableOpacity
                        style={[styles.batchButton, styles.batchButtonGreen]}
                        onPress={() => handleBatchCustomerApprove(group.parentTaskId as number)}
                      >
                        <Ionicons name="checkmark-done" size={16} color="#10B981" />
                        <Text style={[styles.batchButtonText, { color: '#10B981' }]}>Duyệt tất cả (KH)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                {/* Acceptance Cards */}
                {group.items.map((acceptance) => {
                  const statusInfo = getWorkflowStatusInfo(acceptance.workflow_status);
                  const locked = isLocked(acceptance);
                  const canShowReject = (acceptance.workflow_status === 'submitted' || acceptance.workflow_status === 'supervisor_approved') && (canApproveLevel1 || canApproveLevel3);
                  const canShowRevert = acceptance.workflow_status === 'submitted' || acceptance.workflow_status === 'supervisor_approved' || acceptance.workflow_status === 'rejected';

                  return (
                    <View key={acceptance.id} style={styles.stageCard}>
                      {/* Card Header */}
                      <View style={styles.stageHeader}>
                        <View style={styles.stageInfo}>
                          <View style={[styles.statusIconContainer, { backgroundColor: statusInfo.bgColor }]}>
                            <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
                          </View>
                          <View style={styles.stageText}>
                            <Text style={styles.stageName}>{acceptance.name}</Text>
                            {acceptance.task && (
                              <View style={styles.taskInfo}>
                                <Ionicons name="construct-outline" size={14} color="#6B7280" />
                                <Text style={styles.taskInfoText} numberOfLines={1}>
                                  {acceptance.task.name}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {/* Edit / Delete */}
                        {!locked && (
                          <View style={styles.stageActions}>
                            {canUpdate && (
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => openEditModal(acceptance)}
                              >
                                <Ionicons name="create-outline" size={18} color="#3B82F6" />
                              </TouchableOpacity>
                            )}
                            {canDelete && (acceptance.workflow_status === 'draft' || acceptance.workflow_status === 'rejected') && (
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleDelete(acceptance)}
                              >
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Workflow Status Badge */}
                      <View style={styles.workflowStatusRow}>
                        <View style={[styles.workflowStatusBadge, { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor }]}>
                          <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                          <Text style={[styles.workflowStatusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>

                      {/* Rejection reason */}
                      {acceptance.workflow_status === 'rejected' && acceptance.rejection_reason && (
                        <View style={styles.rejectionBox}>
                          <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                          <Text style={styles.rejectionText} numberOfLines={2}>
                            Lý do từ chối: {acceptance.rejection_reason}
                          </Text>
                        </View>
                      )}

                      {/* Approval Action Buttons */}
                      <View style={styles.approvalActionsSection}>
                        {/* GS duyệt */}
                        {acceptance.workflow_status === 'submitted' && canApproveLevel1 && (
                          <TouchableOpacity
                            style={styles.approvalButton}
                            onPress={() => handleSupervisorApprove(acceptance)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={18} color="#06B6D4" />
                            <Text style={[styles.approvalButtonText, { color: '#06B6D4' }]}>GS duyệt</Text>
                          </TouchableOpacity>
                        )}

                        {/* KH duyệt */}
                        {acceptance.workflow_status === 'supervisor_approved' && canApproveLevel3 && (
                          <TouchableOpacity
                            style={[styles.approvalButton, { borderColor: '#10B98140' }]}
                            onPress={() => handleCustomerApprove(acceptance)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                            <Text style={[styles.approvalButtonText, { color: '#10B981' }]}>KH duyệt</Text>
                          </TouchableOpacity>
                        )}

                        {/* Từ chối */}
                        {canShowReject && (
                          <TouchableOpacity
                            style={[styles.approvalButton, styles.rejectButton]}
                            onPress={() => openRejectModal(acceptance)}
                          >
                            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                            <Text style={[styles.approvalButtonText, { color: '#EF4444' }]}>Từ chối</Text>
                          </TouchableOpacity>
                        )}

                        {/* Hoàn duyệt */}
                        {canShowRevert && (
                          <TouchableOpacity
                            style={[styles.approvalButton, styles.revertButton]}
                            onPress={() => handleRevert(acceptance)}
                          >
                            <Ionicons name="refresh-outline" size={18} color="#6B7280" />
                            <Text style={[styles.approvalButtonText, { color: '#6B7280' }]}>Hoàn duyệt</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Acceptance Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm hạng mục nghiệm thu</Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {/* Task selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Công việc <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.taskSelectButton}
                  onPress={() => setShowTaskPicker(true)}
                >
                  <Text style={[
                    styles.taskSelectText,
                    !formData.task_id && styles.placeholderText
                  ]}>
                    {formData.task_id
                      ? tasks.find(t => t.id === formData.task_id)?.name || "Chọn công việc"
                      : "Chọn công việc hạng mục"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tên hạng mục <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên hạng mục nghiệm thu"
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
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setCreateModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, !formData.task_id && styles.saveButtonDisabled]}
                  onPress={handleCreate}
                  disabled={saving || !formData.task_id}
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

        {/* Task Picker Modal */}
        {showTaskPicker && (
          <Modal
            visible={showTaskPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTaskPicker(false)}
          >
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Chọn công việc</Text>
                  <TouchableOpacity onPress={() => setShowTaskPicker(false)}>
                    <Ionicons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                {loadingTasks ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : (
                  <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerOption,
                          formData.task_id === item.id && styles.pickerOptionActive
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, task_id: item.id });
                          setShowTaskPicker(false);
                        }}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          formData.task_id === item.id && styles.pickerOptionTextActive
                        ]}>
                          {item.name}
                        </Text>
                        {formData.task_id === item.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.pickerEmptyContainer}>
                        <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.pickerEmptyText}>Chưa có công việc hạng mục nào</Text>
                      </View>
                    }
                  />
                )}
              </View>
            </View>
          </Modal>
        )}
      </Modal>

      {/* Edit Acceptance Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa hạng mục nghiệm thu</Text>
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
                  Tên hạng mục <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên hạng mục nghiệm thu"
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

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ chối hạng mục</Text>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
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
                  placeholder="Nhập lý do từ chối..."
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setRejectModalVisible(false)}
                  disabled={savingReject}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                  onPress={handleReject}
                  disabled={savingReject}
                >
                  {savingReject ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Từ chối</Text>
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
  groupContainer: {
    marginBottom: 16,
    marginHorizontal: 0,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D4ED8",
    flex: 1,
  },
  groupCount: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  batchButtonsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  batchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ECFEFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#06B6D440",
  },
  batchButtonGreen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B98140",
  },
  batchButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#06B6D4",
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
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  taskInfoText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  workflowStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  workflowStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  workflowStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectionText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
    lineHeight: 18,
  },
  approvalActionsSection: {
    marginTop: 10,
    gap: 8,
  },
  approvalButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#06B6D440",
    backgroundColor: "#ECFEFF",
  },
  rejectButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF444440",
  },
  revertButton: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  approvalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
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
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  pickerLoadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flex: 1,
  },
  pickerOptionTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  pickerEmptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
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
});
