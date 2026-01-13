import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { budgetApi, ProjectBudget, CreateBudgetData } from "@/api/budgetApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { revenueApi } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader, PermissionGuard } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function BudgetScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = useProjectPermissions(id || null);
    const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
    const [actualCosts, setActualCosts] = useState<number>(0);
    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [formData, setFormData] = useState<Partial<CreateBudgetData>>({
        name: "",
        version: "1.0",
        budget_date: new Date().toISOString().split("T")[0],
        notes: "",
        items: [],
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);

    useEffect(() => {
        loadBudgets();
        loadCostGroups();
        loadActualCosts();
    }, [id]);

    // Debounce search text
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 300);
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchText]);

    const loadBudgets = async () => {
        try {
            setLoading(true);
            const response = await budgetApi.getBudgets(Number(id));
            if (response.success) {
                setBudgets(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading budgets:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadActualCosts = async () => {
        try {
            const response = await revenueApi.getProjectSummary(id!);
            if (response.success) {
                setActualCosts(response.data.costs?.total_costs || 0);
            }
        } catch (error) {
            console.error("Error loading actual costs:", error);
        }
    };

    const loadCostGroups = async () => {
        try {
            const response = await costGroupApi.getCostGroups({ active_only: true });
            if (response.success) {
                const data = response.data?.data || response.data || [];
                setCostGroups(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error loading cost groups:", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadBudgets();
        loadActualCosts();
    };

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        const activeBudgets = budgets.filter(b => b.status === "approved" || b.status === "active");
        const totalBudget = activeBudgets.reduce((sum, b) => sum + b.total_budget, 0);
        const totalRemaining = activeBudgets.reduce((sum, b) => sum + b.remaining_budget, 0);
        const totalUsed = totalBudget - totalRemaining;
        const utilization = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;
        
        return {
            totalBudget,
            totalUsed,
            totalRemaining,
            utilization,
            actualCosts,
            variance: actualCosts - totalBudget,
        };
    }, [budgets, actualCosts]);

    // Filter budgets with debounced search
    const filteredBudgets = useMemo(() => {
        let filtered = [...budgets];
        
        // Search filter (using debounced text)
        if (debouncedSearchText.trim()) {
            const searchLower = debouncedSearchText.toLowerCase().trim();
            filtered = filtered.filter(b => 
                b.name.toLowerCase().includes(searchLower) ||
                b.version?.toLowerCase().includes(searchLower)
            );
        }
        
        // Status filter
        if (filterStatus) {
            filtered = filtered.filter(b => b.status === filterStatus);
        }
        
        return filtered;
    }, [budgets, debouncedSearchText, filterStatus]);

    const handleAddItem = () => {
        setEditingItem(null);
        setShowItemModal(true);
    };

    const handleEditItem = (item: any, index: number) => {
        setEditingItem({ ...item, index });
        setShowItemModal(true);
    };

    const handleSaveItem = (item: any) => {
        const items = formData.items || [];
        if (editingItem !== null && editingItem.index !== undefined) {
            items[editingItem.index] = item;
        } else {
            items.push(item);
        }
        // Auto-calculate total
        const total = items.reduce((sum, i) => sum + (i.estimated_amount || 0), 0);
        setFormData({ ...formData, items, total });
        setShowItemModal(false);
        setEditingItem(null);
    };

    const handleRemoveItem = (index: number) => {
        const items = formData.items || [];
        items.splice(index, 1);
        // Recalculate total
        const total = items.reduce((sum, i) => sum + (i.estimated_amount || 0), 0);
        setFormData({ ...formData, items, total });
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.budget_date || !formData.items || formData.items.length === 0) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin và thêm ít nhất 1 hạng mục");
            return;
        }

        try {
            setSubmitting(true);
            const response = await budgetApi.createBudget(Number(id), formData as CreateBudgetData);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo ngân sách thành công");
                setShowCreateModal(false);
                resetForm();
                loadBudgets();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo ngân sách");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            version: "1.0",
            budget_date: new Date().toISOString().split("T")[0],
            notes: "",
            items: [],
        });
    };

    const handleUseTemplate = (templateBudget: ProjectBudget) => {
        setFormData({
            name: `${templateBudget.name} (Mới)`,
            version: "1.0",
            budget_date: new Date().toISOString().split("T")[0],
            notes: templateBudget.notes || "",
            items: templateBudget.items?.map(item => ({
                name: item.name,
                cost_group_id: item.cost_group_id,
                description: item.description,
                estimated_amount: item.estimated_amount,
                quantity: item.quantity,
                unit_price: item.unit_price,
            })) || [],
        });
        setShowTemplatePicker(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const getBudgetUtilization = (budget: ProjectBudget): number => {
        if (budget.total_budget === 0) return 0;
        const used = budget.total_budget - budget.remaining_budget;
        return (used / budget.total_budget) * 100;
    };

    const handleDuplicate = async (budget: ProjectBudget, e: any) => {
        e?.stopPropagation?.();
        Alert.alert(
            "Sao chép ngân sách",
            `Bạn có muốn sao chép ngân sách "${budget.name}"?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Sao chép",
                    onPress: async () => {
                        try {
                            const newVersion = budget.version 
                                ? `${parseFloat(budget.version) + 0.1}`.substring(0, 3)
                                : "1.0";
                            const duplicateData: CreateBudgetData = {
                                name: `${budget.name} (Bản sao)`,
                                version: newVersion,
                                budget_date: new Date().toISOString().split("T")[0],
                                notes: budget.notes || "",
                                items: budget.items?.map(item => ({
                                    name: item.name,
                                    cost_group_id: item.cost_group_id,
                                    description: item.description,
                                    estimated_amount: item.estimated_amount,
                                    quantity: item.quantity,
                                    unit_price: item.unit_price,
                                })) || [],
                            };
                            const response = await budgetApi.createBudget(Number(id), duplicateData);
                            if (response.success) {
                                Alert.alert("Thành công", "Đã sao chép ngân sách");
                                loadBudgets();
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể sao chép ngân sách");
                        }
                    },
                },
            ]
        );
    };

    const renderItem = useCallback(({ item }: { item: ProjectBudget }) => {
        const utilization = getBudgetUtilization(item);
        const isOverBudget = utilization > 100;
        const isWarning = utilization > 80 && utilization <= 100;
        
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/projects/${id}/budget/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        {item.version && <Text style={styles.cardVersion}>v{item.version}</Text>}
                    </View>
                    <View style={styles.cardHeaderRight}>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor:
                                        item.status === "approved"
                                            ? "#10B98120"
                                            : item.status === "active"
                                                ? "#3B82F620"
                                                : item.status === "archived"
                                                    ? "#6B728020"
                                                    : "#F59E0B20",
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    {
                                        color:
                                            item.status === "approved"
                                                ? "#10B981"
                                                : item.status === "active"
                                                    ? "#3B82F6"
                                                    : item.status === "archived"
                                                        ? "#6B7280"
                                                        : "#F59E0B",
                                    },
                                ]}
                            >
                                {item.status === "approved"
                                    ? "Đã duyệt"
                                    : item.status === "active"
                                        ? "Đang áp dụng"
                                        : item.status === "archived"
                                            ? "Đã lưu trữ"
                                            : "Nháp"}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.duplicateButton}
                            onPress={(e) => {
                                if (!hasPermission(Permissions.COST_CREATE)) {
                                    Alert.alert("Lỗi", "Bạn không có quyền sao chép ngân sách");
                                    return;
                                }
                                handleDuplicate(item, e);
                            }}
                        >
                            <Ionicons name="copy-outline" size={18} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <Text style={styles.budgetAmount}>
                    {formatCurrency(item.total_budget)}
                </Text>
                
                {/* Progress Bar */}
                {(item.status === "approved" || item.status === "active") && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${Math.min(utilization, 100)}%`,
                                        backgroundColor: isOverBudget 
                                            ? "#EF4444" 
                                            : isWarning 
                                                ? "#F59E0B" 
                                                : "#10B981",
                                    },
                                ]}
                            />
                        </View>
                        <View style={styles.progressInfo}>
                            <Text style={styles.progressText}>
                                Đã sử dụng: {utilization.toFixed(1)}%
                            </Text>
                            {isOverBudget && (
                                <View style={styles.warningBadge}>
                                    <Ionicons name="warning" size={14} color="#EF4444" />
                                    <Text style={styles.warningText}>Vượt ngân sách</Text>
                                </View>
                            )}
                            {isWarning && !isOverBudget && (
                                <View style={[styles.warningBadge, { backgroundColor: "#FEF3C7" }]}>
                                    <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                                    <Text style={[styles.warningText, { color: "#92400E" }]}>Cảnh báo</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
                
                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={styles.footerText}>
                            {new Date(item.budget_date).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>
                    {item.items && item.items.length > 0 && (
                        <View style={styles.footerItem}>
                            <Ionicons name="list-outline" size={14} color="#6B7280" />
                            <Text style={styles.footerText}>{item.items.length} hạng mục</Text>
                        </View>
                    )}
                    {(item.status === "approved" || item.status === "active") && (
                        <TouchableOpacity
                            style={styles.compareButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                router.push(`/projects/${id}/budget/${item.id}/compare`);
                            }}
                        >
                            <Ionicons name="analytics-outline" size={14} color="#3B82F6" />
                            <Text style={styles.compareButtonText}>So sánh</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    }, [id, router, handleDuplicate]);

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Ngân Sách Dự Án"
                showBackButton
                rightComponent={
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <Ionicons 
                                name="filter-outline" 
                                size={20} 
                                color={filterStatus ? "#3B82F6" : "#6B7280"} 
                            />
                        </TouchableOpacity>
                        <PermissionGuard permission={Permissions.COST_CREATE} projectId={id}>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => {
                                    resetForm();
                                    setShowCreateModal(true);
                                }}
                            >
                                <Ionicons name="add" size={24} color="#3B82F6" />
                            </TouchableOpacity>
                        </PermissionGuard>
                    </View>
                }
            />

            {/* Summary Card */}
            {!loading && budgets.length > 0 && (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Tổng ngân sách</Text>
                            <Text style={styles.summaryValue}>
                                {formatCurrency(summaryStats.totalBudget)}
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Đã sử dụng</Text>
                            <Text style={[styles.summaryValue, { color: "#3B82F6" }]}>
                                {formatCurrency(summaryStats.totalUsed)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Còn lại</Text>
                            <Text style={[
                                styles.summaryValue,
                                { color: summaryStats.totalRemaining >= 0 ? "#10B981" : "#EF4444" }
                            ]}>
                                {formatCurrency(summaryStats.totalRemaining)}
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Sử dụng</Text>
                            <Text style={[
                                styles.summaryValue,
                                { 
                                    color: summaryStats.utilization > 100 
                                        ? "#EF4444" 
                                        : summaryStats.utilization > 80 
                                            ? "#F59E0B" 
                                            : "#10B981" 
                                }
                            ]}>
                                {summaryStats.utilization.toFixed(1)}%
                            </Text>
                        </View>
                    </View>
                    {summaryStats.variance !== 0 && (
                        <View style={styles.varianceRow}>
                            <Ionicons 
                                name={summaryStats.variance > 0 ? "arrow-up" : "arrow-down"} 
                                size={16} 
                                color={summaryStats.variance > 0 ? "#EF4444" : "#10B981"} 
                            />
                            <Text style={[
                                styles.varianceText,
                                { color: summaryStats.variance > 0 ? "#EF4444" : "#10B981" }
                            ]}>
                                {summaryStats.variance > 0 ? "Vượt" : "Tiết kiệm"} {formatCurrency(Math.abs(summaryStats.variance))} so với ngân sách
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm ngân sách..."
                    placeholderTextColor="#9CA3AF"
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearSearchButton}>
                        <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={filteredBudgets}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: tabBarHeight }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={10}
                    windowSize={10}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="wallet-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>
                                {debouncedSearchText || filterStatus ? "Không tìm thấy ngân sách phù hợp" : "Chưa có ngân sách"}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <Modal
                    visible={showFilterModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowFilterModal(false)}
                >
                    <View style={styles.filterModalOverlay}>
                        <View style={styles.filterModal}>
                            <View style={styles.filterModalHeader}>
                                <Text style={styles.filterModalTitle}>Lọc theo trạng thái</Text>
                                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                    <Ionicons name="close" size={24} color="#1F2937" />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.filterOption}
                                onPress={() => {
                                    setFilterStatus(null);
                                    setShowFilterModal(false);
                                }}
                            >
                                <Text style={!filterStatus ? styles.filterOptionActive : styles.filterOptionText}>
                                    Tất cả
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterOption}
                                onPress={() => {
                                    setFilterStatus("draft");
                                    setShowFilterModal(false);
                                }}
                            >
                                <Text style={filterStatus === "draft" ? styles.filterOptionActive : styles.filterOptionText}>
                                    Nháp
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterOption}
                                onPress={() => {
                                    setFilterStatus("approved");
                                    setShowFilterModal(false);
                                }}
                            >
                                <Text style={filterStatus === "approved" ? styles.filterOptionActive : styles.filterOptionText}>
                                    Đã duyệt
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterOption}
                                onPress={() => {
                                    setFilterStatus("active");
                                    setShowFilterModal(false);
                                }}
                            >
                                <Text style={filterStatus === "active" ? styles.filterOptionActive : styles.filterOptionText}>
                                    Đang áp dụng
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filterOption}
                                onPress={() => {
                                    setFilterStatus("archived");
                                    setShowFilterModal(false);
                                }}
                            >
                                <Text style={filterStatus === "archived" ? styles.filterOptionActive : styles.filterOptionText}>
                                    Đã lưu trữ
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Create Budget Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalContainer}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tạo Ngân Sách</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Template Selection */}
                            {budgets.length > 0 && (
                                <View style={styles.formGroup}>
                                    <View style={styles.templateHeader}>
                                        <Text style={styles.label}>Tạo từ ngân sách có sẵn</Text>
                                        <TouchableOpacity
                                            style={styles.templateButton}
                                            onPress={() => setShowTemplatePicker(true)}
                                        >
                                            <Ionicons name="copy-outline" size={18} color="#3B82F6" />
                                            <Text style={styles.templateButtonText}>Chọn ngân sách</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Tên ngân sách *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập tên ngân sách"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Phiên bản</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="1.0"
                                    value={formData.version}
                                    onChangeText={(text) => setFormData({ ...formData, version: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày lập ngân sách *</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text>{formData.budget_date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={new Date(formData.budget_date || new Date())}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, date) => {
                                            if (Platform.OS === 'android') {
                                                setShowDatePicker(false);
                                            }
                                            if (date && (Platform.OS === 'android' || event.type !== 'dismissed')) {
                                                setFormData({
                                                    ...formData,
                                                    budget_date: date.toISOString().split("T")[0],
                                                });
                                            }
                                            if (Platform.OS === 'ios' && event.type === 'dismissed') {
                                                setShowDatePicker(false);
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <View style={styles.itemsHeader}>
                                    <Text style={styles.label}>Hạng mục ngân sách *</Text>
                                    <TouchableOpacity
                                        style={styles.addItemButton}
                                        onPress={handleAddItem}
                                    >
                                        <Ionicons name="add-circle" size={24} color="#3B82F6" />
                                        <Text style={styles.addItemText}>Thêm</Text>
                                    </TouchableOpacity>
                                </View>
                                {formData.items && formData.items.length > 0 ? (
                                    <>
                                        <View style={styles.itemsList}>
                                            {formData.items.map((item: any, index: number) => (
                                                <View key={index} style={styles.itemRow}>
                                                    <View style={styles.itemInfo}>
                                                        <Text style={styles.itemName}>{item.name}</Text>
                                                        <Text style={styles.itemAmount}>
                                                            {formatCurrency(item.estimated_amount || 0)}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.itemActions}>
                                                        <TouchableOpacity
                                                            onPress={() => handleEditItem(item, index)}
                                                        >
                                                            <Ionicons name="pencil" size={20} color="#3B82F6" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                                                            <Ionicons name="trash" size={20} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                        <View style={styles.totalRow}>
                                            <Text style={styles.totalLabel}>Tổng ngân sách:</Text>
                                            <Text style={styles.totalValue}>
                                                {formatCurrency(
                                                    formData.items.reduce((sum: number, i: any) => sum + (i.estimated_amount || 0), 0)
                                                )}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.emptyItemsText}>
                                        Chưa có hạng mục. Nhấn "Thêm" để thêm hạng mục.
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                onPress={handleCreate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Tạo Ngân Sách</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Budget Item Modal */}
            <Modal
                visible={showItemModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowItemModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalContainer}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingItem ? "Sửa Hạng Mục" : "Thêm Hạng Mục"}
                            </Text>
                            <TouchableOpacity onPress={() => setShowItemModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <BudgetItemForm
                            costGroups={costGroups}
                            initialData={editingItem}
                            onSave={handleSaveItem}
                            onCancel={() => setShowItemModal(false)}
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Template Picker Modal */}
            {showTemplatePicker && (
                <Modal
                    visible={showTemplatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowTemplatePicker(false)}
                >
                    <View style={styles.templatePickerOverlay}>
                        <View style={styles.templatePickerContent}>
                            <View style={styles.templatePickerHeader}>
                                <Text style={styles.templatePickerTitle}>Chọn ngân sách làm mẫu</Text>
                                <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                                    <Ionicons name="close" size={24} color="#1F2937" />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={budgets}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.templateOption}
                                        onPress={() => handleUseTemplate(item)}
                                    >
                                        <View style={styles.templateOptionLeft}>
                                            <Text style={styles.templateOptionName}>{item.name}</Text>
                                            {item.version && (
                                                <Text style={styles.templateOptionVersion}>v{item.version}</Text>
                                            )}
                                            <Text style={styles.templateOptionAmount}>
                                                {formatCurrency(item.total_budget)}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Chưa có ngân sách nào</Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

function BudgetItemForm({
    costGroups,
    initialData,
    onSave,
    onCancel,
}: {
    costGroups: CostGroup[];
    initialData: any;
    onSave: (item: any) => void;
    onCancel: () => void;
}) {
    const [itemData, setItemData] = useState({
        name: initialData?.name || "",
        cost_group_id: initialData?.cost_group_id || null,
        description: initialData?.description || "",
        estimated_amount: initialData?.estimated_amount?.toString() || "",
        quantity: initialData?.quantity?.toString() || "1",
        unit_price: initialData?.unit_price?.toString() || "",
    });
    const [showCostGroupPicker, setShowCostGroupPicker] = useState(false);
    const [selectedCostGroup, setSelectedCostGroup] = useState<CostGroup | null>(
        costGroups.find((g) => g.id === initialData?.cost_group_id) || null
    );

    const handleSave = () => {
        if (!itemData.name || !itemData.estimated_amount) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        onSave({
            name: itemData.name,
            cost_group_id: itemData.cost_group_id,
            description: itemData.description,
            estimated_amount: parseFloat(itemData.estimated_amount),
            quantity: parseInt(itemData.quantity) || 1,
            unit_price: parseFloat(itemData.unit_price) || parseFloat(itemData.estimated_amount),
        });
    };

    return (
        <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
        >
            <View style={styles.formGroup}>
                <Text style={styles.label}>Tên hạng mục *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập tên hạng mục"
                    value={itemData.name}
                    onChangeText={(text) => setItemData({ ...itemData, name: text })}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Nhóm chi phí</Text>
                <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowCostGroupPicker(true)}
                >
                    <Text style={selectedCostGroup ? {} : styles.placeholderText}>
                        {selectedCostGroup ? selectedCostGroup.name : "Chọn nhóm chi phí"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showCostGroupPicker && (
                    <Modal
                        visible={showCostGroupPicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowCostGroupPicker(false)}
                    >
                        <View style={styles.pickerOverlay}>
                            <View style={styles.pickerContent}>
                                <View style={styles.pickerHeader}>
                                    <Text style={styles.pickerTitle}>Chọn nhóm chi phí</Text>
                                    <TouchableOpacity onPress={() => setShowCostGroupPicker(false)}>
                                        <Ionicons name="close" size={24} color="#1F2937" />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={costGroups}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.pickerItem}
                                            onPress={() => {
                                                setSelectedCostGroup(item);
                                                setItemData({ ...itemData, cost_group_id: item.id });
                                                setShowCostGroupPicker(false);
                                            }}
                                        >
                                            <Text>{item.name}</Text>
                                            {selectedCostGroup?.id === item.id && (
                                                <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    </Modal>
                )}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Số tiền ước tính *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={itemData.estimated_amount}
                    onChangeText={(text) => setItemData({ ...itemData, estimated_amount: text })}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Số lượng</Text>
                <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={itemData.quantity}
                    onChangeText={(text) => setItemData({ ...itemData, quantity: text })}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Đơn giá</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={itemData.unit_price}
                    onChangeText={(text) => setItemData({ ...itemData, unit_price: text })}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Nhập mô tả"
                    value={itemData.description}
                    onChangeText={(text) => setItemData({ ...itemData, description: text })}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    filterButton: {
        padding: 4,
    },
    addButton: {
        padding: 4,
    },
    summaryCard: {
        backgroundColor: "#FFFFFF",
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    summaryItem: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    varianceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    varianceText: {
        fontSize: 13,
        fontWeight: "600",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#1F2937",
        padding: 0,
    },
    clearSearchButton: {
        marginLeft: 8,
    },
    card: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    cardHeaderLeft: {
        flex: 1,
        marginRight: 8,
    },
    cardHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    duplicateButton: {
        padding: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    cardVersion: {
        fontSize: 12,
        color: "#6B7280",
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
    budgetAmount: {
        fontSize: 20,
        fontWeight: "700",
        color: "#3B82F6",
        marginBottom: 12,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    progressText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
    },
    warningBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
    },
    warningText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#EF4444",
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    footerItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: "#6B7280",
    },
    compareButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
    },
    compareButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#3B82F6",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalContent: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalBody: {
        flex: 1,
    },
    modalBodyContent: {
        paddingBottom: Platform.OS === "ios" ? 100 : 80,
        paddingHorizontal: 16,
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
    input: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        backgroundColor: "#FFFFFF",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
    },
    itemsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    addItemButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    addItemText: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    itemsList: {
        gap: 8,
        marginBottom: 12,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    totalValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#3B82F6",
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        marginBottom: 8,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    itemAmount: {
        fontSize: 13,
        color: "#3B82F6",
        marginTop: 4,
    },
    itemActions: {
        flexDirection: "row",
        gap: 12,
    },
    emptyItemsText: {
        fontSize: 14,
        color: "#6B7280",
        fontStyle: "italic",
        textAlign: "center",
        padding: 20,
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    selectInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
    },
    placeholderText: {
        color: "#9CA3AF",
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    pickerContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "70%",
        padding: 16,
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
    formActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
    },
    cancelButtonText: {
        color: "#6B7280",
        fontSize: 16,
        fontWeight: "600",
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#3B82F6",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    filterModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    filterModal: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "50%",
    },
    filterModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    filterModalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    filterOption: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#F9FAFB",
    },
    filterOptionText: {
        fontSize: 16,
        color: "#1F2937",
    },
    filterOptionActive: {
        fontSize: 16,
        fontWeight: "600",
        color: "#3B82F6",
    },
    templateHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    templateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    templateButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#3B82F6",
    },
    templatePickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    templatePickerContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "70%",
        padding: 16,
    },
    templatePickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    templatePickerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    templateOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderRadius: 10,
        backgroundColor: "#F9FAFB",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    templateOptionLeft: {
        flex: 1,
    },
    templateOptionName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    templateOptionVersion: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 4,
    },
    templateOptionAmount: {
        fontSize: 14,
        fontWeight: "700",
        color: "#3B82F6",
    },
});

