import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { budgetApi, ProjectBudget, CreateBudgetData, BudgetItem } from "@/api/budgetApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function BudgetDetailScreen() {
    const router = useRouter();
    const { id, budgetId } = useLocalSearchParams<{ id: string; budgetId: string }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();
    const { hasPermission } = useProjectPermissions(id || null);
    const [budget, setBudget] = useState<ProjectBudget | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [comparisonData, setComparisonData] = useState<any>(null);
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [activeTab, setActiveTab] = useState<"overview" | "items" | "groups">("overview");
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        loadBudget();
        loadComparison();
    }, [id, budgetId]);

    // Reload data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (budgetId) {
                loadBudget();
                loadComparison();
            }
        }, [id, budgetId])
    );

    const loadComparison = async () => {
        try {
            const response = await budgetApi.compareWithActual(Number(id), Number(budgetId));
            if (response.success) {
                setComparisonData(response.data);
            }
        } catch (error) {
            console.error("Error loading comparison:", error);
        }
    };

    const loadBudget = async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            setPermissionMessage("");
            const response = await budgetApi.getBudget(Number(id), Number(budgetId));
            if (response.success) {
                setBudget(response.data);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem chi tiết ngân sách này.");
            } else {
                const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải ngân sách";
                Alert.alert("Lỗi", errorMessage);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ====== Workflow Actions ======

    const handleSubmitForApproval = () => {
        Alert.alert(
            "Gửi duyệt",
            "Bạn có chắc chắn muốn gửi ngân sách này để duyệt?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Gửi duyệt",
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await budgetApi.submitForApproval(Number(id), Number(budgetId));
                            if (response.success) {
                                Alert.alert("Thành công", response.message);
                                setBudget(response.data);
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi duyệt");
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleApprove = () => {
        Alert.alert(
            "Duyệt ngân sách",
            "Bạn có chắc chắn muốn duyệt ngân sách này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Duyệt",
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await budgetApi.approve(Number(id), Number(budgetId));
                            if (response.success) {
                                Alert.alert("Thành công", response.message);
                                setBudget(response.data);
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
            return;
        }
        try {
            setActionLoading(true);
            const response = await budgetApi.reject(Number(id), Number(budgetId), rejectReason);
            if (response.success) {
                setShowRejectModal(false);
                setRejectReason("");
                Alert.alert("Thành công", response.message);
                setBudget(response.data);
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối");
        } finally {
            setActionLoading(false);
        }
    };

    const handleActivate = () => {
        Alert.alert(
            "Áp dụng ngân sách",
            "Ngân sách sẽ được áp dụng cho dự án. Bạn có chắc chắn?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Áp dụng",
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await budgetApi.activate(Number(id), Number(budgetId));
                            if (response.success) {
                                Alert.alert("Thành công", response.message);
                                setBudget(response.data);
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể áp dụng");
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleArchive = () => {
        Alert.alert(
            "Lưu trữ ngân sách",
            "Ngân sách sẽ được lưu trữ và không thể chỉnh sửa. Bạn có chắc chắn?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Lưu trữ",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await budgetApi.archive(Number(id), Number(budgetId));
                            if (response.success) {
                                Alert.alert("Thành công", response.message);
                                setBudget(response.data);
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể lưu trữ");
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadBudget();
        loadComparison();
    };

    const toggleItemExpand = (itemId: number) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
        }
        setExpandedItems(newExpanded);
    };

    // Get item comparison data
    const getItemComparison = (itemId: number) => {
        if (!comparisonData?.items) return null;
        return comparisonData.items.find((i: any) => i.id === itemId);
    };


    const handleDelete = () => {
        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xóa ngân sách này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await budgetApi.deleteBudget(Number(id), Number(budgetId));
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa ngân sách");
                                router.back();
                            }
                        } catch (error: any) {
                            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể xóa ngân sách";
                            Alert.alert("Lỗi", errorMessage);
                        }
                    },
                },
            ]
        );
    };

    const handleAddItem = () => {
        router.push(`/projects/${id}/budget/${budgetId}/items/create`);
    };

    const handleEditItem = (item: BudgetItem) => {
        router.push(`/projects/${id}/budget/${budgetId}/items/${item.id}/edit`);
    };


    const handleDeleteItem = (itemId: number) => {
        if (!budget) {
            Alert.alert("Lỗi", "Không tìm thấy ngân sách");
            return;
        }

        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xóa hạng mục này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const currentItems = budget.items || [];
                            const updatedItems = currentItems.filter(i => i.id !== itemId);

                            const response = await budgetApi.updateBudget(Number(id), Number(budgetId), {
                                items: updatedItems.map(item => ({
                                    name: item.name,
                                    cost_group_id: item.cost_group_id,
                                    description: item.description,
                                    estimated_amount: item.estimated_amount,
                                    quantity: item.quantity,
                                    unit_price: item.unit_price,
                                }))
                            });

                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa hạng mục");
                                loadBudget();
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa hạng mục");
                        }
                    },
                },
            ]
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const handleExport = async () => {
        if (!budget) return;

        try {
            // Generate text report
            let report = `BÁO CÁO NGÂN SÁCH DỰ ÁN\n`;
            report += `================================\n\n`;
            report += `Tên ngân sách: ${budget.name}\n`;
            if (budget.version) report += `Phiên bản: v${budget.version}\n`;
            report += `Ngày lập: ${new Date(budget.budget_date).toLocaleDateString("vi-VN")}\n`;
            report += `Trạng thái: ${budget.status === "approved" ? "Đã duyệt" : budget.status === "active" ? "Đang áp dụng" : budget.status === "archived" ? "Đã lưu trữ" : "Nháp"}\n`;
            report += `Tổng ngân sách: ${formatCurrency(budget.total_budget)}\n`;
            report += `Ngân sách còn lại: ${formatCurrency(budget.remaining_budget)}\n`;
            if (budget.notes) report += `Ghi chú: ${budget.notes}\n`;
            report += `\n================================\n`;
            report += `DANH SÁCH HẠNG MỤC\n`;
            report += `================================\n\n`;

            if (budget.items && budget.items.length > 0) {
                budget.items.forEach((item, index) => {
                    report += `${index + 1}. ${item.name}\n`;
                    if (item.cost_group) report += `   Nhóm chi phí: ${item.cost_group.name}\n`;
                    if (item.description) report += `   Mô tả: ${item.description}\n`;
                    report += `   Số tiền ước tính: ${formatCurrency(item.estimated_amount)}\n`;
                    if (item.quantity && item.unit_price) {
                        report += `   Số lượng: ${item.quantity}\n`;
                        report += `   Đơn giá: ${formatCurrency(item.unit_price)}\n`;
                    }
                    if (item.remaining_amount !== undefined) {
                        report += `   Còn lại: ${formatCurrency(item.remaining_amount)}\n`;
                    }
                    report += `\n`;
                });
            } else {
                report += `Chưa có hạng mục\n`;
            }

            report += `\n================================\n`;
            report += `Tổng số hạng mục: ${budget.items?.length || 0}\n`;
            report += `Tổng ngân sách: ${formatCurrency(budget.total_budget)}\n`;
            report += `Ngày xuất báo cáo: ${new Date().toLocaleDateString("vi-VN")} ${new Date().toLocaleTimeString("vi-VN")}\n`;

            // Save to file
            const directory = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || "";
            const fileName = `budget_report_${budget.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.txt`;
            const fileUri = `${directory}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, report, {
                encoding: (FileSystem as any).EncodingType.UTF8,
            });

            // Share file
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: "text/plain",
                    dialogTitle: "Xuất báo cáo ngân sách",
                });
            } else {
                Alert.alert("Thành công", `Báo cáo đã được lưu tại: ${fileUri}`);
            }
        } catch (error: any) {
            if (error.code !== "ERR_CANCELLED" && error.message !== "User did not share") {
                console.error("Error exporting budget:", error);
                Alert.alert("Lỗi", "Không thể xuất báo cáo");
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending_approval":
                return "#F97316";
            case "approved":
                return "#10B981";
            case "active":
                return "#3B82F6";
            case "archived":
                return "#6B7280";
            default:
                return "#F59E0B";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "pending_approval": return "Chờ duyệt";
            case "approved": return "Đã duyệt";
            case "active": return "Đang áp dụng";
            case "archived": return "Đã lưu trữ";
            default: return "Nháp";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending_approval": return "time-outline";
            case "approved": return "checkmark-circle-outline";
            case "active": return "flash-outline";
            case "archived": return "archive-outline";
            default: return "document-text-outline";
        }
    };

    const WORKFLOW_STEPS = [
        { key: "draft", label: "Nháp", icon: "document-text-outline" },
        { key: "pending_approval", label: "Chờ duyệt", icon: "time-outline" },
        { key: "approved", label: "Đã duyệt", icon: "checkmark-circle-outline" },
        { key: "active", label: "Áp dụng", icon: "flash-outline" },
        { key: "archived", label: "Lưu trữ", icon: "archive-outline" },
    ];

    const getStepIndex = (status: string) => {
        const idx = WORKFLOW_STEPS.findIndex(s => s.key === status);
        return idx >= 0 ? idx : 0;
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Ngân Sách" />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Ngân Sách" />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    if (!budget) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Ngân Sách" />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Không tìm thấy ngân sách</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Chi Tiết Ngân Sách"
                rightComponent={
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleExport}
                        >
                            <Ionicons name="download-outline" size={20} color="#10B981" />
                        </TouchableOpacity>
                        {budget.status === "draft" && (
                            <>
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={() => router.push(`/projects/${id}/budget/${budgetId}/edit`)}
                                >
                                    <Ionicons name="pencil" size={20} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={handleDelete}
                                >
                                    <Ionicons name="trash" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                }
            />

            <ScrollView
                style={[styles.content, { marginBottom: tabBarHeight }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Workflow Stepper */}
                <View style={styles.workflowSection}>
                    <View style={styles.stepperContainer}>
                        {WORKFLOW_STEPS.map((step, index) => {
                            const currentIndex = getStepIndex(budget.status);
                            const isCompleted = index < currentIndex;
                            const isCurrent = index === currentIndex;
                            const stepColor = isCompleted ? "#10B981" : isCurrent ? getStatusColor(budget.status) : "#D1D5DB";
                            return (
                                <React.Fragment key={step.key}>
                                    <View style={styles.stepItem}>
                                        <View style={[
                                            styles.stepDot,
                                            { backgroundColor: isCompleted ? "#10B981" : isCurrent ? stepColor : "#F3F4F6", borderColor: stepColor }
                                        ]}>
                                            <Ionicons
                                                name={isCompleted ? "checkmark" : (step.icon as any)}
                                                size={isCurrent ? 14 : 12}
                                                color={isCompleted || isCurrent ? "#FFFFFF" : "#9CA3AF"}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.stepLabel,
                                            isCurrent && { color: stepColor, fontWeight: "700" },
                                            isCompleted && { color: "#10B981" },
                                        ]}>{step.label}</Text>
                                    </View>
                                    {index < WORKFLOW_STEPS.length - 1 && (
                                        <View style={[
                                            styles.stepLine,
                                            { backgroundColor: isCompleted ? "#10B981" : "#E5E7EB" }
                                        ]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* Workflow Action Buttons */}
                    <View style={styles.workflowActions}>
                        {(budget.status === "draft" || budget.status === "rejected") && hasPermission(Permissions.BUDGET_UPDATE) && (
                            <TouchableOpacity
                                style={[styles.workflowButton, styles.workflowButtonPrimary]}
                                onPress={handleSubmitForApproval}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="send" size={18} color="#FFFFFF" />
                                        <Text style={styles.workflowButtonTextLight}>Gửi Duyệt</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {budget.status === "pending_approval" && hasPermission(Permissions.BUDGET_APPROVE) && (
                            <View style={styles.workflowActionRow}>
                                <TouchableOpacity
                                    style={[styles.workflowButton, styles.workflowButtonApprove, { flex: 1 }]}
                                    onPress={handleApprove}
                                    disabled={actionLoading}
                                >
                                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.workflowButtonTextLight}>Duyệt</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.workflowButton, styles.workflowButtonReject, { flex: 1 }]}
                                    onPress={() => setShowRejectModal(true)}
                                    disabled={actionLoading}
                                >
                                    <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.workflowButtonTextLight}>Từ chối</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {budget.status === "approved" && hasPermission(Permissions.BUDGET_APPROVE) && (
                            <TouchableOpacity
                                style={[styles.workflowButton, styles.workflowButtonActivate]}
                                onPress={handleActivate}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="flash" size={18} color="#FFFFFF" />
                                        <Text style={styles.workflowButtonTextLight}>Áp Dụng Ngân Sách</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {budget.status === "active" && hasPermission(Permissions.BUDGET_APPROVE) && (
                            <TouchableOpacity
                                style={[styles.workflowButton, styles.workflowButtonArchive]}
                                onPress={handleArchive}
                                disabled={actionLoading}
                            >
                                <Ionicons name="archive" size={18} color="#FFFFFF" />
                                <Text style={styles.workflowButtonTextLight}>Lưu Trữ</Text>
                            </TouchableOpacity>
                        )}

                        {budget.status === "pending_approval" && hasPermission(Permissions.BUDGET_REVERT) && (
                            <TouchableOpacity
                                style={[styles.workflowButton, { backgroundColor: '#F59E0B', marginTop: 12 }]}
                                onPress={() => {
                                    Alert.alert(
                                        "Xác nhận hoàn duyệt",
                                        "Bạn có chắc chắn muốn đưa ngân sách này về trạng thái nháp?",
                                        [
                                            { text: "Hủy", style: "cancel" },
                                            {
                                                text: "Hoàn duyệt",
                                                style: "destructive",
                                                onPress: async () => {
                                                    try {
                                                        setActionLoading(true);
                                                        const response = await budgetApi.revertToDraft(Number(id), Number(budgetId));
                                                        if (response.success) {
                                                            Alert.alert("Thành công", "Đã đưa ngân sách về trạng thái nháp");
                                                            setBudget(response.data);
                                                        }
                                                    } catch (error: any) {
                                                        Alert.alert("Lỗi", error.response?.data?.message || "Không thể hoàn duyệt");
                                                    } finally {
                                                        setActionLoading(false);
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                }}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="arrow-undo" size={18} color="#FFFFFF" />
                                        <Text style={styles.workflowButtonTextLight}>Hoàn duyệt</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Thông tin cơ bản */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tên ngân sách:</Text>
                        <Text style={styles.infoValue}>{budget.name}</Text>
                    </View>

                    {budget.version && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Phiên bản:</Text>
                            <Text style={styles.infoValue}>v{budget.version}</Text>
                        </View>
                    )}

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày lập:</Text>
                        <Text style={styles.infoValue}>
                            {new Date(budget.budget_date).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Trạng thái:</Text>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: getStatusColor(budget.status) + "20" },
                            ]}
                        >
                            <Ionicons name={getStatusIcon(budget.status) as any} size={14} color={getStatusColor(budget.status)} style={{ marginRight: 4 }} />
                            <Text style={[styles.statusText, { color: getStatusColor(budget.status) }]}>
                                {getStatusLabel(budget.status)}
                            </Text>
                        </View>
                    </View>

                    {budget.approver && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Người duyệt:</Text>
                            <Text style={styles.infoValue}>{budget.approver.name}</Text>
                        </View>
                    )}

                    {budget.approved_at && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Ngày duyệt:</Text>
                            <Text style={styles.infoValue}>{new Date(budget.approved_at).toLocaleDateString("vi-VN")}</Text>
                        </View>
                    )}

                    {budget.creator && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Người tạo:</Text>
                            <Text style={styles.infoValue}>{budget.creator.name}</Text>
                        </View>
                    )}

                    {budget.notes && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Ghi chú:</Text>
                            <Text style={styles.infoValue}>{budget.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Tổng quan ngân sách */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="wallet-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Tổng quan ngân sách</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Tổng ngân sách</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(budget.total_budget)}</Text>
                        </View>

                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Chi phí ước tính</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(budget.estimated_cost)}</Text>
                        </View>

                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Ngân sách còn lại</Text>
                            <Text style={[styles.summaryValue, { color: budget.remaining_budget >= 0 ? "#10B981" : "#EF4444" }]}>
                                {formatCurrency(budget.remaining_budget)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "overview" && styles.tabActive]}
                        onPress={() => setActiveTab("overview")}
                    >
                        <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
                            Tổng quan
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "items" && styles.tabActive]}
                        onPress={() => setActiveTab("items")}
                    >
                        <Text style={[styles.tabText, activeTab === "items" && styles.tabTextActive]}>
                            Hạng mục ({budget.items?.length || 0})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "groups" && styles.tabActive]}
                        onPress={() => setActiveTab("groups")}
                    >
                        <Text style={[styles.tabText, activeTab === "groups" && styles.tabTextActive]}>
                            Phân nhóm
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="analytics-outline" size={20} color="#3B82F6" />
                            <Text style={styles.sectionTitle}>Phân tích ngân sách</Text>
                        </View>

                        {comparisonData?.summary && (
                            <View style={styles.analysisCard}>
                                <View style={styles.analysisRow}>
                                    <Text style={styles.analysisLabel}>Ngân sách:</Text>
                                    <Text style={styles.analysisValue}>
                                        {formatCurrency(comparisonData.summary.total_budget)}
                                    </Text>
                                </View>
                                <View style={styles.analysisRow}>
                                    <Text style={styles.analysisLabel}>Chi phí thực tế:</Text>
                                    <Text style={[
                                        styles.analysisValue,
                                        { color: comparisonData.summary.is_over_budget ? "#EF4444" : "#10B981" }
                                    ]}>
                                        {formatCurrency(comparisonData.summary.total_actual)}
                                    </Text>
                                </View>
                                <View style={styles.analysisRow}>
                                    <Text style={styles.analysisLabel}>Chênh lệch:</Text>
                                    <Text style={[
                                        styles.analysisValue,
                                        { color: comparisonData.summary.total_variance > 0 ? "#EF4444" : "#10B981" }
                                    ]}>
                                        {formatCurrency(Math.abs(comparisonData.summary.total_variance))}
                                        {comparisonData.summary.total_variance > 0 ? " (Vượt)" : " (Tiết kiệm)"}
                                    </Text>
                                </View>
                                <View style={styles.analysisRow}>
                                    <Text style={styles.analysisLabel}>Tỷ lệ sử dụng:</Text>
                                    <Text style={[
                                        styles.analysisValue,
                                        {
                                            color: comparisonData.summary.budget_utilization > 100
                                                ? "#EF4444"
                                                : comparisonData.summary.budget_utilization > 80
                                                    ? "#F59E0B"
                                                    : "#10B981"
                                        }
                                    ]}>
                                        {comparisonData.summary.budget_utilization.toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                        )}

                        {(budget.status === "approved" || budget.status === "active") && (
                            <TouchableOpacity
                                style={styles.compareButton}
                                onPress={() => router.push(`/projects/${id}/budget/${budgetId}/compare`)}
                            >
                                <Ionicons name="analytics" size={20} color="#FFFFFF" />
                                <Text style={styles.compareButtonText}>Xem so sánh chi tiết</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Items Tab */}
                {activeTab === "items" && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="list-outline" size={20} color="#3B82F6" />
                            <Text style={styles.sectionTitle}>Hạng mục ngân sách</Text>
                            <TouchableOpacity
                                style={styles.addItemButton}
                                onPress={handleAddItem}
                            >
                                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                            </TouchableOpacity>
                        </View>

                        {budget.items && budget.items.length > 0 ? (
                            budget.items.map((item, index) => {
                                const comparison = getItemComparison(item.id);
                                const actualAmount = comparison?.actual_amount || 0;
                                const utilization = item.estimated_amount > 0
                                    ? (actualAmount / item.estimated_amount) * 100
                                    : 0;
                                const isOverBudget = actualAmount > item.estimated_amount;
                                const isExpanded = expandedItems.has(item.id);

                                return (
                                    <View
                                        key={item.id || index}
                                        style={[
                                            styles.itemCard,
                                            isOverBudget && styles.itemCardOverBudget
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={styles.itemHeader}
                                            onPress={() => toggleItemExpand(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.itemHeaderLeft}>
                                                <View style={styles.itemTitleRow}>
                                                    <Text style={styles.itemName}>{item.name}</Text>
                                                    {isOverBudget && (
                                                        <View style={styles.overBudgetBadge}>
                                                            <Ionicons name="warning" size={14} color="#EF4444" />
                                                            <Text style={styles.overBudgetText}>Vượt</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {item.cost_group && (
                                                    <Text style={styles.itemCostGroup}>{item.cost_group.name}</Text>
                                                )}
                                            </View>
                                            <View style={styles.itemHeaderRight}>
                                                <Text style={styles.itemAmount}>
                                                    {formatCurrency(item.estimated_amount)}
                                                </Text>
                                                <Ionicons
                                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                                    size={20}
                                                    color="#6B7280"
                                                />
                                            </View>
                                        </TouchableOpacity>

                                        {/* Progress Bar */}
                                        {(budget.status === "approved" || budget.status === "active") && comparison && (
                                            <View style={styles.itemProgressContainer}>
                                                <View style={styles.itemProgressBar}>
                                                    <View
                                                        style={[
                                                            styles.itemProgressFill,
                                                            {
                                                                width: `${Math.min(utilization, 100)}%`,
                                                                backgroundColor: isOverBudget
                                                                    ? "#EF4444"
                                                                    : utilization > 80
                                                                        ? "#F59E0B"
                                                                        : "#10B981",
                                                            },
                                                        ]}
                                                    />
                                                </View>
                                                <View style={styles.itemProgressInfo}>
                                                    <Text style={styles.itemProgressText}>
                                                        Ước tính: {formatCurrency(item.estimated_amount)}
                                                    </Text>
                                                    <Text style={[
                                                        styles.itemProgressText,
                                                        { color: isOverBudget ? "#EF4444" : "#6B7280" }
                                                    ]}>
                                                        Thực tế: {formatCurrency(actualAmount)}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <View style={styles.itemExpandedContent}>
                                                {item.description && (
                                                    <Text style={styles.itemDescription}>{item.description}</Text>
                                                )}

                                                <View style={styles.itemDetails}>
                                                    <View style={styles.itemDetailRow}>
                                                        <Text style={styles.itemDetailLabel}>Số tiền ước tính:</Text>
                                                        <Text style={styles.itemDetailValue}>
                                                            {formatCurrency(item.estimated_amount)}
                                                        </Text>
                                                    </View>

                                                    {comparison && (
                                                        <>
                                                            <View style={styles.itemDetailRow}>
                                                                <Text style={styles.itemDetailLabel}>Chi phí thực tế:</Text>
                                                                <Text style={[
                                                                    styles.itemDetailValue,
                                                                    { color: isOverBudget ? "#EF4444" : "#10B981" }
                                                                ]}>
                                                                    {formatCurrency(actualAmount)}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.itemDetailRow}>
                                                                <Text style={styles.itemDetailLabel}>Chênh lệch:</Text>
                                                                <Text style={[
                                                                    styles.itemDetailValue,
                                                                    {
                                                                        color: comparison.variance > 0 ? "#EF4444" : "#10B981"
                                                                    }
                                                                ]}>
                                                                    {formatCurrency(Math.abs(comparison.variance))}
                                                                    {comparison.variance > 0 ? " (Vượt)" : " (Tiết kiệm)"}
                                                                </Text>
                                                            </View>
                                                        </>
                                                    )}

                                                    {item.quantity && item.unit_price && (
                                                        <>
                                                            <View style={styles.itemDetailRow}>
                                                                <Text style={styles.itemDetailLabel}>Số lượng:</Text>
                                                                <Text style={styles.itemDetailValue}>{item.quantity}</Text>
                                                            </View>
                                                            <View style={styles.itemDetailRow}>
                                                                <Text style={styles.itemDetailLabel}>Đơn giá:</Text>
                                                                <Text style={styles.itemDetailValue}>
                                                                    {formatCurrency(item.unit_price)}
                                                                </Text>
                                                            </View>
                                                        </>
                                                    )}

                                                    {item.remaining_amount !== undefined && (
                                                        <View style={styles.itemDetailRow}>
                                                            <Text style={styles.itemDetailLabel}>Còn lại:</Text>
                                                            <Text style={[
                                                                styles.itemDetailValue,
                                                                { color: item.remaining_amount >= 0 ? "#10B981" : "#EF4444" }
                                                            ]}>
                                                                {formatCurrency(item.remaining_amount)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={styles.itemActions}>
                                                    <TouchableOpacity
                                                        style={styles.itemActionButton}
                                                        onPress={() => handleEditItem(item)}
                                                    >
                                                        <Ionicons name="pencil" size={18} color="#3B82F6" />
                                                        <Text style={styles.itemActionText}>Sửa</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.itemActionButton, styles.itemActionButtonDanger]}
                                                        onPress={() => handleDeleteItem(item.id)}
                                                    >
                                                        <Ionicons name="trash" size={18} color="#EF4444" />
                                                        <Text style={[styles.itemActionText, { color: "#EF4444" }]}>Xóa</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.emptyItemsContainer}>
                                <Ionicons name="list-outline" size={48} color="#9CA3AF" />
                                <Text style={styles.emptyItemsText}>Chưa có hạng mục</Text>
                                <TouchableOpacity
                                    style={styles.addFirstItemButton}
                                    onPress={handleAddItem}
                                >
                                    <Ionicons name="add-circle" size={20} color="#3B82F6" />
                                    <Text style={styles.addFirstItemText}>Thêm hạng mục đầu tiên</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Groups Tab */}
                {activeTab === "groups" && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="grid-outline" size={20} color="#3B82F6" />
                            <Text style={styles.sectionTitle}>Theo nhóm chi phí</Text>
                        </View>

                        {comparisonData?.group_comparison && comparisonData.group_comparison.length > 0 ? (
                            comparisonData.group_comparison.map((group: any, index: number) => (
                                <View 
                                    key={group.id || index} 
                                    style={[
                                        styles.itemCard,
                                        group.is_over_budget && styles.itemCardOverBudget
                                    ]}
                                >
                                    <View style={styles.itemHeader}>
                                        <View style={styles.itemHeaderLeft}>
                                            <View style={styles.itemTitleRow}>
                                                <Text style={styles.itemName}>{group.name}</Text>
                                                {group.is_over_budget && (
                                                    <View style={styles.overBudgetBadge}>
                                                        <Ionicons name="warning" size={14} color="#EF4444" />
                                                        <Text style={styles.overBudgetText}>Vượt</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.itemCostGroup}>{group.items_count} hạng mục</Text>
                                        </View>
                                        <View style={styles.itemHeaderRight}>
                                            <Text style={styles.itemAmount}>
                                                {formatCurrency(group.estimated)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.itemProgressContainer}>
                                        <View style={styles.itemProgressBar}>
                                            <View
                                                style={[
                                                    styles.itemProgressFill,
                                                    {
                                                        width: `${Math.min(group.variance_percentage + 100 > 100 ? 100 : (group.actual / group.estimated * 100), 100)}%`,
                                                        backgroundColor: group.is_over_budget
                                                            ? "#EF4444"
                                                            : (group.actual / group.estimated * 100) > 80
                                                                ? "#F59E0B"
                                                                : "#10B981",
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <View style={styles.itemProgressInfo}>
                                            <Text style={styles.itemProgressText}>
                                                Dự toán: {formatCurrency(group.estimated)}
                                            </Text>
                                            <Text style={[
                                                styles.itemProgressText,
                                                { color: group.is_over_budget ? "#EF4444" : "#6B7280" }
                                            ]}>
                                                Đã chi: {formatCurrency(group.actual)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyItemsContainer}>
                                <Ionicons name="grid-outline" size={48} color="#9CA3AF" />
                                <Text style={styles.emptyItemsText}>Chưa có dữ liệu phân nhóm</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Reject Modal */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.rejectModalContent}>
                        <Text style={styles.rejectModalTitle}>Từ chối ngân sách</Text>
                        <Text style={styles.rejectModalSubtitle}>
                            Vui lòng nhập lý do từ chối để người tạo có thể chỉnh sửa lại.
                        </Text>
                        <TextInput
                            style={styles.rejectReasonInput}
                            placeholder="Nhập lý do từ chối..."
                            placeholderTextColor="#9CA3AF"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        <View style={styles.rejectModalActions}>
                            <TouchableOpacity
                                style={styles.rejectModalCancel}
                                onPress={() => { setShowRejectModal(false); setRejectReason(""); }}
                            >
                                <Text style={styles.rejectModalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.rejectModalSubmit, !rejectReason.trim() && { opacity: 0.5 }]}
                                onPress={handleReject}
                                disabled={actionLoading || !rejectReason.trim()}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.rejectModalSubmitText}>Xác nhận từ chối</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
    headerActions: {
        flexDirection: "row",
        gap: 12,
    },
    headerButton: {
        padding: 4,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
    },
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        padding: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    tabActive: {
        backgroundColor: "#3B82F6",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#FFFFFF",
    },
    section: {
        backgroundColor: "#FFFFFF",
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    analysisCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 16,
        gap: 12,
        marginBottom: 16,
    },
    analysisRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    analysisLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    analysisValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    compareButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#3B82F6",
        borderRadius: 10,
        padding: 14,
        marginTop: 8,
    },
    compareButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        flex: 1,
    },
    addItemButton: {
        padding: 4,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    infoLabel: {
        fontSize: 14,
        color: "#6B7280",
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
        textAlign: "right",
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    summaryCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 16,
        gap: 16,
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    itemCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    itemCardOverBudget: {
        borderColor: "#EF4444",
        borderWidth: 2,
        backgroundColor: "#FEF2F2",
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    itemHeaderLeft: {
        flex: 1,
        marginRight: 12,
    },
    itemTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
    },
    overBudgetBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
    },
    overBudgetText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#EF4444",
    },
    itemCostGroup: {
        fontSize: 12,
        color: "#6B7280",
    },
    itemHeaderRight: {
        alignItems: "flex-end",
        gap: 8,
    },
    itemAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#3B82F6",
    },
    itemProgressContainer: {
        marginBottom: 12,
    },
    itemProgressBar: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 8,
    },
    itemProgressFill: {
        height: "100%",
        borderRadius: 4,
    },
    itemProgressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemProgressText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
    },
    itemExpandedContent: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    itemActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    itemActionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        flex: 1,
        justifyContent: "center",
    },
    itemActionButtonDanger: {
        backgroundColor: "#FEF2F2",
    },
    itemActionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#3B82F6",
    },
    itemDescription: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 12,
    },
    itemDetails: {
        gap: 8,
    },
    itemDetailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemDetailLabel: {
        fontSize: 13,
        color: "#6B7280",
    },
    itemDetailValue: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1F2937",
    },
    emptyItemsContainer: {
        alignItems: "center",
        paddingVertical: 32,
    },
    emptyItemsText: {
        fontSize: 14,
        color: "#9CA3AF",
        marginTop: 12,
        marginBottom: 16,
    },
    addFirstItemButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#F0F9FF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    addFirstItemText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#3B82F6",
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
        zIndex: 1000,
        elevation: 1000,
    },
    modalSafeArea: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "92%",
        width: "100%",
        zIndex: 1001,
        elevation: 1001,
    },
    modalKeyboardView: {
        flex: 1,
        maxHeight: "100%",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        paddingTop: 8,
        flex: 1,
        minHeight: 0,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalBody: {
        flex: 1,
        minHeight: 0,
    },
    modalBodyContent: {
        paddingBottom: 20,
        paddingHorizontal: 0,
        flexGrow: 1,
        minHeight: 400,
    },
    formSection: {
        marginBottom: 24,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    required: {
        fontSize: 14,
        fontWeight: "600",
        color: "#EF4444",
    },
    input: {
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        backgroundColor: "#FFFFFF",
        color: "#1F2937",
        minHeight: 48,
    },
    inputFocused: {
        borderColor: "#3B82F6",
        backgroundColor: "#F0F9FF",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputError: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
        paddingTop: 14,
    },
    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        backgroundColor: "#FFFFFF",
        minHeight: 48,
    },
    placeholderText: {
        color: "#9CA3AF",
    },
    selectInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        backgroundColor: "#FFFFFF",
        minHeight: 48,
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 6,
    },
    errorText: {
        fontSize: 12,
        color: "#EF4444",
        flex: 1,
    },
    buttonContainer: {
        marginTop: 24,
        marginBottom: 16,
        paddingBottom: 8,
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0.1,
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "flex-end",
        zIndex: 2000,
        elevation: 2000,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    pickerContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "70%",
        padding: 16,
        zIndex: 2001,
        elevation: 2001,
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    pickerItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },

    // ====== Workflow Stepper Styles ======
    workflowSection: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    stepperContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    stepItem: {
        alignItems: "center",
        gap: 4,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    stepLabel: {
        fontSize: 10,
        color: "#9CA3AF",
        fontWeight: "500",
        marginTop: 2,
    },
    stepLine: {
        flex: 1,
        height: 2,
        marginHorizontal: 4,
        marginBottom: 20,
        borderRadius: 1,
    },

    // ====== Workflow Action Buttons ======
    workflowActions: {
        marginTop: 4,
    },
    workflowActionRow: {
        flexDirection: "row",
        gap: 12,
    },
    workflowButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    workflowButtonPrimary: {
        backgroundColor: "#3B82F6",
    },
    workflowButtonApprove: {
        backgroundColor: "#10B981",
    },
    workflowButtonReject: {
        backgroundColor: "#EF4444",
    },
    workflowButtonActivate: {
        backgroundColor: "#8B5CF6",
    },
    workflowButtonArchive: {
        backgroundColor: "#6B7280",
    },
    workflowButtonTextLight: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },

    // ====== Reject Modal Styles ======
    rejectModalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        width: "90%",
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    rejectModalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    rejectModalSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
        lineHeight: 20,
    },
    rejectReasonInput: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: "#1F2937",
        minHeight: 100,
        backgroundColor: "#F9FAFB",
    },
    rejectModalActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
    },
    rejectModalCancel: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        alignItems: "center",
    },
    rejectModalCancelText: {
        color: "#6B7280",
        fontSize: 15,
        fontWeight: "600",
    },
    rejectModalSubmit: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#EF4444",
        alignItems: "center",
    },
    rejectModalSubmitText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },
});
