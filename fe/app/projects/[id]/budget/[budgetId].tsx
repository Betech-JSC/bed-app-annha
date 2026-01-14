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
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";
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
    const [activeTab, setActiveTab] = useState<"overview" | "items">("overview");

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
            const response = await budgetApi.getBudget(Number(id), Number(budgetId));
            if (response.success) {
                setBudget(response.data);
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải ngân sách";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
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
            const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
            const fileName = `budget_report_${budget.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.txt`;
            const fileUri = `${directory}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, report, {
                encoding: FileSystem.EncodingType.UTF8,
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
                    </View>
                }
            />

            <ScrollView
                style={[styles.content, { marginBottom: tabBarHeight }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
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
                            <Text style={[styles.statusText, { color: getStatusColor(budget.status) }]}>
                                {budget.status === "approved"
                                    ? "Đã duyệt"
                                    : budget.status === "active"
                                        ? "Đang áp dụng"
                                        : budget.status === "archived"
                                            ? "Đã lưu trữ"
                                            : "Nháp"}
                            </Text>
                        </View>
                    </View>

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
            </ScrollView>
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
});

