import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { officeKpiApi, OfficeKpi, CreateOfficeKpiData } from "@/api/officeKpiApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import {
    ScreenHeader,
    PermissionGuard,
    PermissionDenied,
    DatePickerInput,
    KpiStatsChart,
} from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { usePermissions } from "@/hooks/usePermissions";

export default function OfficeKpiListScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [kpis, setKpis] = useState<OfficeKpi[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Form State
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetValue, setTargetValue] = useState("");
    const [unit, setUnit] = useState("%");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const [submitting, setSubmitting] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const { hasPermission } = usePermissions();

    // Filter State
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterYear, setFilterYear] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [filterUserId, setFilterUserId] = useState<number | null>(null);

    useEffect(() => {
        loadKpis();
        loadEmployees();
    }, []);

    useEffect(() => {
        loadKpis();
    }, [filterYear, filterStatus, filterUserId]);

    useFocusEffect(
        React.useCallback(() => {
            loadKpis();
        }, [])
    );

    const loadKpis = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setPermissionDenied(false);

            const params: any = {};
            if (filterYear) params.year = filterYear;
            if (filterStatus) params.status = filterStatus;
            if (filterUserId) params.user_id = filterUserId;

            const response = await officeKpiApi.getKpis(params);
            if (response.success) {
                setKpis(response.data || []);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
            } else {
                console.error("Error loading KPIs:", error);
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            setLoadingEmployees(true);
            const response = await projectApi.getAllUsers();
            if (response.success) {
                setEmployees(response.data || []);
            }
        } catch (error) {
            console.error("Error loading employees:", error);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleCreateKpi = async () => {
        if (!selectedUser || !title || !targetValue || !unit) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            setSubmitting(true);
            const data: CreateOfficeKpiData = {
                user_id: selectedUser,
                title,
                description,
                target_value: parseFloat(targetValue),
                unit,
                year: selectedYear,
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate.toISOString().split("T")[0],
            };

            const response = await officeKpiApi.createKpi(data);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo KPI mới");
                setShowAddModal(false);
                resetForm();
                loadKpis();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo KPI");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedUser(null);
        setTitle("");
        setDescription("");
        setTargetValue("");
        setUnit("%");
        setSelectedYear(new Date().getFullYear());
        setStartDate(new Date());
        setEndDate(new Date());
    };

    const clearFilters = () => {
        setFilterYear(null);
        setFilterStatus(null);
        setFilterUserId(null);
    };

    const hasActiveFilters = () => {
        return filterYear !== null || filterStatus !== null || filterUserId !== null;
    };

    const getKpiStats = () => {
        const total = kpis.length;
        const pending = kpis.filter(k => k.status === "pending").length;
        const completed = kpis.filter(k => k.status === "completed").length;
        const verifiedSuccess = kpis.filter(k => k.status === "verified_success").length;
        const verifiedFail = kpis.filter(k => k.status === "verified_fail").length;

        return { total, pending, completed, verifiedSuccess, verifiedFail };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "verified_success": return "#10B981";
            case "verified_fail": return "#EF4444";
            case "completed": return "#3B82F6";
            case "pending": return "#F59E0B";
            default: return "#6B7280";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "verified_success": return "Đạt";
            case "verified_fail": return "Không đạt";
            case "completed": return "Chờ duyệt";
            case "pending": return "Đang thực hiện";
            default: return status;
        }
    };

    const renderKpiItem = ({ item }: { item: OfficeKpi }) => {
        const progress = Math.min(Math.max((item.current_value / item.target_value) * 100, 0), 100);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/hr/kpis/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.kpiTitle}>{item.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusText(item.status)}
                        </Text>
                    </View>
                </View>

                <Text style={styles.assigneeText}>
                    👤 {item.user?.name || `User #${item.user_id}`}
                </Text>

                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Tiến độ</Text>
                        <Text style={styles.progressValue}>
                            {item.current_value} / {item.target_value} {item.unit}
                        </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progress}%`, backgroundColor: getStatusColor(item.status) }
                            ]}
                        />
                    </View>
                </View>

                {item.year ? (
                    <Text style={styles.dateText}>
                        📅 Năm: {item.year}
                    </Text>
                ) : item.end_date && (
                    <Text style={styles.dateText}>
                        📅 Hạn chót: {new Date(item.end_date).toLocaleDateString("vi-VN")}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="KPI Văn Phòng" showBackButton />
                <PermissionDenied />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="KPI Văn Phòng"
                showBackButton
                rightComponent={
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => setShowFilterModal(true)}
                            style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
                        >
                            <Ionicons name="filter" size={20} color={hasActiveFilters() ? "#FFF" : "#3B82F6"} />
                            {hasActiveFilters() && (
                                <View style={styles.filterBadge}>
                                    <Text style={styles.filterBadgeText}>
                                        {[filterYear, filterStatus, filterUserId].filter(f => f !== null).length}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <PermissionGuard permission={Permissions.KPI_CREATE}>
                            <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
                                <Ionicons name="add" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </PermissionGuard>
                    </View>
                }
            />

            {/* Active Filters Display */}
            {hasActiveFilters() && (
                <View style={styles.activeFiltersContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
                        {filterYear && (
                            <View style={styles.activeFilterChip}>
                                <Text style={styles.activeFilterText}>Năm: {filterYear}</Text>
                                <TouchableOpacity onPress={() => setFilterYear(null)}>
                                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {filterStatus && (
                            <View style={styles.activeFilterChip}>
                                <Text style={styles.activeFilterText}>
                                    {getStatusText(filterStatus)}
                                </Text>
                                <TouchableOpacity onPress={() => setFilterStatus(null)}>
                                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {filterUserId && (
                            <View style={styles.activeFilterChip}>
                                <Text style={styles.activeFilterText}>
                                    {employees.find(e => e.id === filterUserId)?.name || `User #${filterUserId}`}
                                </Text>
                                <TouchableOpacity onPress={() => setFilterUserId(null)}>
                                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity style={styles.clearAllFiltersButton} onPress={clearFilters}>
                            <Text style={styles.clearAllFiltersText}>Xóa tất cả</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={kpis}
                    renderItem={renderKpiItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                    ListHeaderComponent={
                        <KpiStatsChart {...getKpiStats()} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>
                                {hasActiveFilters() ? "Không tìm thấy KPI phù hợp" : "Chưa có KPI nào được tạo"}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Filter Modal */}
            <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Lọc KPI</Text>
                        <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {/* Filter by Year */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Năm</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearSelector}>
                                <TouchableOpacity
                                    style={[
                                        styles.yearChip,
                                        filterYear === null && styles.yearChipSelected
                                    ]}
                                    onPress={() => setFilterYear(null)}
                                >
                                    <Text style={[
                                        styles.yearChipText,
                                        filterYear === null && styles.yearChipTextSelected
                                    ]}>
                                        Tất cả
                                    </Text>
                                </TouchableOpacity>
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <TouchableOpacity
                                        key={year}
                                        style={[
                                            styles.yearChip,
                                            filterYear === year && styles.yearChipSelected
                                        ]}
                                        onPress={() => setFilterYear(year)}
                                    >
                                        <Text style={[
                                            styles.yearChipText,
                                            filterYear === year && styles.yearChipTextSelected
                                        ]}>
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Filter by Status */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Trạng thái</Text>
                            <View style={styles.statusFilterGrid}>
                                <TouchableOpacity
                                    style={[
                                        styles.statusFilterChip,
                                        filterStatus === null && styles.statusFilterChipSelected
                                    ]}
                                    onPress={() => setFilterStatus(null)}
                                >
                                    <Text style={[
                                        styles.statusFilterText,
                                        filterStatus === null && styles.statusFilterTextSelected
                                    ]}>
                                        Tất cả
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.statusFilterChip,
                                        filterStatus === "pending" && styles.statusFilterChipSelected,
                                        filterStatus === "pending" && { borderColor: "#F59E0B" }
                                    ]}
                                    onPress={() => setFilterStatus("pending")}
                                >
                                    <Text style={[
                                        styles.statusFilterText,
                                        filterStatus === "pending" && { color: "#F59E0B", fontWeight: "600" }
                                    ]}>
                                        Đang thực hiện
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.statusFilterChip,
                                        filterStatus === "completed" && styles.statusFilterChipSelected,
                                        filterStatus === "completed" && { borderColor: "#3B82F6" }
                                    ]}
                                    onPress={() => setFilterStatus("completed")}
                                >
                                    <Text style={[
                                        styles.statusFilterText,
                                        filterStatus === "completed" && { color: "#3B82F6", fontWeight: "600" }
                                    ]}>
                                        Chờ duyệt
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.statusFilterChip,
                                        filterStatus === "verified_success" && styles.statusFilterChipSelected,
                                        filterStatus === "verified_success" && { borderColor: "#10B981" }
                                    ]}
                                    onPress={() => setFilterStatus("verified_success")}
                                >
                                    <Text style={[
                                        styles.statusFilterText,
                                        filterStatus === "verified_success" && { color: "#10B981", fontWeight: "600" }
                                    ]}>
                                        Đạt
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.statusFilterChip,
                                        filterStatus === "verified_fail" && styles.statusFilterChipSelected,
                                        filterStatus === "verified_fail" && { borderColor: "#EF4444" }
                                    ]}
                                    onPress={() => setFilterStatus("verified_fail")}
                                >
                                    <Text style={[
                                        styles.statusFilterText,
                                        filterStatus === "verified_fail" && { color: "#EF4444", fontWeight: "600" }
                                    ]}>
                                        Không đạt
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Filter by Employee */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Nhân viên</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.employeeSelector}>
                                <TouchableOpacity
                                    style={[
                                        styles.employeeChip,
                                        filterUserId === null && styles.employeeChipSelected
                                    ]}
                                    onPress={() => setFilterUserId(null)}
                                >
                                    <Text style={[
                                        styles.employeeChipText,
                                        filterUserId === null && styles.employeeChipTextSelected
                                    ]}>
                                        Tất cả
                                    </Text>
                                </TouchableOpacity>
                                {employees.map((emp) => (
                                    <TouchableOpacity
                                        key={emp.id}
                                        style={[
                                            styles.employeeChip,
                                            filterUserId === emp.id && styles.employeeChipSelected
                                        ]}
                                        onPress={() => setFilterUserId(emp.id)}
                                    >
                                        <Text style={[
                                            styles.employeeChipText,
                                            filterUserId === emp.id && styles.employeeChipTextSelected
                                        ]}>
                                            {emp.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={clearFilters}
                        >
                            <Text style={styles.cancelButtonText}>Xóa bộ lọc</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={() => setShowFilterModal(false)}
                        >
                            <Text style={styles.submitButtonText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add KPI Modal */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Tạo KPI Mới</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Nhân sự <Text style={styles.required}>*</Text></Text>
                            <ScrollView horizontal style={styles.employeeSelector}>
                                {employees.map(emp => (
                                    <TouchableOpacity
                                        key={emp.id}
                                        style={[
                                            styles.employeeChip,
                                            selectedUser === emp.id && styles.employeeChipSelected
                                        ]}
                                        onPress={() => setSelectedUser(emp.id)}
                                    >
                                        <Text style={[
                                            styles.employeeChipText,
                                            selectedUser === emp.id && styles.employeeChipTextSelected
                                        ]}>
                                            {emp.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tên KPI <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ví dụ: Hoàn thành báo cáo tháng"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 2, marginRight: 10 }]}>
                                <Text style={styles.label}>Mục tiêu <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="100"
                                    value={targetValue}
                                    onChangeText={setTargetValue}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Đơn vị <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="%"
                                    value={unit}
                                    onChangeText={setUnit}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Năm <Text style={styles.required}>*</Text></Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearSelector}>
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <TouchableOpacity
                                        key={year}
                                        style={[
                                            styles.yearChip,
                                            selectedYear === year && styles.yearChipSelected
                                        ]}
                                        onPress={() => setSelectedYear(year)}
                                    >
                                        <Text style={[
                                            styles.yearChipText,
                                            selectedYear === year && styles.yearChipTextSelected
                                        ]}>
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Mô tả</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Mô tả chi tiết công việc..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.disabledButton]}
                            onPress={handleCreateKpi}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Tạo KPI</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { padding: 16 },
    addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },

    card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    kpiTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", flex: 1, marginRight: 8 },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: "600" },

    assigneeText: { fontSize: 14, color: "#4B5563", marginBottom: 12 },

    progressContainer: { marginBottom: 12 },
    progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    progressLabel: { fontSize: 12, color: "#6B7280" },
    progressValue: { fontSize: 12, fontWeight: "600", color: "#1F2937" },
    progressBarBg: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden" },
    progressBarFill: { height: "100%", borderRadius: 4 },

    dateText: { fontSize: 12, color: "#6B7280" },

    emptyContainer: { alignItems: "center", marginTop: 60 },
    emptyText: { marginTop: 16, color: "#9CA3AF" },

    // Modal
    modalContainer: { flex: 1, backgroundColor: "#F9FAFB" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderColor: "#E5E7EB" },
    modalTitle: { fontSize: 18, fontWeight: "700" },
    modalBody: { flex: 1, padding: 16 },

    formGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#374151" },
    required: { color: "#EF4444" },
    input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 15 },
    textArea: { height: 80, textAlignVertical: "top" },

    row: { flexDirection: "row" },

    employeeSelector: { flexDirection: "row" },
    employeeChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#E5E7EB", borderRadius: 20, marginRight: 8 },
    employeeChipSelected: { backgroundColor: "#3B82F6" },
    employeeChipText: { color: "#374151" },
    employeeChipTextSelected: { color: "#FFF", fontWeight: "600" },

    yearSelector: { flexDirection: "row", marginBottom: 8 },
    yearChip: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#F3F4F6", borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: "#E5E7EB" },
    yearChipSelected: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
    yearChipText: { fontSize: 15, fontWeight: "500", color: "#374151" },
    yearChipTextSelected: { color: "#FFF", fontWeight: "600" },

    modalFooter: { flexDirection: "row", padding: 16, backgroundColor: "#FFF", borderTopWidth: 1, borderColor: "#E5E7EB", gap: 12 },
    cancelButton: { flex: 1, padding: 14, backgroundColor: "#F3F4F6", borderRadius: 8, alignItems: "center" },
    cancelButtonText: { fontWeight: "600", color: "#4B5563" },
    submitButton: { flex: 1, padding: 14, backgroundColor: "#3B82F6", borderRadius: 8, alignItems: "center" },
    submitButtonText: { fontWeight: "600", color: "#FFF" },
    disabledButton: { opacity: 0.7 },

    // Filter Styles
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    filterButtonActive: {
        backgroundColor: "#3B82F6",
    },
    filterBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: "#EF4444",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        color: "#FFF",
        fontSize: 11,
        fontWeight: "700",
    },

    // Active Filters Display
    activeFiltersContainer: {
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        paddingVertical: 8,
    },
    activeFiltersScroll: {
        paddingHorizontal: 16,
    },
    activeFilterChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        gap: 6,
    },
    activeFilterText: {
        fontSize: 13,
        color: "#4F46E5",
        fontWeight: "500",
    },
    clearAllFiltersButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#FEE2E2",
        borderRadius: 16,
    },
    clearAllFiltersText: {
        fontSize: 13,
        color: "#EF4444",
        fontWeight: "600",
    },

    // Status Filter
    statusFilterGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    statusFilterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        minWidth: "30%",
        alignItems: "center",
    },
    statusFilterChipSelected: {
        backgroundColor: "#FFF",
        borderWidth: 2,
    },
    statusFilterText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#6B7280",
    },
    statusFilterTextSelected: {
        fontWeight: "600",
    },
});
