import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "@/reducers/index";
import { Ionicons } from "@expo/vector-icons";
import { AcceptanceItem, AcceptanceStage, acceptanceApi } from "@/api/acceptanceApi";
import AcceptanceItemForm from "./AcceptanceItemForm";
import { PermissionGuard } from "./PermissionGuard";
import { UniversalFileUploader } from "@/components";
import { defectApi } from "@/api/defectApi";

interface AcceptanceItemListProps {
  stage: AcceptanceStage;
  projectId: string | number;
  items: AcceptanceItem[];
  onRefresh: () => void;
  onItemApprove: (itemId: number) => Promise<void>;
  onItemReject: (itemId: number, reason: string) => Promise<void>;
  isProjectManager?: boolean;
  isCustomer?: boolean;
}

export default function AcceptanceItemList({
  stage,
  projectId,
  items,
  onRefresh,
  onItemApprove,
  onItemReject,
  isProjectManager = false,
  isCustomer = false,
}: AcceptanceItemListProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AcceptanceItem | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [itemDefects, setItemDefects] = useState<Record<number, number>>({});
  const [itemTaskProgress, setItemTaskProgress] = useState<Record<number, number>>({});
  const user = useSelector((state: RootState) => state.user);
  const { permissions } = useSelector((state: RootState) => state.permissions);

  // Kiểm tra nếu user là admin (có permission "*" hoặc role là admin)
  const isAdmin = permissions.includes("*") || user?.role === "admin" || user?.role === "super_admin";

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      case "pending":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "approved":
        return "Đạt";
      case "rejected":
        return "Không đạt";
      case "pending":
        return "Chưa nghiệm thu";
      case "not_started":
        return "Chưa bắt đầu";
      default:
        return status;
    }
  };

  const getWorkflowStatusLabel = (status: string): string => {
    switch (status) {
      case "draft":
        return "Nháp";
      case "submitted":
        return "Đã gửi duyệt";
      case "project_manager_approved":
        return "QLDA đã duyệt";
      case "customer_approved":
        return "KH/Giám sát đã duyệt";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const getWorkflowStatusColor = (status: string): string => {
    switch (status) {
      case "draft":
        return "#6B7280";
      case "submitted":
        return "#F59E0B";
      case "project_manager_approved":
        return "#3B82F6";
      case "customer_approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const handleCreateItem = async (data: any) => {
    try {
      await acceptanceApi.createItem(projectId, stage.id, data);
      Alert.alert("Thành công", "Đã tạo hạng mục");
      onRefresh();
    } catch (error: any) {
      throw error;
    }
  };

  const handleUpdateItem = async (data: any) => {
    if (!selectedItem) return;
    try {
      await acceptanceApi.updateItem(projectId, stage.id, selectedItem.id, data);
      Alert.alert("Thành công", "Đã cập nhật hạng mục");
      onRefresh();
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa hạng mục này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await acceptanceApi.deleteItem(projectId, stage.id, itemId);
              Alert.alert("Thành công", "Đã xóa hạng mục");
              onRefresh();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa hạng mục");
            }
          },
        },
      ]
    );
  };

  const handleApprove = async (item: AcceptanceItem) => {
    if (!item.can_accept) {
      Alert.alert("Lỗi", "Hạng mục chỉ được nghiệm thu sau khi hoàn thành (ngày kết thúc đã qua)");
      return;
    }

    Alert.prompt(
      "Nghiệm thu hạng mục",
      "Nhập ghi chú (tùy chọn):",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đạt",
          onPress: async (notes) => {
            try {
              await acceptanceApi.approveItem(projectId, stage.id, item.id, notes);
              Alert.alert("Thành công", "Hạng mục đã được nghiệm thu (Đạt)");
              onRefresh();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể nghiệm thu");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleSubmit = async (item: AcceptanceItem) => {
    // Validate có upload hình ảnh (bắt buộc cho tất cả)
    const attachmentsCount = item.attachments?.length || 0;
    if (attachmentsCount === 0) {
      Alert.alert(
        "Không thể gửi duyệt",
        "Vui lòng upload hình ảnh thực tế nghiệm thu trước khi gửi duyệt."
      );
      return;
    }

    // Admin có thể bypass một số validation
    if (!isAdmin) {
      // Validate chỉ kiểm tra task của item hiện tại (cho phép gửi duyệt từng hạng mục riêng lẻ)
      if (item.task_id) {
        const progress = item.task?.progress_percentage ?? itemTaskProgress[item.id] ?? 0;
        if (progress < 100) {
          Alert.alert(
            "Không thể gửi duyệt",
            `Hạng mục thi công "${item.task?.name || 'chưa có tên'}" chưa hoàn thành 100%. Vui lòng hoàn thành hạng mục trước khi gửi duyệt nghiệm thu.`
          );
          return;
        }
      }

      // Validate không có lỗi chưa xử lý
      if (itemDefects[item.id] > 0) {
        Alert.alert(
          "Không thể gửi duyệt",
          `Còn ${itemDefects[item.id]} lỗi chưa được xử lý. Vui lòng xử lý tất cả lỗi trước khi gửi duyệt nghiệm thu.`
        );
        return;
      }
    }

    try {
      await acceptanceApi.submitItem(projectId, stage.id, item.id);
      Alert.alert("Thành công", "Đã gửi duyệt hạng mục nghiệm thu thành công");
      onRefresh();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi duyệt");
    }
  };

  const handleProjectManagerApprove = async (item: AcceptanceItem) => {
    try {
      await acceptanceApi.projectManagerApproveItem(projectId, stage.id, item.id);
      Alert.alert("Thành công", "Đã duyệt thành công");
      onRefresh();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
    }
  };

  const handleCustomerApprove = async (item: AcceptanceItem) => {
    try {
      await acceptanceApi.customerApproveItem(projectId, stage.id, item.id);
      Alert.alert("Thành công", "Đã duyệt nghiệm thu thành công");
      onRefresh();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
    }
  };

  const handleOpenUploadModal = (itemId: number) => {
    setUploadingItemId(itemId);
    const item = items.find(i => i.id === itemId);
    setUploadNotes(item?.notes || "");
    setUploadModalVisible(true);
  };

  const handleUploadComplete = async (files: any[]) => {
    if (!uploadingItemId || !projectId || files.length === 0) return;

    try {
      setUploading(true);
      const attachmentIds = files
        .map((f) => f.attachment_id || f.id)
        .filter((id) => id);

      if (attachmentIds.length > 0) {
        await acceptanceApi.attachFilesToItem(projectId, stage.id, uploadingItemId, attachmentIds);

        // Cập nhật ghi chú nếu có
        if (uploadNotes.trim()) {
          const item = items.find(i => i.id === uploadingItemId);
          if (item) {
            try {
              await acceptanceApi.updateItem(
                projectId,
                stage.id,
                uploadingItemId,
                { notes: uploadNotes.trim() }
              );
            } catch (error) {
              console.error("Error updating notes:", error);
            }
          }
        }

        Alert.alert("Thành công", "Đã upload hình ảnh nghiệm thu thực tế");
        setUploadModalVisible(false);
        setUploadingItemId(null);
        setUploadNotes("");
        onRefresh();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể đính kèm file");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    // Load defects and task progress for items with task_id
    const loadDefectsAndProgress = async () => {
      const defectsMap: Record<number, number> = {};
      const progressMap: Record<number, number> = {};

      for (const item of items) {
        if (item.task_id) {
          try {
            // Load defects
            const response = await defectApi.getDefects(projectId);
            if (response.success) {
              const openDefects = (response.data || []).filter(
                (defect: any) =>
                  defect.task_id === item.task_id &&
                  (defect.status === 'open' || defect.status === 'in_progress')
              );
              defectsMap[item.id] = openDefects.length;
            }

            // Get task progress from item.task if available
            if (item.task && item.task.progress_percentage !== undefined) {
              progressMap[item.id] = item.task.progress_percentage;
            }
          } catch (error) {
            console.error(`Error loading data for item ${item.id}:`, error);
          }
        }
      }

      setItemDefects(defectsMap);
      setItemTaskProgress(progressMap);
    };

    if (items.length > 0) {
      loadDefectsAndProgress();
    }
  }, [items, projectId]);

  const handleWorkflowReject = async (item: AcceptanceItem) => {
    Alert.prompt(
      "Từ chối nghiệm thu",
      "Nhập lý do từ chối:",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
              return;
            }
            try {
              await acceptanceApi.workflowRejectItem(projectId, stage.id, item.id, reason);
              Alert.alert("Thành công", "Đã từ chối nghiệm thu");
              onRefresh();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleReject = async (item: AcceptanceItem) => {
    if (!item.can_accept) {
      Alert.alert("Lỗi", "Hạng mục chỉ được nghiệm thu sau khi hoàn thành (ngày kết thúc đã qua)");
      return;
    }

    Alert.prompt(
      "Từ chối nghiệm thu",
      "Nhập lý do từ chối:",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Không đạt",
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
              return;
            }
            try {
              await acceptanceApi.rejectItem(projectId, stage.id, item.id, reason);
              Alert.alert("Thành công", "Hạng mục đã bị từ chối nghiệm thu (Không đạt)");
              onRefresh();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối nghiệm thu");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={20}
            color="#6B7280"
          />
          <Text style={styles.headerTitle}>Hạng mục ({items.length})</Text>
          <View
            style={[
              styles.completionBadge,
              {
                backgroundColor:
                  stage.completion_percentage === 100
                    ? "#10B98120"
                    : stage.completion_percentage > 0
                      ? "#F59E0B20"
                      : "#6B728020",
              },
            ]}
          >
            <Text
              style={[
                styles.completionText,
                {
                  color:
                    stage.completion_percentage === 100
                      ? "#10B981"
                      : stage.completion_percentage > 0
                        ? "#F59E0B"
                        : "#6B7280",
                },
              ]}
            >
              {stage.completion_percentage?.toFixed(0) || 0}%
            </Text>
          </View>
        </View>
        <PermissionGuard permission="acceptance.create">
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedItem(null);
              setShowForm(true);
            }}
          >
            <Ionicons name="add" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </PermissionGuard>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.itemsContainer}>
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có hạng mục nghiệm thu</Text>
              <Text style={styles.emptySubtext}>Nhấn nút + để thêm hạng mục mới</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.itemHeader}
                  onPress={() => {
                    setSelectedItem(item);
                    setShowForm(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemHeaderLeft}>
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: getStatusColor(item.acceptance_status) + "20" },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(item.acceptance_status) },
                        ]}
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <View style={styles.itemMeta}>
                        <View style={styles.dateInfo}>
                          <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                          <Text style={styles.itemDates}>
                            {new Date(item.start_date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })} -{" "}
                            {new Date(item.end_date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.itemHeaderRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.acceptance_status) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(item.acceptance_status) },
                        ]}
                      >
                        {getStatusLabel(item.acceptance_status)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                {/* Task và Template info */}
                {(item.task || item.template) && (
                  <View style={styles.infoRow}>
                    {item.task && (
                      <View style={styles.infoItem}>
                        <Ionicons name="construct-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoText}>{item.task.name}</Text>
                      </View>
                    )}
                    {item.template && (
                      <View style={styles.infoItem}>
                        <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoText}>{item.template.name}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Workflow Status with Timeline - Bước 3: Gửi duyệt */}
                {item.workflow_status && (
                  <View style={styles.workflowStatusContainer}>
                    <View style={styles.workflowHeader}>
                      <Ionicons name="checkmark-done-outline" size={16} color="#3B82F6" />
                      <Text style={styles.workflowTitle}>Bước 3: Luồng duyệt nghiệm thu</Text>
                    </View>
                    <View style={styles.workflowTimeline}>
                      <View style={[
                        styles.workflowStep,
                        item.workflow_status !== 'draft' && styles.workflowStepCompleted
                      ]}>
                        <View style={[
                          styles.workflowStepDot,
                          item.workflow_status !== 'draft' && styles.workflowStepDotCompleted
                        ]} />
                        <Text style={[
                          styles.workflowStepLabel,
                          item.workflow_status !== 'draft' && styles.workflowStepLabelCompleted
                        ]}>1. Người lập</Text>
                      </View>
                      <View style={[
                        styles.workflowStep,
                        ['submitted', 'project_manager_approved', 'customer_approved'].includes(item.workflow_status) && styles.workflowStepCompleted
                      ]}>
                        <View style={[
                          styles.workflowStepDot,
                          ['submitted', 'project_manager_approved', 'customer_approved'].includes(item.workflow_status) && styles.workflowStepDotCompleted
                        ]} />
                        <Text style={[
                          styles.workflowStepLabel,
                          ['submitted', 'project_manager_approved', 'customer_approved'].includes(item.workflow_status) && styles.workflowStepLabelCompleted
                        ]}>2. QLDA</Text>
                      </View>
                      <View style={[
                        styles.workflowStep,
                        item.workflow_status === 'customer_approved' && styles.workflowStepCompleted
                      ]}>
                        <View style={[
                          styles.workflowStepDot,
                          item.workflow_status === 'customer_approved' && styles.workflowStepDotCompleted
                        ]} />
                        <Text style={[
                          styles.workflowStepLabel,
                          item.workflow_status === 'customer_approved' && styles.workflowStepLabelCompleted
                        ]}>3. KH/Giám sát</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.workflowStatusBadge,
                        { backgroundColor: getWorkflowStatusColor(item.workflow_status) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.workflowStatusText,
                          { color: getWorkflowStatusColor(item.workflow_status) },
                        ]}
                      >
                        {getWorkflowStatusLabel(item.workflow_status)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Defects Warning */}
                {item.task_id && itemDefects[item.id] > 0 && (
                  <View style={styles.defectsWarningContainer}>
                    <Ionicons name="warning-outline" size={16} color="#EF4444" />
                    <Text style={styles.defectsWarningText}>
                      Còn {itemDefects[item.id]} lỗi chưa được xử lý. Vui lòng xử lý tất cả lỗi trước khi duyệt nghiệm thu.
                    </Text>
                  </View>
                )}

                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}

                {item.template?.standard && (
                  <View style={styles.standardContainer}>
                    <Text style={styles.standardLabel}>Tiêu chuẩn cho phép:</Text>
                    <Text style={styles.standardText}>{item.template.standard}</Text>
                  </View>
                )}

                {item.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Ghi chú:</Text>
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                )}

                {item.rejection_reason && (
                  <View style={styles.rejectionContainer}>
                    <Text style={styles.rejectionLabel}>Lý do từ chối:</Text>
                    <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
                  </View>
                )}

                {item.approved_at && (
                  <Text style={styles.approvedText}>
                    Đã nghiệm thu: {new Date(item.approved_at).toLocaleString("vi-VN")}
                  </Text>
                )}

                {/* Attachments Section - Bước 2: Upload nghiệm thu thực tế */}
                <View style={styles.attachmentsSection}>
                  <View style={styles.attachmentsHeader}>
                    <View style={styles.attachmentsHeaderLeft}>
                      <Ionicons name="images-outline" size={16} color="#3B82F6" />
                      <View>
                        <Text style={styles.attachmentsTitle}>
                          Bước 2: Hình ảnh nghiệm thu thực tế
                        </Text>
                        <Text style={styles.attachmentsSubtitle}>
                          ({item.attachments?.length || 0} ảnh đã upload)
                        </Text>
                      </View>
                    </View>
                    {item.workflow_status === "draft" &&
                      user?.id &&
                      item.created_by?.toString() === user.id.toString() && (
                        <TouchableOpacity
                          style={styles.uploadButtonInline}
                          onPress={() => handleOpenUploadModal(item.id)}
                        >
                          <Ionicons name="add-circle-outline" size={16} color="#3B82F6" />
                          <Text style={styles.uploadButtonInlineText}>
                            {item.attachments && item.attachments.length > 0 ? "Thêm ảnh" : "Upload ảnh"}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                  {item.attachments && item.attachments.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.imagesContainer}
                      contentContainerStyle={styles.imagesScrollContent}
                    >
                      {item.attachments.map((attachment: any, index: number) => {
                        const imageUrl = attachment.file_url ||
                          attachment.url ||
                          attachment.path ||
                          attachment.file_path ||
                          (attachment.file ? attachment.file.url : null);

                        if (!imageUrl) {
                          return null;
                        }

                        return (
                          <TouchableOpacity
                            key={attachment.id || index}
                            style={styles.imageWrapper}
                            onPress={() => {
                              setPreviewImage(imageUrl);
                            }}
                          >
                            <Image
                              source={{ uri: imageUrl }}
                              style={styles.attachmentImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={styles.noImagesContainer}>
                      <Ionicons name="image-outline" size={32} color="#D1D5DB" />
                      <Text style={styles.noImagesText}>Chưa có hình ảnh</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons Section */}
                <View style={styles.itemActions}>
                  {/* Workflow Actions */}
                  {/* Người tạo hoặc admin có thể gửi duyệt */}
                  {item.workflow_status === "draft" &&
                    user?.id &&
                    (item.created_by?.toString() === user.id.toString() || isAdmin) && (
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.submitButton,
                            ((!isAdmin && (
                              itemDefects[item.id] > 0 ||
                              (item.attachments?.length || 0) === 0 ||
                              (() => {
                                // Chỉ kiểm tra task của item hiện tại
                                if (!item.task_id) return false; // Nếu không có task thì không cần kiểm tra
                                const progress = item.task?.progress_percentage ?? itemTaskProgress[item.id] ?? 0;
                                return progress < 100;
                              })()
                            )) ||
                              (isAdmin && (item.attachments?.length || 0) === 0)) && styles.disabledButton
                          ]}
                          onPress={() => {
                            // Admin có thể bypass một số validation
                            if (!isAdmin) {
                              if (itemDefects[item.id] > 0) {
                                Alert.alert(
                                  "Không thể gửi duyệt",
                                  `Còn ${itemDefects[item.id]} lỗi chưa được xử lý. Vui lòng xử lý tất cả lỗi trước khi gửi duyệt nghiệm thu.`
                                );
                                return;
                              }
                            }
                            const attachmentsCount = item.attachments?.length || 0;
                            if (attachmentsCount === 0) {
                              Alert.alert(
                                "Không thể gửi duyệt",
                                "Vui lòng upload hình ảnh thực tế nghiệm thu trước khi gửi duyệt."
                              );
                              return;
                            }
                            handleSubmit(item);
                          }}
                          disabled={
                            // Admin có thể bypass một số validation, nhưng vẫn cần có hình ảnh
                            !isAdmin && (
                              itemDefects[item.id] > 0 ||
                              (item.attachments?.length || 0) === 0 ||
                              (() => {
                                // Chỉ kiểm tra task của item hiện tại
                                if (!item.task_id) return false; // Nếu không có task thì không cần kiểm tra
                                const progress = item.task?.progress_percentage ?? itemTaskProgress[item.id] ?? 0;
                                return progress < 100;
                              })()
                            ) ||
                            // Admin vẫn cần có hình ảnh (bắt buộc)
                            (isAdmin && (item.attachments?.length || 0) === 0)
                          }
                        >
                          <Ionicons name="send-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.submitButtonText}>Gửi duyệt</Text>
                        </TouchableOpacity>
                        <View style={styles.secondaryActionsRow}>
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => {
                              setSelectedItem(item);
                              setShowForm(true);
                            }}
                          >
                            <Ionicons name="create-outline" size={18} color="#3B82F6" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => handleDeleteItem(item.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                  {item.workflow_status === "submitted" && isProjectManager && (
                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.approveButtonPrimary,
                          itemDefects[item.id] > 0 && styles.disabledButton
                        ]}
                        onPress={() => {
                          if (itemDefects[item.id] > 0) {
                            Alert.alert(
                              "Không thể duyệt",
                              `Còn ${itemDefects[item.id]} lỗi chưa được xử lý. Vui lòng xử lý tất cả lỗi trước khi duyệt nghiệm thu.`
                            );
                            return;
                          }
                          handleProjectManagerApprove(item);
                        }}
                        disabled={itemDefects[item.id] > 0}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.approveButtonTextPrimary}>Duyệt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButtonSecondary]}
                        onPress={() => handleWorkflowReject(item)}
                      >
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.rejectButtonTextSecondary}>Từ chối</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {item.workflow_status === "project_manager_approved" && (isCustomer || isProjectManager) && (
                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.approveButtonPrimary,
                          itemDefects[item.id] > 0 && styles.disabledButton
                        ]}
                        onPress={() => {
                          if (itemDefects[item.id] > 0) {
                            Alert.alert(
                              "Không thể duyệt",
                              `Còn ${itemDefects[item.id]} lỗi chưa được xử lý. Vui lòng xử lý tất cả lỗi trước khi duyệt nghiệm thu.`
                            );
                            return;
                          }
                          handleCustomerApprove(item);
                        }}
                        disabled={itemDefects[item.id] > 0}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.approveButtonTextPrimary}>Duyệt cuối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButtonSecondary]}
                        onPress={() => handleWorkflowReject(item)}
                      >
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.rejectButtonTextSecondary}>Từ chối</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Legacy approval (for backward compatibility) */}
                  {!item.workflow_status && item.can_accept && item.acceptance_status === "pending" && (
                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButtonPrimary]}
                        onPress={() => handleApprove(item)}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.approveButtonTextPrimary}>Đạt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButtonSecondary]}
                        onPress={() => handleReject(item)}
                      >
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.rejectButtonTextSecondary}>Không đạt</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <AcceptanceItemForm
        visible={showForm}
        item={selectedItem}
        projectId={projectId}
        onClose={() => {
          setShowForm(false);
          setSelectedItem(null);
        }}
        onSubmit={selectedItem ? handleUpdateItem : handleCreateItem}
      />

      {/* Upload Images Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setUploadModalVisible(false);
          setUploadingItemId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload hình ảnh nghiệm thu</Text>
              <TouchableOpacity
                onPress={() => {
                  setUploadModalVisible(false);
                  setUploadingItemId(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <UniversalFileUploader
                onUploadComplete={handleUploadComplete}
                multiple={true}
                accept="image"
                maxFiles={10}
              />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  completionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  addButton: {
    padding: 4,
  },
  itemsContainer: {
    marginTop: 8,
    gap: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 10,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemMeta: {
    marginTop: 4,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemDates: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  notesContainer: {
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#1F2937",
  },
  rejectionContainer: {
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: "#DC2626",
  },
  approvedText: {
    fontSize: 12,
    color: "#10B981",
    marginBottom: 8,
  },
  itemActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  iconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
  },
  actionButtonGroup: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  approveButtonPrimary: {
    backgroundColor: "#10B981",
  },
  approveButtonTextPrimary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rejectButtonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  rejectButtonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  editButton: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
  },
  workflowStatusContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  workflowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  workflowTimeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workflowStep: {
    flex: 1,
    alignItems: "center",
    opacity: 0.4,
  },
  workflowStepCompleted: {
    opacity: 1,
  },
  workflowStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
    marginBottom: 4,
  },
  workflowStepDotCompleted: {
    backgroundColor: "#10B981",
  },
  workflowStepLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
  },
  workflowStepLabelCompleted: {
    color: "#10B981",
    fontWeight: "600",
  },
  workflowStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  workflowStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  standardContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  standardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  standardText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 9999,
    elevation: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
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
  attachmentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  attachmentsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  attachmentsSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  uploadButtonInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
  },
  uploadButtonInlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignSelf: "center",
  },
  uploadButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
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
    width: 80,
    height: 80,
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
  noImagesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  noImagesText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  uploadingText: {
    fontSize: 14,
    color: "#6B7280",
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
  defectsWarningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  defectsWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 18,
  },
  progressWarningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  progressWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

