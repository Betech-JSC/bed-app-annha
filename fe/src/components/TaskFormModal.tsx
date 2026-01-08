import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ProjectTask,
  CreateTaskData,
  UpdateTaskData,
  TaskStatus,
  TaskPriority,
} from "@/types/ganttTypes";
interface TaskFormModalProps {
  visible: boolean;
  task?: ProjectTask | null;
  tasks?: ProjectTask[]; // For parent task selection - parent tasks act as "phases"
  projectId?: string; // For navigation to acceptance
  onClose: () => void;
  onSubmit: (data: CreateTaskData | UpdateTaskData) => Promise<void>;
}

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];

// BUSINESS RULE: Only these statuses are allowed (auto-calculated)
const STATUS_LABELS: { [key: string]: string } = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  delayed: "Trễ tiến độ",
};

const PRIORITY_LABELS: { [key in TaskPriority]: string } = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};

export default function TaskFormModal({
  visible,
  task,
  tasks = [],
  projectId,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  // BUSINESS RULE: progress_percentage and status are NOT editable
  // They are calculated from Daily Logs and dates automatically
  const [progress, setProgress] = useState(0); // Display only
  const [status, setStatus] = useState<TaskStatus>("not_started"); // Display only
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || "");
      setParentId((task as any).parent_id || null); // For hierarchical structure - parent tasks act as "phases"
      setStartDate(task.start_date ? new Date(task.start_date) : null);
      setEndDate(task.end_date ? new Date(task.end_date) : null);
      setProgress(task.progress_percentage != null && typeof task.progress_percentage === 'number'
        ? task.progress_percentage
        : 0); // Display only
      setStatus(task.status); // Display only
      setPriority(task.priority);
    } else {
      resetForm();
    }
  }, [task, visible]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setParentId(null);
    setStartDate(null);
    setEndDate(null);
    setProgress(0);
    setStatus("not_started");
    setPriority("medium");
    setExpandedTasks(new Set());
  };

  // Build task hierarchy for tree view
  const taskHierarchy = useMemo(() => {
    if (tasks.length === 0) return { taskMap: new Map(), rootTasks: [] };

    const taskMap = new Map<number, ProjectTask & { children: ProjectTask[] }>();
    const rootTasks: (ProjectTask & { children: ProjectTask[] })[] = [];

    // Initialize all tasks (exclude current task and its descendants)
    const excludedIds = new Set<number>();
    if (task) {
      excludedIds.add(task.id);
      // Get all descendant IDs
      const getDescendants = (taskId: number): number[] => {
        const descendants: number[] = [];
        tasks.forEach(t => {
          if ((t as any).parent_id === taskId) {
            descendants.push(t.id);
            descendants.push(...getDescendants(t.id));
          }
        });
        return descendants;
      };
      getDescendants(task.id).forEach(id => excludedIds.add(id));
    }

    tasks
      .filter(t => !excludedIds.has(t.id))
      .forEach(t => {
        taskMap.set(t.id, { ...t, children: [] });
      });

    // Build hierarchy
    taskMap.forEach((taskWithChildren, taskId) => {
      const parentId = (taskWithChildren as any).parent_id;
      if (parentId && taskMap.has(parentId)) {
        const parent = taskMap.get(parentId)!;
        parent.children.push(taskWithChildren);
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return { taskMap, rootTasks };
  }, [tasks, task]);

  const toggleTask = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Render tree node
  const renderTreeNode = (
    taskNode: ProjectTask & { children: ProjectTask[] },
    level: number = 0
  ) => {
    const children = taskNode.children || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(taskNode.id);
    const isSelected = parentId === taskNode.id;

    return (
      <View key={taskNode.id}>
        <TouchableOpacity
          style={[
            styles.treeNode,
            { paddingLeft: 12 + level * 24 },
            isSelected && styles.treeNodeSelected,
          ]}
          onPress={() => setParentId(taskNode.id)}
        >
          <View style={styles.treeNodeContent}>
            {hasChildren ? (
              <TouchableOpacity
                onPress={() => toggleTask(taskNode.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-forward"}
                  size={16}
                  color="#6B7280"
                  style={styles.treeExpandIcon}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.treeExpandIcon} />
            )}
            <View style={styles.treeNodeInfo}>
              <Text
                style={[
                  styles.treeNodeName,
                  isSelected && styles.treeNodeNameSelected,
                ]}
                numberOfLines={1}
              >
                {taskNode.name}
              </Text>
              {taskNode.description && (
                <Text style={styles.treeNodeDescription} numberOfLines={1}>
                  {taskNode.description}
                </Text>
              )}
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            )}
          </View>
        </TouchableOpacity>
        {hasChildren && isExpanded && (
          <View style={styles.treeChildren}>
            {children.map((child: ProjectTask & { children: ProjectTask[] }) => renderTreeNode(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên công việc");
      return;
    }

    try {
      setSubmitting(true);
      // BUSINESS RULE: progress_percentage and status are NOT sent to API
      // They are calculated from Daily Logs and dates automatically
      const data: CreateTaskData | UpdateTaskData = {
        name: name.trim(),
        description: description.trim() || undefined,
        parent_id: parentId || undefined, // For hierarchical structure - parent tasks act as "phases"
        start_date: startDate?.toISOString().split("T")[0],
        end_date: endDate?.toISOString().split("T")[0],
        // progress_percentage: REMOVED - calculated from logs only
        // status: REMOVED - auto-calculated based on dates and progress
        priority,
      };

      await onSubmit(data);
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu công việc"
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
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {task ? "Sửa công việc" : "Tạo công việc mới"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên công việc *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên công việc"
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Nhập mô tả"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Dates */}
            <View style={styles.field}>
              <Text style={styles.label}>Ngày bắt đầu</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {startDate
                    ? startDate.toLocaleDateString("vi-VN")
                    : "Chọn ngày"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) setStartDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ngày kết thúc</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {endDate ? endDate.toLocaleDateString("vi-VN") : "Chọn ngày"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={startDate || undefined}
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>

            {/* Parent Task (Tree View) */}
            {tasks.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.label}>Công việc cha (tùy chọn)</Text>
                <View style={styles.treeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.treeNode,
                      styles.treeNodeRoot,
                      parentId === null && styles.treeNodeSelected,
                    ]}
                    onPress={() => setParentId(null)}
                  >
                    <View style={styles.treeNodeContent}>
                      <View style={styles.treeExpandIcon} />
                      <View style={styles.treeNodeInfo}>
                        <Text
                          style={[
                            styles.treeNodeName,
                            parentId === null && styles.treeNodeNameSelected,
                          ]}
                        >
                          Không có công việc cha
                        </Text>
                        <Text style={styles.treeNodeDescription}>
                          Tạo công việc ở cấp gốc
                        </Text>
                      </View>
                      {parentId === null && (
                        <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <ScrollView
                    style={styles.treeScrollView}
                    nestedScrollEnabled={true}
                  >
                    {taskHierarchy.rootTasks.map(rootTask =>
                      renderTreeNode(rootTask, 0)
                    )}
                  </ScrollView>
                </View>
                <Text style={styles.helpText}>
                  Chọn công việc cha để tạo cấu trúc phân cấp (WBS). Công việc cha đóng vai trò như "giai đoạn". Nhấn vào mũi tên để mở rộng/thu gọn.
                </Text>
              </View>
            )}

            {/* Acceptance Stages - Show linked acceptance stages */}
            {task && (() => {
              const stages = (task as any).acceptanceStages || [];
              if (stages.length > 0) {
                return (
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      Giai đoạn nghiệm thu{" "}
                      <Text style={styles.readOnlyLabel}>({stages.length})</Text>
                    </Text>
                    <View style={styles.acceptanceStagesContainer}>
                      {stages.map((stage: any) => (
                        <TouchableOpacity
                          key={stage.id}
                          style={styles.acceptanceStageItem}
                          onPress={() => {
                            // Navigate to acceptance screen
                            if (onClose) {
                              onClose();
                            }
                            if (projectId) {
                              router.push(`/projects/${projectId}/acceptance`);
                            }
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                          <View style={styles.acceptanceStageInfo}>
                            <Text style={styles.acceptanceStageName}>{stage.name}</Text>
                            {stage.status && (
                              <Text style={styles.acceptanceStageStatus}>
                                {stage.status === 'customer_approved' ? 'Đã duyệt' :
                                  stage.status === 'project_manager_approved' ? 'QL dự án đã duyệt' :
                                    stage.status === 'supervisor_approved' ? 'Giám sát đã duyệt' :
                                      stage.status === 'pending' ? 'Chờ duyệt' :
                                        stage.status === 'rejected' ? 'Từ chối' : stage.status}
                              </Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.helpText}>
                      Nhấn vào giai đoạn nghiệm thu để xem chi tiết
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            {/* Progress & Status - READ ONLY (only show when editing) */}
            {task && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Tiến độ{" "}
                    <Text style={styles.readOnlyLabel}>(Tự động tính)</Text>
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${progress}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Trạng thái{" "}
                    <Text style={styles.readOnlyLabel}>(Tự động tính)</Text>
                  </Text>
                  <View style={styles.readOnlyStatusContainer}>
                    <Text style={styles.readOnlyStatusText}>
                      {STATUS_LABELS[status] || status}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Priority */}
            <View style={styles.field}>
              <Text style={styles.label}>Độ ưu tiên</Text>
              <View style={styles.optionsRow}>
                {PRIORITY_OPTIONS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.optionButton,
                      priority === p && styles.optionButtonActive,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        priority === p && styles.optionTextActive,
                      ]}
                    >
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

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
      </View>
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
  content: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
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
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    minWidth: 50,
    textAlign: "right",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  optionButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  optionTextActive: {
    color: "#FFFFFF",
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
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6B7280",
    fontStyle: "italic",
  },
  readOnlyInput: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  readOnlyStatusContainer: {
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  readOnlyStatusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  helpText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  treeContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    maxHeight: 200,
    overflow: "hidden",
  },
  treeScrollView: {
    maxHeight: 200,
  },
  treeNode: {
    paddingVertical: 10,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  treeNodeRoot: {
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  treeNodeSelected: {
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  treeNodeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  treeExpandIcon: {
    width: 20,
    alignItems: "center",
  },
  treeNodeInfo: {
    flex: 1,
  },
  treeNodeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  treeNodeNameSelected: {
    color: "#3B82F6",
  },
  treeNodeDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  treeChildren: {
    backgroundColor: "#F9FAFB",
  },
  acceptanceStagesContainer: {
    gap: 8,
  },
  acceptanceStageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3B82F620",
  },
  acceptanceStageInfo: {
    flex: 1,
  },
  acceptanceStageName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  acceptanceStageStatus: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  phaseWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    padding: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F59E0B30",
  },
  phaseWarningText: {
    fontSize: 12,
    color: "#F59E0B",
    flex: 1,
  },
});

