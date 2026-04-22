import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerInput, ScreenHeader, PermissionDenied, PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";
import {
    ProjectTask,
    CreateTaskData,
    UpdateTaskData,
    TaskStatus,
    TaskPriority,
} from "@/types/ganttTypes";
import { ganttApi } from "@/api/ganttApi";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];
const PRIORITY_LABELS: { [key in TaskPriority]: string } = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    urgent: "Khẩn cấp",
};

export default function TaskFormScreen() {
    const router = useRouter();
    const { id, taskId, parentId: initialParentId } = useLocalSearchParams<{
        id: string;
        taskId?: string;
        parentId?: string;
    }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();

    // Authorization
    const { hasPermission, loading: permsLoading } = useProjectPermissions(id);
    const canCreate = hasPermission(Permissions.PROJECT_TASK_CREATE);
    const canUpdate = hasPermission(Permissions.PROJECT_TASK_UPDATE);

    const isEditing = !!taskId;
    const isReadOnly = isEditing ? !canUpdate : !canCreate;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [task, setTask] = useState<ProjectTask | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [parentId, setParentId] = useState<number | null>(
        initialParentId ? parseInt(initialParentId) : null
    );
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [status, setStatus] = useState<TaskStatus>("not_started");
    const [progressPercentage, setProgressPercentage] = useState<string>("0");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

    // Load initial data
    useEffect(() => {
        loadData();
    }, [id, taskId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const tasksResponse = await ganttApi.getTasks(id!);
            if (tasksResponse.success) {
                setTasks(tasksResponse.data || []);
            }

            if (taskId) {
                const taskResponse = await ganttApi.getTask(id!, parseInt(taskId));
                if (taskResponse.success && taskResponse.data) {
                    const t = taskResponse.data;
                    setTask(t);
                    setName(t.name);
                    setDescription(t.description || "");
                    setParentId((t as any).parent_id || null);
                    setStartDate(t.start_date ? new Date(t.start_date) : null);
                    setEndDate(t.end_date ? new Date(t.end_date) : null);
                    setStatus(t.status);
                    setProgressPercentage(t.progress_percentage ? t.progress_percentage.toString() : "0");
                    setPriority(t.priority);
                }
            }
        } catch (error) {
            console.error("Error loading task data:", error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu công việc");
        } finally {
            setLoading(false);
        }
    };

    // Build task hierarchy for tree view
    const taskHierarchy = useMemo(() => {
        if (tasks.length === 0) return { taskMap: new Map(), rootTasks: [] };

        const taskMap = new Map<number, ProjectTask & { children: ProjectTask[] }>();
        const rootTasks: (ProjectTask & { children: ProjectTask[] })[] = [];

        // Initialize all tasks (exclude current task and its descendants if editing)
        const excludedIds = new Set<number>();
        if (task) {
            excludedIds.add(task.id);
            const getDescendants = (tId: number): number[] => {
                const descendants: number[] = [];
                tasks.forEach((t) => {
                    if ((t as any).parent_id === tId) {
                        descendants.push(t.id);
                        descendants.push(...getDescendants(t.id));
                    }
                });
                return descendants;
            };
            getDescendants(task.id).forEach((id) => excludedIds.add(id));
        }

        tasks
            .filter((t) => !excludedIds.has(t.id))
            .forEach((t) => {
                taskMap.set(t.id, { ...t, children: [] });
            });

        // Build hierarchy
        taskMap.forEach((taskWithChildren) => {
            const pId = (taskWithChildren as any).parent_id;
            if (pId && taskMap.has(pId)) {
                const parent = taskMap.get(pId)!;
                parent.children.push(taskWithChildren);
            } else {
                rootTasks.push(taskWithChildren);
            }
        });

        return { taskMap, rootTasks };
    }, [tasks, task]);

    const toggleTask = (tId: number) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(tId)) {
            newExpanded.delete(tId);
        } else {
            newExpanded.add(tId);
        }
        setExpandedTasks(newExpanded);
    };

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
                        isReadOnly && { opacity: 0.6 }
                    ]}
                    onPress={() => !isReadOnly && setParentId(taskNode.id)}
                    disabled={isReadOnly}
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
                        </View>
                        {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                        )}
                    </View>
                </TouchableOpacity>
                {hasChildren && isExpanded && (
                    <View style={styles.treeChildren}>
                        {children.map((child) => renderTreeNode(child as ProjectTask & { children: ProjectTask[] }, level + 1))}
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
            const data: CreateTaskData | UpdateTaskData = {
                name: name.trim(),
                description: description.trim() || undefined,
                parent_id: parentId || undefined,
                start_date: startDate?.toISOString().split("T")[0],
                end_date: endDate?.toISOString().split("T")[0],
                priority,
                status,
                progress_percentage: parseFloat(progressPercentage) || 0,
            };

            let response;
            if (taskId && task) {
                response = await ganttApi.updateTask(id!, task.id, data);
            } else {
                response = await ganttApi.createTask(id!, data as CreateTaskData);
            }

            if (response.success) {
                Alert.alert(
                    "Thành công",
                    taskId ? "Cập nhật công việc thành công" : "Tạo công việc thành công",
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else {
                throw new Error(response.message || "Không thể lưu công việc");
            }
        } catch (error: any) {
            Alert.alert(
                "Lỗi",
                error.response?.data?.message || error.message || "Có lỗi xảy ra"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!task) return;
        Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa công việc này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa",
                style: "destructive",
                onPress: async () => {
                    try {
                        const response = await ganttApi.deleteTask(id!, task.id);
                        if (response.success) {
                            Alert.alert("Thành công", "Đã xóa công việc", [
                                { text: "OK", onPress: () => router.back() },
                            ]);
                        } else {
                            Alert.alert("Lỗi", response.message || "Không thể xóa công việc");
                        }
                    } catch (error: any) {
                        Alert.alert(
                            "Lỗi",
                            error.response?.data?.message || "Không thể xóa công việc"
                        );
                    }
                },
            },
        ]);
    };

    if (permsLoading || loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader
                    title={taskId ? "Sửa công việc" : "Tạo công việc"}
                    showBackButton
                />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    // If trying to create but no permission
    if (!isEditing && !canCreate) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Tạo công việc" showBackButton />
                <PermissionDenied message="Bạn không có quyền tạo công việc mới trong dự án này." />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={taskId ? (isReadOnly ? "Chi tiết công việc" : "Sửa công việc") : "Tạo công việc"}
                showBackButton
                rightComponent={
                    taskId ? (
                        <PermissionGuard permission={Permissions.PROJECT_TASK_DELETE} projectId={id}>
                            <TouchableOpacity onPress={handleDelete} style={styles.deleteButtonHeader}>
                                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </PermissionGuard>
                    ) : undefined
                }
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
            >
                <View style={styles.card}>
                    {/* Name */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Tên công việc *</Text>
                        <TextInput
                            style={[styles.input, isReadOnly && styles.readOnlyInput]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Nhập tên công việc"
                            editable={!isReadOnly}
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Mô tả</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, isReadOnly && styles.readOnlyInput]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Nhập mô tả"
                            multiline
                            numberOfLines={3}
                            editable={!isReadOnly}
                        />
                    </View>

                    {/* Dates */}
                    <DatePickerInput
                        label="Ngày bắt đầu"
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Chọn ngày bắt đầu"
                        containerStyle={styles.field}
                        disabled={isReadOnly}
                    />

                    <DatePickerInput
                        label="Ngày kết thúc"
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="Chọn ngày kết thúc"
                        minimumDate={startDate || undefined}
                        containerStyle={styles.field}
                        disabled={isReadOnly}
                    />

                    {/* Status */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Trạng thái tiến độ</Text>
                        <View style={styles.optionsRow}>
                            {[
                                { value: "not_started", label: "Chưa bắt đầu" },
                                { value: "in_progress", label: "Đang thực hiện" },
                                { value: "completed", label: "Hoàn thành" },
                                { value: "delayed", label: "Trễ tiến độ" },
                                { value: "on_hold", label: "Tạm dừng" }
                            ].map((s) => (
                                <TouchableOpacity
                                    key={s.value}
                                    style={[
                                        styles.optionButton,
                                        status === s.value && styles.optionButtonActive,
                                        isReadOnly && { opacity: 0.8 }
                                    ]}
                                    onPress={() => {
                                        if (!isReadOnly) {
                                            setStatus(s.value as TaskStatus);
                                            if (s.value === "completed") {
                                                setProgressPercentage("100");
                                            } else if (s.value === "not_started") {
                                                setProgressPercentage("0");
                                            }
                                        }
                                    }}
                                    activeOpacity={isReadOnly ? 1 : 0.7}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            status === s.value && styles.optionTextActive,
                                        ]}
                                    >
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Progress Percentage */}
                    <View style={styles.field}>
                        <Text style={styles.label}>% Hoàn thành</Text>
                        <View style={styles.progressInputContainer}>
                            <TextInput
                                style={[styles.input, styles.progressInput, isReadOnly && styles.readOnlyInput]}
                                value={progressPercentage}
                                onChangeText={(val) => {
                                    // limit to numbers and max 100
                                    const numStr = val.replace(/[^0-9]/g, '');
                                    let num = parseInt(numStr, 10);
                                    if (isNaN(num)) num = 0;
                                    if (num > 100) num = 100;
                                    setProgressPercentage(num.toString());
                                }}
                                keyboardType="numeric"
                                editable={!isReadOnly}
                            />
                            <Text style={styles.percentageSymbol}>%</Text>
                        </View>
                        {!isReadOnly && (
                            <Text style={styles.helpText}>
                                Từ 0 đến 100. Khi cập nhật trạng thái, % completion sẽ được tính toán tự động.
                            </Text>
                        )}
                    </View>

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
                                        isReadOnly && { opacity: 0.8 }
                                    ]}
                                    onPress={() => !isReadOnly && setPriority(p)}
                                    activeOpacity={isReadOnly ? 1 : 0.7}
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

                    {/* Parent Task Tree */}
                    {tasks.length > 0 && (
                        <View style={styles.field}>
                            <Text style={styles.label}>Công việc cha (tùy chọn)</Text>
                            <View style={[styles.treeContainer, isReadOnly && { backgroundColor: '#F9FAFB' }]}>
                                <TouchableOpacity
                                    style={[
                                        styles.treeNode,
                                        styles.treeNodeRoot,
                                        parentId === null && styles.treeNodeSelected,
                                        isReadOnly && { opacity: 0.6 }
                                    ]}
                                    onPress={() => !isReadOnly && setParentId(null)}
                                    disabled={isReadOnly}
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
                                    {taskHierarchy.rootTasks.map((rootTask) =>
                                        renderTreeNode(rootTask, 0)
                                    )}
                                </ScrollView>
                            </View>
                            {!isReadOnly && (
                                <Text style={styles.helpText}>
                                    Chọn công việc cha để tạo cấu trúc phân cấp (WBS).
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Acceptance Stages Info (Read Only Link) */}
                    {task && (task as any).acceptanceStages?.length > 0 && (
                        <View style={styles.field}>
                            <Text style={styles.label}>
                                Giai đoạn nghiệm thu ({(task as any).acceptanceStages.length})
                            </Text>
                            <TouchableOpacity
                                style={styles.acceptanceLink}
                                onPress={() => router.push(`/projects/${id}/acceptance`)}
                            >
                                <Text style={styles.acceptanceLinkText}>Xem chi tiết nghiệm thu</Text>
                                <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {!isReadOnly && (
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {taskId ? "Cập nhật công việc" : "Tạo công việc"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
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
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
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
    readOnlyInput: {
        backgroundColor: "#F3F4F6",
        color: "#6B7280",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
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
    treeContainer: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        maxHeight: 250,
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
        width: 24,
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
    helpText: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
        fontStyle: "italic",
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
    },
    progressInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    progressInput: {
        flex: 1,
    },
    percentageSymbol: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    deleteButtonHeader: {
        padding: 4,
    },
    acceptanceLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE'
    },
    acceptanceLinkText: {
        color: '#3B82F6',
        fontWeight: '500',
        fontSize: 14
    }
});
