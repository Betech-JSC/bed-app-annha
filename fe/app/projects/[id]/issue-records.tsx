import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { issueRecordApi, IssueRecord, CreateIssueRecordData } from "@/api/issueRecordApi";
import { acceptanceApi, AcceptanceStage, AcceptanceItem } from "@/api/acceptanceApi";
import { ganttApi, ProjectTask } from "@/api/ganttApi";

export default function IssueRecordsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [issueRecords, setIssueRecords] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueRecord | null>(null);
  const [stages, setStages] = useState<AcceptanceStage[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterStageId, setFilterStageId] = useState<number | undefined>(undefined);

  // Form state
  const [formData, setFormData] = useState<CreateIssueRecordData>({
    acceptance_stage_id: 0,
    acceptance_item_id: undefined,
    task_id: undefined,
    title: "",
    description: "",
    severity: "medium",
    assigned_to: undefined,
  });

  useEffect(() => {
    loadIssueRecords();
    loadStages();
    loadTasks();
  }, [id, filterStatus, filterStageId]);

  const loadIssueRecords = async () => {
    try {
      setLoading(true);
      const response = await issueRecordApi.getIssueRecords(id!, {
        status: filterStatus,
        acceptance_stage_id: filterStageId,
      });
      if (response.success) {
        setIssueRecords(response.data || []);
      }
    } catch (error) {
      console.error("Error loading issue records:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const loadTasks = async () => {
    try {
      // BUSINESS RULE: Only load parent tasks (A)
      const response = await ganttApi.getTasks(id!);
      if (response.success) {
        const allTasks = response.data || [];
        // Filter to only show parent tasks (tasks without parent_id)
        const parentTasks = allTasks.filter((task: ProjectTask) => !task.parent_id);
        setTasks(parentTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề lỗi");
      return;
    }

    if (!formData.acceptance_stage_id) {
      Alert.alert("Lỗi", "Vui lòng chọn giai đoạn nghiệm thu");
      return;
    }

    try {
      await issueRecordApi.create(id!, formData);
      Alert.alert("Thành công", "Đã tạo lỗi nghiệm thu");
      setShowCreateModal(false);
      resetForm();
      loadIssueRecords();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo lỗi nghiệm thu");
    }
  };

  const handleUpdate = async (issueId: number, data: Partial<IssueRecord>) => {
    try {
      await issueRecordApi.update(id!, issueId, data);
      Alert.alert("Thành công", "Đã cập nhật lỗi nghiệm thu");
      setShowDetailModal(false);
      setSelectedIssue(null);
      loadIssueRecords();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật lỗi nghiệm thu");
    }
  };

  const handleResolve = async (issueId: number, resolutionNotes?: string) => {
    try {
      await issueRecordApi.resolve(id!, issueId, resolutionNotes);
      Alert.alert("Thành công", "Đã khắc phục lỗi nghiệm thu");
      setShowDetailModal(false);
      setSelectedIssue(null);
      loadIssueRecords();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể khắc phục lỗi nghiệm thu");
    }
  };

  const handleDelete = async (issueId: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa lỗi nghiệm thu này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await issueRecordApi.delete(id!, issueId);
              Alert.alert("Thành công", "Đã xóa lỗi nghiệm thu");
              loadIssueRecords();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa lỗi nghiệm thu");
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      acceptance_stage_id: 0,
      acceptance_item_id: undefined,
      task_id: undefined,
      title: "",
      description: "",
      severity: "medium",
      assigned_to: undefined,
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "in_progress":
        return "#F59E0B";
      case "cancelled":
        return "#6B7280";
      default:
        return "#EF4444";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "open":
        return "Mở";
      case "in_progress":
        return "Đang xử lý";
      case "completed":
        return "Đã khắc phục";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "critical":
        return "#DC2626";
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      default:
        return "#10B981";
    }
  };

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case "critical":
        return "Nghiêm trọng";
      case "high":
        return "Cao";
      case "medium":
        return "Trung bình";
      case "low":
        return "Thấp";
      default:
        return severity;
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openDetailModal = (issue: IssueRecord) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
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
      <ScreenHeader title="Lỗi Nghiệm Thu (IssueRecord)" showBackButton />

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, !filterStatus && styles.filterButtonActive]}
            onPress={() => setFilterStatus(undefined)}
          >
            <Text style={[styles.filterText, !filterStatus && styles.filterTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === "open" && styles.filterButtonActive]}
            onPress={() => setFilterStatus("open")}
          >
            <Text style={[styles.filterText, filterStatus === "open" && styles.filterTextActive]}>
              Mở
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === "in_progress" && styles.filterButtonActive]}
            onPress={() => setFilterStatus("in_progress")}
          >
            <Text style={[styles.filterText, filterStatus === "in_progress" && styles.filterTextActive]}>
              Đang xử lý
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === "completed" && styles.filterButtonActive]}
            onPress={() => setFilterStatus("completed")}
          >
            <Text style={[styles.filterText, filterStatus === "completed" && styles.filterTextActive]}>
              Đã khắc phục
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Create Button */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Tạo lỗi nghiệm thu</Text>
        </TouchableOpacity>
      </View>

      {/* Issue Records List */}
      <FlatList
        data={issueRecords}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.issueCard}
            onPress={() => openDetailModal(item)}
            activeOpacity={0.7}
          >
            <View style={styles.issueHeader}>
              <View style={styles.issueHeaderLeft}>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(item.severity) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.severityText,
                      { color: getSeverityColor(item.severity) },
                    ]}
                  >
                    {getSeverityLabel(item.severity)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + "20" },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: getStatusColor(item.status) }]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
            <Text style={styles.issueTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.issueDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.issueMeta}>
              {item.acceptance_stage && (
                <View style={styles.metaItem}>
                  <Ionicons name="layers-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{item.acceptance_stage.name}</Text>
                </View>
              )}
              {item.task && (
                <View style={styles.metaItem}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{item.task.name}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bug-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có lỗi nghiệm thu</Text>
            <Text style={styles.emptySubtext}>
              Nhấn nút "Tạo lỗi nghiệm thu" để bắt đầu
            </Text>
          </View>
        }
      />

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo lỗi nghiệm thu</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Giai đoạn nghiệm thu <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    // Show stage picker
                    Alert.alert(
                      "Chọn giai đoạn",
                      "Chọn giai đoạn nghiệm thu:",
                      [
                        ...stages.map((stage) => ({
                          text: stage.name,
                          onPress: () => {
                            setFormData({ ...formData, acceptance_stage_id: stage.id });
                          },
                        })),
                        { text: "Hủy", style: "cancel" },
                      ]
                    );
                  }}
                >
                  <Text style={styles.selectText}>
                    {formData.acceptance_stage_id
                      ? stages.find((s) => s.id === formData.acceptance_stage_id)?.name ||
                      "Chọn giai đoạn"
                      : "Chọn giai đoạn nghiệm thu"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Công việc</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    // Show task picker (only parent tasks)
                    Alert.alert(
                      "Chọn công việc",
                      "Chọn công việc cha:",
                      [
                        ...tasks.map((task) => ({
                          text: task.name,
                          onPress: () => {
                            setFormData({ ...formData, task_id: task.id });
                          },
                        })),
                        {
                          text: "Không chọn",
                          onPress: () => {
                            setFormData({ ...formData, task_id: undefined });
                          },
                        },
                        { text: "Hủy", style: "cancel" },
                      ]
                    );
                  }}
                >
                  <Text style={styles.selectText}>
                    {formData.task_id
                      ? tasks.find((t) => t.id === formData.task_id)?.name || "Chọn công việc"
                      : "Không chọn"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tiêu đề <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tiêu đề lỗi"
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập mô tả chi tiết"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={4}
                />
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
                        {
                          borderColor:
                            formData.severity === severity
                              ? getSeverityColor(severity)
                              : "#D1D5DB",
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, severity })}
                    >
                      <Text
                        style={[
                          styles.severityButtonText,
                          formData.severity === severity && {
                            color: getSeverityColor(severity),
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {getSeverityLabel(severity)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreate}
                >
                  <Text style={styles.saveButtonText}>Tạo</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedIssue(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết lỗi nghiệm thu</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedIssue(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedIssue && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Tiêu đề</Text>
                    <Text style={styles.detailValue}>{selectedIssue.title}</Text>
                  </View>

                  {selectedIssue.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Mô tả</Text>
                      <Text style={styles.detailValue}>{selectedIssue.description}</Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Trạng thái</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(selectedIssue.status) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(selectedIssue.status) },
                        ]}
                      >
                        {getStatusLabel(selectedIssue.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Mức độ nghiêm trọng</Text>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: getSeverityColor(selectedIssue.severity) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          { color: getSeverityColor(selectedIssue.severity) },
                        ]}
                      >
                        {getSeverityLabel(selectedIssue.severity)}
                      </Text>
                    </View>
                  </View>

                  {selectedIssue.acceptance_stage && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Giai đoạn nghiệm thu</Text>
                      <Text style={styles.detailValue}>
                        {selectedIssue.acceptance_stage.name}
                      </Text>
                    </View>
                  )}

                  {selectedIssue.task && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Công việc (Category A)</Text>
                      <Text style={styles.detailValue}>{selectedIssue.task.name}</Text>
                    </View>
                  )}

                  {selectedIssue.resolution_notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Ghi chú khắc phục</Text>
                      <Text style={styles.detailValue}>
                        {selectedIssue.resolution_notes}
                      </Text>
                    </View>
                  )}

                  {selectedIssue.resolved_at && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Ngày khắc phục</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedIssue.resolved_at).toLocaleDateString("vi-VN")}
                      </Text>
                    </View>
                  )}

                  {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Hình ảnh đính kèm</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedIssue.attachments.map((attachment, index) => (
                          <View key={attachment.id || index} style={styles.imageItem}>
                            <Image
                              source={{
                                uri:
                                  attachment.file_url ||
                                  (attachment.file_path
                                    ? `http://localhost:8000/storage/${attachment.file_path}`
                                    : ""),
                              }}
                              style={styles.detailImage}
                              resizeMode="cover"
                            />
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.detailActions}>
                    {selectedIssue.status !== "completed" && (
                      <>
                        {selectedIssue.status === "open" && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.inProgressButton]}
                            onPress={() => {
                              handleUpdate(selectedIssue.id, { status: "in_progress" });
                            }}
                          >
                            <Ionicons name="play-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Bắt đầu xử lý</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.actionButton, styles.resolveButton]}
                          onPress={() => {
                            Alert.prompt(
                              "Khắc phục lỗi",
                              "Nhập ghi chú khắc phục:",
                              [
                                { text: "Hủy", style: "cancel" },
                                {
                                  text: "Khắc phục",
                                  onPress: (notes) => {
                                    handleResolve(selectedIssue.id, notes);
                                  },
                                },
                              ],
                              "plain-text"
                            );
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Khắc phục</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(selectedIssue.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  filtersContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
  },
  filterText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerActions: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  issueCard: {
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
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  issueHeaderLeft: {
    flexDirection: "row",
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  issueDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  issueMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
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
    height: 100,
    textAlignVertical: "top",
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
  selectText: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  severityButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  severityButton: {
    flex: 1,
    minWidth: "22%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  severityButtonActive: {
    backgroundColor: "#EFF6FF",
  },
  severityButtonText: {
    fontSize: 14,
    color: "#6B7280",
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
  detailSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  detailActions: {
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 8,
  },
  inProgressButton: {
    backgroundColor: "#F59E0B",
  },
  resolveButton: {
    backgroundColor: "#10B981",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  imageItem: {
    marginRight: 12,
  },
  detailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
});


