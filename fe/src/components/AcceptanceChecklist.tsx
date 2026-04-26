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
import { constructionLogApi, ConstructionLog } from "@/api/constructionLogApi";
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
  canRevert?: boolean;
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
  canRevert = false,
  canCreateDefect = false,
  onRefresh,
  onNavigateToDefects,
}: AcceptanceChecklistProps) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState<Acceptance | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{ task_id?: number; name: string; description: string; notes: string }>({
    task_id: undefined,
    name: "",
    description: "",
    notes: "",
  });
  // Edit modal file upload state
  const [editUploadedFiles, setEditUploadedFiles] = useState<UploadedFile[]>([]);
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

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailAcceptance, setDetailAcceptance] = useState<Acceptance | null>(null);
  const [detailDefects, setDetailDefects] = useState<Defect[]>([]);
  const [loadingDefects, setLoadingDefects] = useState(false);

  // Inline defect creation state
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [defectDescription, setDefectDescription] = useState("");
  const [defectSeverity, setDefectSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [creatingDefect, setCreatingDefect] = useState(false);
  const [defectUploadedFiles, setDefectUploadedFiles] = useState<UploadedFile[]>([]);

  // Fix defect state
  const [fixModalVisible, setFixModalVisible] = useState(false);
  const [fixingDefect, setFixingDefect] = useState<Defect | null>(null);
  const [fixUploadedFiles, setFixUploadedFiles] = useState<UploadedFile[]>([]);
  const [savingFix, setSavingFix] = useState(false);

  // Construction logs state
  const [detailLogs, setDetailLogs] = useState<ConstructionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Defect counts per acceptance (for list badges)
  const [defectCounts, setDefectCounts] = useState<{[key: number]: { open: number; total: number }}>({});

  // Load defect counts for all acceptances
  useEffect(() => {
    if (!projectId || stages.length === 0) return;
    (async () => {
      try {
        const res = await defectApi.getDefects(projectId);
        if (res.success) {
          const counts: {[key: number]: { open: number; total: number }} = {};
          (res.data || []).forEach((d: Defect) => {
            if (!d.acceptance_stage_id) return;
            if (!counts[d.acceptance_stage_id]) counts[d.acceptance_stage_id] = { open: 0, total: 0 };
            counts[d.acceptance_stage_id].total++;
            if (['open', 'in_progress'].includes(d.status)) counts[d.acceptance_stage_id].open++;
          });
          setDefectCounts(counts);
        }
      } catch (e) { /* silent */ }
    })();
  }, [projectId, stages]);

  const openDetail = async (acceptance: Acceptance) => {
    setDetailAcceptance(acceptance);
    setDetailVisible(true);
    setShowDefectForm(false);
    setDefectUploadedFiles([]);
    if (!projectId) return;
    // Load defects
    try {
      setLoadingDefects(true);
      const res = await defectApi.getDefects(projectId, { acceptance_stage_id: acceptance.id });
      if (res.success) setDetailDefects(res.data || []);
    } catch (e) { setDetailDefects([]); }
    finally { setLoadingDefects(false); }
    // Load construction logs for this task
    if (acceptance.task_id) {
      try {
        setLoadingLogs(true);
        const logRes = await constructionLogApi.getLogs(projectId, { per_page: 100 });
        if (logRes.success) {
          const taskLogs = (logRes.data?.data || logRes.data || []).filter((l: ConstructionLog) => l.task_id === acceptance.task_id);
          setDetailLogs(taskLogs.sort((a: ConstructionLog, b: ConstructionLog) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()));
        }
      } catch (e) { setDetailLogs([]); }
      finally { setLoadingLogs(false); }
    } else {
      setDetailLogs([]);
    }
  };

  const handleCreateDefect = async () => {
    if (!projectId || !detailAcceptance || !defectDescription.trim()) return;
    try {
      setCreatingDefect(true);
      const defectData: any = {
        acceptance_stage_id: detailAcceptance.id,
        task_id: detailAcceptance.task_id,
        description: defectDescription.trim(),
        severity: defectSeverity,
      };
      // Attach uploaded file IDs if any
      if (defectUploadedFiles.length > 0) {
        defectData.before_image_ids = defectUploadedFiles.map(f => f.attachment_id || f.id).filter(Boolean);
      }
      await defectApi.createDefect(projectId, defectData);
      Alert.alert('Thành công', 'Đã tạo lỗi ghi nhận');
      setDefectDescription('');
      setDefectUploadedFiles([]);
      setShowDefectForm(false);
      // Reload defects for detail
      const res = await defectApi.getDefects(projectId, { acceptance_stage_id: detailAcceptance.id });
      if (res.success) setDetailDefects(res.data || []);
      onRefresh?.();
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể tạo lỗi');
    } finally { setCreatingDefect(false); }
  };

  const handleDefectAction = async (defect: Defect, action: string, data?: any) => {
    if (!projectId) return;
    try {
      if (action === 'mark-fixed' && !data?.after_image_ids?.length) {
        setFixingDefect(defect);
        setFixUploadedFiles([]);
        setFixModalVisible(true);
        return;
      }

      await defectApi.updateDefect(projectId, defect.id, { 
        status: action === 'mark-in-progress' ? 'in_progress' : action === 'mark-fixed' ? 'fixed' : action === 'verify' ? 'verified' : defect.status,
        ...data
      });
      Alert.alert('Thành công', 'Đã cập nhật trạng thái lỗi');
      setFixModalVisible(false);
      if (detailAcceptance) {
        const res = await defectApi.getDefects(projectId, { acceptance_stage_id: detailAcceptance.id });
        if (res.success) setDetailDefects(res.data || []);
      }
      onRefresh?.();
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể cập nhật');
    }
  };

  const handleFixSubmit = async () => {
    if (!projectId || !fixingDefect) return;
    if (fixUploadedFiles.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng upload ít nhất 1 ảnh minh chứng đã sửa');
      return;
    }

    try {
      setSavingFix(true);
      const after_image_ids = fixUploadedFiles.map(f => f.attachment_id || f.id).filter(Boolean) as number[];
      await handleDefectAction(fixingDefect, 'mark-fixed', { after_image_ids });
    } finally {
      setSavingFix(false);
    }
  };

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
    setFormData({ task_id: undefined, name: "", description: "", notes: "" });
    setCreateModalVisible(true);
  };

  const openEditModal = (acceptance: Acceptance) => {
    setEditingStage(acceptance);
    setFormData({
      task_id: acceptance.task_id,
      name: acceptance.name,
      description: acceptance.description || "",
      notes: acceptance.notes || "",
    });
    // Convert existing attachments to UploadedFile format
    const existingFiles: UploadedFile[] = (acceptance.attachments || []).map((a: any) => ({
      id: a.id,
      attachment_id: a.id,
      file_url: a.file_url || a.file_path,
      url: a.file_url || a.file_path,
      original_name: a.original_name || a.file_name,
      type: a.file_type?.startsWith('image/') ? 'image' as const : 'document' as const,
    }));
    setEditUploadedFiles(existingFiles);
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
      setFormData({ task_id: undefined, name: "", description: "", notes: "" });
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
      await newAcceptanceApi.update(projectId, editingStage.id, { name: formData.name, description: formData.description, notes: formData.notes });
      // Attach files if any new ones were uploaded
      const newFileIds = editUploadedFiles.map(f => f.attachment_id || f.id).filter(Boolean) as number[];
      if (newFileIds.length > 0) {
        try {
          await newAcceptanceApi.attachFiles(projectId, editingStage.id, newFileIds);
        } catch (e) { /* best effort */ }
      }
      Alert.alert("Thành công", "Đã cập nhật hạng mục nghiệm thu");
      setEditModalVisible(false);
      setEditingStage(null);
      setFormData({ task_id: undefined, name: "", description: "", notes: "" });
      setEditUploadedFiles([]);
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

  const handleRevert = (acceptance: Acceptance) => {
    if (!projectId) return;
    Alert.alert(
      "Xác nhận hoàn duyệt",
      "Bạn có chắc chắn muốn hoàn duyệt mục này về trạng thái Nháp không? Toàn bộ quá trình duyệt trước đó sẽ bị hủy bỏ.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await newAcceptanceApi.revert(projectId, acceptance.id);
              if (result?.data) {
                setDetailAcceptance(result.data);
              }
              setDetailVisible(false);
              onRefresh?.();
              Alert.alert("Thành công", "Đã hoàn duyệt về nháp");
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể hoàn duyệt");
            }
          }
        }
      ]
    );
  };

  const handleSubmit = async (acceptance: Acceptance) => {
    if (!projectId) return;
    Alert.alert(
      "Xác nhận gửi duyệt",
      "Bạn có chắc muốn gửi hạng mục này cho cấp trên duyệt?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gửi duyệt",
          onPress: async () => {
            try {
              setSubmitting(true);
              await newAcceptanceApi.submit(projectId, acceptance.id);
              Alert.alert("Thành công", "Đã gửi duyệt nghiệm thu");
              onRefresh?.();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi duyệt");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleNavigateToLog = (log: ConstructionLog) => {
    setDetailVisible(false);
    router.push({
      pathname: `/projects/${projectId}/construction-logs/${log.id}`,
    });
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
        {/* Add Button removed as requested */}

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

                  const dc = defectCounts[acceptance.id];
                  return (
                    <TouchableOpacity key={acceptance.id} style={styles.stageCard} activeOpacity={0.7} onPress={() => openDetail(acceptance)}>
                      {/* Card Header */}
                      <View style={styles.stageHeader}>
                        <View style={styles.stageInfo}>
                          <View style={[styles.statusIconContainer, { backgroundColor: statusInfo.bgColor }]}>
                            <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
                          </View>
                          <View style={styles.stageText}>
                            <Text style={styles.stageName} numberOfLines={1}>{acceptance.name}</Text>
                            {acceptance.task && (
                              <Text style={styles.taskInfoText} numberOfLines={1}>
                                {acceptance.task.name}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                      </View>

                      {/* Status + Meta Row */}
                      <View style={styles.cardMetaRow}>
                        <View style={[styles.workflowStatusBadge, { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor }]}>
                          <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                          <Text style={[styles.workflowStatusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                        </View>
                        {dc && dc.total > 0 && (
                          <View style={[styles.defectBadge, dc.open > 0 ? styles.defectBadgeOpen : styles.defectBadgeDone]}>
                            <Ionicons name={dc.open > 0 ? 'warning-outline' : 'checkmark-circle'} size={12} color={dc.open > 0 ? '#EF4444' : '#10B981'} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: dc.open > 0 ? '#EF4444' : '#10B981' }}>{dc.open > 0 ? `${dc.open} lỗi` : `${dc.total} đã xong`}</Text>
                          </View>
                        )}
                        {acceptance.attachments && acceptance.attachments.length > 0 && (
                          <View style={styles.attachBadge}>
                            <Ionicons name="images-outline" size={12} color="#6B7280" />
                            <Text style={{ fontSize: 11, color: '#6B7280' }}>{acceptance.attachments.length}</Text>
                          </View>
                        )}
                      </View>

                      {/* Rejection reason (compact) */}
                      {acceptance.workflow_status === 'rejected' && acceptance.rejection_reason && (
                        <View style={styles.rejectionBox}>
                          <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                          <Text style={styles.rejectionText} numberOfLines={1}>{acceptance.rejection_reason}</Text>
                        </View>
                      )}

                      {/* Compact Inline Approval Buttons */}
                      {(acceptance.workflow_status === 'submitted' && canApproveLevel1) || (acceptance.workflow_status === 'supervisor_approved' && canApproveLevel3) ? (
                        <View style={styles.compactApprovalRow}>
                          {acceptance.workflow_status === 'submitted' && canApproveLevel1 && (
                            <TouchableOpacity style={[styles.compactBtn, { backgroundColor: '#ECFEFF', borderColor: '#06B6D440' }]} onPress={() => handleSupervisorApprove(acceptance)}>
                              <Ionicons name="checkmark-circle" size={14} color="#06B6D4" />
                              <Text style={[styles.compactBtnText, { color: '#06B6D4' }]}>GS duyệt</Text>
                            </TouchableOpacity>
                          )}
                          {acceptance.workflow_status === 'supervisor_approved' && canApproveLevel3 && (
                            <TouchableOpacity style={[styles.compactBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B98140' }]} onPress={() => handleCustomerApprove(acceptance)}>
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                              <Text style={[styles.compactBtnText, { color: '#10B981' }]}>KH duyệt</Text>
                            </TouchableOpacity>
                          )}
                          {canShowReject && (
                            <TouchableOpacity style={[styles.compactBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF444440' }]} onPress={() => openRejectModal(acceptance)}>
                              <Ionicons name="close-circle" size={14} color="#EF4444" />
                              <Text style={[styles.compactBtnText, { color: '#EF4444' }]}>Từ chối</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : null}
                    </TouchableOpacity>
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
            <ScrollView style={styles.modalBody}>
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
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ghi chú (GS)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ghi chú từ giám sát..."
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={2}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>📎 Tài liệu đính kèm</Text>
                <UniversalFileUploader
                  onUploadComplete={(files) => setEditUploadedFiles(files)}
                  multiple={true}
                  accept="all"
                  maxFiles={10}
                  initialFiles={editUploadedFiles}
                  label="Chọn ảnh/tài liệu đính kèm"
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
            </ScrollView>
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

      {/* ==================== ACCEPTANCE DETAIL BOTTOM SHEET ==================== */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            {/* Detail Header */}
            <View style={styles.detailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.detailHeaderIcon, { backgroundColor: detailAcceptance?.workflow_status === 'customer_approved' ? '#10B981' : '#3B82F6' }]}>
                  <Ionicons name={detailAcceptance?.workflow_status === 'customer_approved' ? 'shield-checkmark' : 'document-text'} size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' }}>Chi tiết nghiệm thu</Text>
                  <Text style={styles.detailTitle} numberOfLines={1}>{detailAcceptance?.name}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {canUpdate && detailAcceptance && detailAcceptance.workflow_status !== 'customer_approved' && (
                  <TouchableOpacity style={styles.detailIconBtn} onPress={() => { setDetailVisible(false); if (detailAcceptance) openEditModal(detailAcceptance); }}>
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                )}
                {canDelete && detailAcceptance && ['draft', 'rejected'].includes(detailAcceptance.workflow_status) && (
                  <TouchableOpacity style={styles.detailIconBtn} onPress={() => { setDetailVisible(false); if (detailAcceptance) handleDelete(detailAcceptance); }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.detailIconBtn} onPress={() => setDetailVisible(false)}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {detailAcceptance && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Status Card */}
                <View style={styles.detailStatusCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.detailStatusIcon, { backgroundColor: getWorkflowStatusInfo(detailAcceptance.workflow_status).bgColor }]}>
                      <Ionicons name={getWorkflowStatusInfo(detailAcceptance.workflow_status).icon} size={24} color={getWorkflowStatusInfo(detailAcceptance.workflow_status).color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>{detailAcceptance.name}</Text>
                      {detailAcceptance.task && (
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{detailAcceptance.task.name}</Text>
                      )}
                    </View>
                    <View style={[styles.workflowStatusBadge, { backgroundColor: getWorkflowStatusInfo(detailAcceptance.workflow_status).bgColor, borderColor: getWorkflowStatusInfo(detailAcceptance.workflow_status).borderColor }]}>
                      <Text style={[styles.workflowStatusText, { color: getWorkflowStatusInfo(detailAcceptance.workflow_status).color }]}>{getWorkflowStatusInfo(detailAcceptance.workflow_status).label}</Text>
                    </View>
                  </View>
                </View>

                {/* Info Grid */}
                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>📅 Ngày tạo</Text>
                    <Text style={styles.detailInfoValue}>{detailAcceptance.created_at ? new Date(detailAcceptance.created_at).toLocaleDateString('vi-VN') : '—'}</Text>
                  </View>
                  {detailAcceptance.description && (
                    <View style={[styles.detailInfoItem, { flex: 2 }]}>
                      <Text style={styles.detailInfoLabel}>📝 Mô tả</Text>
                      <Text style={styles.detailInfoValue}>{detailAcceptance.description}</Text>
                    </View>
                  )}
                  {detailAcceptance.submitted_at && (
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>📤 Ngày gửi duyệt</Text>
                      <Text style={styles.detailInfoValue}>{new Date(detailAcceptance.submitted_at).toLocaleDateString('vi-VN')}</Text>
                    </View>
                  )}
                  {detailAcceptance.supervisor_approved_at && (
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>✅ GS duyệt</Text>
                      <Text style={styles.detailInfoValue}>{new Date(detailAcceptance.supervisor_approved_at).toLocaleDateString('vi-VN')}</Text>
                    </View>
                  )}
                  {detailAcceptance.customer_approved_at && (
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>🏠 KH duyệt</Text>
                      <Text style={styles.detailInfoValue}>{new Date(detailAcceptance.customer_approved_at).toLocaleDateString('vi-VN')}</Text>
                    </View>
                  )}
                </View>

                {/* Acceptance Template Info */}
                {detailAcceptance.template && (
                  <View style={styles.detailTemplateBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="library-outline" size={18} color="#3B82F6" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>Bộ nghiệm thu: {detailAcceptance.template.name}</Text>
                    </View>
                    {detailAcceptance.template.criteria && detailAcceptance.template.criteria.length > 0 && (
                      <View style={{ gap: 4 }}>
                        {detailAcceptance.template.criteria.map((c: any) => (
                          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                            <Ionicons name="checkbox-outline" size={14} color="#10B981" style={{ marginTop: 1 }} />
                            <Text style={{ fontSize: 11, color: '#4B5563', flex: 1 }}>{c.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Locked Banner */}
                {detailAcceptance.workflow_status === 'customer_approved' && (
                  <View style={styles.lockedBanner}>
                    <Ionicons name="lock-closed" size={20} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46' }}>Nghiệm thu đã hoàn tất</Text>
                      <Text style={{ fontSize: 11, color: '#059669' }}>Không thể chỉnh sửa hoặc thêm mới.</Text>
                    </View>
                  </View>
                )}

                {/* Rejected Banner */}
                {detailAcceptance.workflow_status === 'rejected' && (
                  <View style={styles.rejectedBanner}>
                    <Ionicons name="alert-circle" size={20} color="#D97706" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>Nghiệm thu bị từ chối</Text>
                      {detailAcceptance.rejection_reason && (
                        <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2, fontStyle: 'italic' }}>💬 {detailAcceptance.rejection_reason}</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Attachments Section */}
                {detailAcceptance.attachments && detailAcceptance.attachments.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>📎 Tài liệu đính kèm ({detailAcceptance.attachments.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {detailAcceptance.attachments.map((att: any, idx: number) => (
                        <TouchableOpacity key={att.id || idx} style={styles.attachThumb} onPress={() => setPreviewImage(getStorageUrl(att.file_path || att.file_url))}>
                          {att.file_type?.startsWith('image/') ? (
                            <Image source={{ uri: getStorageUrl(att.file_path || att.file_url) }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                          ) : (
                            <View style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="document-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* ==================== CONSTRUCTION LOGS SECTION ==================== */}
                <View style={styles.detailSection}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.detailSectionTitle, { color: '#3B82F6' }]}>📅 Nhật ký thi công</Text>
                  </View>

                  {loadingLogs ? (
                    <ActivityIndicator style={{ marginTop: 12 }} color="#3B82F6" />
                  ) : detailLogs.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Chưa có nhật ký nào cho hạng mục này</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {detailLogs.slice(0, 5).map((log) => {
                        const weatherMap: {[key: string]: string} = { sunny: '☀️ Nắng', rainy: '🌧️ Mưa', cloudy: '⛅ Nhiều mây' };
                        return (
                          <TouchableOpacity 
                            key={log.id} 
                            style={styles.logCard}
                            onPress={() => handleNavigateToLog(log)}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>{new Date(log.log_date).toLocaleDateString('vi-VN')}</Text>
                                {log.weather && (
                                  <View style={styles.weatherTag}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: log.weather === 'rainy' ? '#2563EB' : '#D97706' }}>{weatherMap[log.weather] || log.weather}</Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.progressTag}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6' }}>Tiến độ: {log.completion_percentage}%</Text>
                              </View>
                            </View>
                            {log.notes && (
                              <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }} numberOfLines={2}>{log.notes}</Text>
                            )}
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              {log.personnel_count != null && (
                                <View style={styles.logMetaBadge}>
                                  <Ionicons name="people-outline" size={10} color="#6B7280" />
                                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#6B7280' }}>{log.personnel_count} người</Text>
                                </View>
                              )}
                              {log.attachments && log.attachments.length > 0 && (
                                <View style={styles.logMetaBadge}>
                                  <Ionicons name="images-outline" size={10} color="#6B7280" />
                                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#6B7280' }}>{log.attachments.length} tệp</Text>
                                </View>
                              )}
                              {log.shift && (
                                <View style={styles.logMetaBadge}>
                                  <Ionicons name="time-outline" size={10} color="#6B7280" />
                                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#6B7280' }}>
                                    {log.shift === 'morning' ? 'Ca sáng' : log.shift === 'afternoon' ? 'Ca chiều' : log.shift === 'night' ? 'Ca đêm' : 'Cả ngày'}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {detailLogs.length > 5 && (
                        <Text style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>+{detailLogs.length - 5} nhật ký khác</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* ==================== DEFECTS SECTION ==================== */}
                <View style={styles.detailSection}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.detailSectionTitle, { color: '#EF4444' }]}>⚠️ Lỗi ghi nhận</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {detailDefects.length > 0 && (
                        <View style={[styles.defectProgressBadge, detailDefects.every(d => d.status === 'verified') ? styles.defectProgressDone : {}]}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: detailDefects.every(d => d.status === 'verified') ? '#10B981' : '#6B7280' }}>
                            {detailDefects.filter(d => d.status === 'verified').length}/{detailDefects.length} đã xong
                          </Text>
                        </View>
                      )}
                      {canCreateDefect && detailAcceptance.workflow_status !== 'customer_approved' && (
                        <TouchableOpacity onPress={() => setShowDefectForm(!showDefectForm)}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#3B82F6' }}>{showDefectForm ? 'Đóng' : '+ Tạo lỗi'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Inline Defect Creation Form */}
                  {showDefectForm && (
                    <View style={styles.defectFormBox}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626', marginBottom: 8 }}>Ghi nhận lỗi mới</Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 8 }]}
                        placeholder="VD: Nứt tường, sơn loang..."
                        value={defectDescription}
                        onChangeText={setDefectDescription}
                        multiline
                        numberOfLines={2}
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Mức độ:</Text>
                        {(['low', 'medium', 'high'] as const).map(s => (
                          <TouchableOpacity key={s} onPress={() => setDefectSeverity(s)}
                            style={[styles.severityBtn, defectSeverity === s && styles.severityBtnActive,
                              defectSeverity === s && { borderColor: s === 'high' ? '#EF4444' : s === 'medium' ? '#F59E0B' : '#6B7280' }]}>
                            <Text style={[styles.severityBtnText, defectSeverity === s && { color: s === 'high' ? '#EF4444' : s === 'medium' ? '#F59E0B' : '#6B7280' }]}>
                              {s === 'low' ? 'Nhẹ' : s === 'medium' ? 'TB' : 'Nặng'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {/* File upload for defect evidence */}
                      <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>📷 Ảnh minh chứng lỗi</Text>
                        <UniversalFileUploader
                          onUploadComplete={(files) => setDefectUploadedFiles(files)}
                          multiple={true}
                          accept="image"
                          maxFiles={5}
                          initialFiles={defectUploadedFiles}
                          label="Chọn ảnh minh chứng"
                        />
                      </View>
                      <TouchableOpacity style={styles.createDefectBtn} onPress={handleCreateDefect} disabled={creatingDefect || !defectDescription.trim()}>
                        {creatingDefect ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Tạo lỗi & Gửi yêu cầu sửa</Text>}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Defects List */}
                  {loadingDefects ? (
                    <ActivityIndicator style={{ marginTop: 12 }} color="#3B82F6" />
                  ) : detailDefects.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Ionicons name="checkmark-circle-outline" size={32} color="#D1D5DB" />
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Không có lỗi nào ghi nhận</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {detailDefects.map((d) => {
                        const sevColor = d.severity === 'high' ? '#EF4444' : d.severity === 'medium' ? '#F59E0B' : '#9CA3AF';
                        const statusMap: {[key: string]: { bg: string; color: string; label: string }} = {
                          open: { bg: '#FEF2F2', color: '#EF4444', label: '🔴 Mới' },
                          in_progress: { bg: '#FFFBEB', color: '#D97706', label: '🔧 Đang sửa' },
                          fixed: { bg: '#EFF6FF', color: '#2563EB', label: '📋 Chờ xác nhận' },
                          verified: { bg: '#ECFDF5', color: '#059669', label: '✅ Đã xong' },
                        };
                        const st = statusMap[d.status] || statusMap.open;
                        return (
                          <TouchableOpacity 
                            key={d.id} 
                            style={[styles.defectCard, { backgroundColor: st.bg, borderColor: st.color + '30' }]}
                            onPress={() => { setDetailVisible(false); onNavigateToDefects?.(detailAcceptance?.id); }}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.defectDesc, d.status === 'verified' && { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>{d.description}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                  <View style={[styles.miniTag, { backgroundColor: sevColor + '15', borderColor: sevColor + '40' }]}>
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: sevColor }}>{d.severity === 'high' ? 'Nặng' : d.severity === 'medium' ? 'TB' : 'Nhẹ'}</Text>
                                  </View>
                                  <View style={[styles.miniTag, { backgroundColor: st.color + '15', borderColor: st.color + '40' }]}>
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: st.color }}>{st.label}</Text>
                                  </View>
                                </View>
                              </View>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>

                            {/* Attachments - Before/After Images */}
                            {(d.attachments && d.attachments.length > 0) && (
                              <View style={{ marginTop: 10, gap: 8 }}>
                                {/* Before images */}
                                {d.attachments.filter((a: any) => a.description === 'before' || !a.description).length > 0 && (
                                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                    {d.attachments.filter((a: any) => a.description === 'before' || !a.description).map((att: any, idx: number) => (
                                      <TouchableOpacity key={idx} onPress={() => setPreviewImage(getStorageUrl(att.file_path || att.file_url))}>
                                        <Image source={{ uri: getStorageUrl(att.file_path || att.file_url) }} style={{ width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' }} />
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                )}
                                {/* After images */}
                                {d.attachments.filter((a: any) => a.description === 'after').length > 0 && (
                                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#D1FAE5', borderRadius: 4 }}>
                                      <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>Sau sửa</Text>
                                    </View>
                                    {d.attachments.filter((a: any) => a.description === 'after').map((att: any, idx: number) => (
                                      <TouchableOpacity key={idx} onPress={() => setPreviewImage(getStorageUrl(att.file_path || att.file_url))}>
                                        <Image source={{ uri: getStorageUrl(att.file_path || att.file_url) }} style={{ width: 44, height: 44, borderRadius: 6, borderWidth: 2, borderColor: '#10B981' }} />
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                )}
                              </View>
                            )}

                            {/* Violated Criteria */}
                            {d.violatedCriteria && d.violatedCriteria.length > 0 && (
                              <View style={{ marginTop: 10, backgroundColor: '#FFFFFF90', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 4 }}>Tiêu chí vi phạm:</Text>
                                {d.violatedCriteria.map((c: any) => (
                                  <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 2 }}>
                                    <Ionicons name={c.pivot?.status === 'passed' ? "checkmark-circle" : "alert-circle"} size={14} color={c.pivot?.status === 'passed' ? "#10B981" : "#EF4444"} style={{ marginTop: 1 }} />
                                    <Text style={{ fontSize: 11, color: '#4B5563', flex: 1 }}>{c.name}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                            {d.status === 'verified' && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#10B981' }}>Đã khắc phục và xác nhận</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            {/* Sticky Approval Footer */}
            {detailAcceptance && detailAcceptance.workflow_status !== 'customer_approved' && (
              <View style={[styles.detailFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={[styles.workflowStatusBadge, { backgroundColor: getWorkflowStatusInfo(detailAcceptance.workflow_status).bgColor, borderColor: getWorkflowStatusInfo(detailAcceptance.workflow_status).borderColor }]}>
                  <Text style={[styles.workflowStatusText, { color: getWorkflowStatusInfo(detailAcceptance.workflow_status).color }]}>{getWorkflowStatusInfo(detailAcceptance.workflow_status).label}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                  {detailAcceptance.workflow_status === 'draft' && canUpdate && (
                    <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }]} onPress={() => { handleSubmit(detailAcceptance); setDetailVisible(false); }}>
                      <Ionicons name="paper-plane-outline" size={14} color="#FFF" />
                      <Text style={[styles.footerBtnText, { color: '#FFF' }]}>Gửi duyệt</Text>
                    </TouchableOpacity>
                  )}
                  {detailAcceptance.workflow_status === 'submitted' && canApproveLevel1 && (
                    <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#06B6D4', borderColor: '#06B6D4' }]} onPress={() => { handleSupervisorApprove(detailAcceptance); setDetailVisible(false); }}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#FFF" />
                      <Text style={[styles.footerBtnText, { color: '#FFF' }]}>Duyệt (GS)</Text>
                    </TouchableOpacity>
                  )}
                  {detailAcceptance.workflow_status === 'supervisor_approved' && canApproveLevel3 && (
                    <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]} onPress={() => { handleCustomerApprove(detailAcceptance); setDetailVisible(false); }}>
                      <Ionicons name="shield-checkmark-outline" size={14} color="#FFF" />
                      <Text style={[styles.footerBtnText, { color: '#FFF' }]}>Duyệt (KH)</Text>
                    </TouchableOpacity>
                  )}
                  {(['submitted', 'supervisor_approved'].includes(detailAcceptance.workflow_status) && (canApproveLevel1 || canApproveLevel3)) && (
                    <TouchableOpacity style={[styles.footerBtn, { borderColor: '#EF4444' }]} onPress={() => { openRejectModal(detailAcceptance); setDetailVisible(false); }}>
                      <Text style={[styles.footerBtnText, { color: '#EF4444' }]}>Từ chối</Text>
                    </TouchableOpacity>
                  )}
                  {canRevert && (['submitted', 'supervisor_approved', 'rejected'].includes(detailAcceptance.workflow_status)) && (
                    <TouchableOpacity style={[styles.footerBtn, { borderColor: '#6B7280' }]} onPress={() => { handleRevert(detailAcceptance); }}>
                      <Ionicons name="refresh-outline" size={14} color="#6B7280" />
                      <Text style={[styles.footerBtnText, { color: '#6B7280' }]}>Hoàn duyệt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Fix Defect Modal (Upload Evidence) */}
      <Modal
        visible={fixModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFixModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận đã sửa lỗi</Text>
              <TouchableOpacity
                onPress={() => setFixModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.formGroup, { marginTop: 16 }]}>
                <Text style={styles.label}>
                  📸 Ảnh minh chứng đã sửa <Text style={styles.required}>*</Text>
                </Text>
                <View style={{ marginTop: 8 }}>
                  <UniversalFileUploader
                    onUploadComplete={(files) => setFixUploadedFiles(files)}
                    multiple={true}
                    accept="image"
                    maxFiles={5}
                    initialFiles={fixUploadedFiles}
                    label="Chọn ảnh đã sửa"
                  />
                </View>
              </View>
              <View style={[styles.modalActions, { marginTop: 24 }]}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setFixModalVisible(false)}
                  disabled={savingFix}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#10B981' }]}
                  onPress={handleFixSubmit}
                  disabled={savingFix}
                >
                  {savingFix ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Xác nhận đã sửa</Text>
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
  // ===== CARD META ROW =====
  cardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    alignItems: "center",
  },
  defectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  defectBadgeOpen: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF444430",
  },
  defectBadgeDone: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B98130",
  },
  attachBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  // ===== COMPACT APPROVAL =====
  compactApprovalRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  compactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // ===== DETAIL BOTTOM SHEET =====
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    minHeight: "60%",
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detailHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  detailIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  detailStatusCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  detailInfoItem: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  detailInfoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailInfoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  rejectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  detailSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailTemplateBox: {
    margin: 16,
    padding: 16,
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  attachThumb: {
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  // ===== DEFECTS =====
  defectProgressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  defectProgressDone: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  defectFormBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  severityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  severityBtnActive: {
    backgroundColor: "#FFF7ED",
  },
  severityBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  createDefectBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  defectCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  defectDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  // ===== DETAIL FOOTER =====
  detailFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  // ===== CONSTRUCTION LOGS =====
  logCard: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  weatherTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  progressTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  logMetaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#EF4444",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
