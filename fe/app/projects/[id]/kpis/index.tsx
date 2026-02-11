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
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { kpiApi, Kpi, CreateKpiData } from "@/api/kpiApi";
import { projectApi } from "@/api/projectApi";
import { personnelApi } from "@/api/personnelApi";
import { Ionicons } from "@expo/vector-icons";
import {
    ScreenHeader,
    PermissionGuard,
    PermissionDenied,
    DatePickerInput,
} from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function KpiListScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const [kpis, setKpis] = useState<Kpi[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Form State
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetValue, setTargetValue] = useState(""); // string for input
    const [unit, setUnit] = useState("%");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const [submitting, setSubmitting] = useState(false);

    const [permissionDenied, setPermissionDenied] = useState(false);
    const { hasPermission } = useProjectPermissions(id!);

    useEffect(() => {
        loadKpis();
        loadEmployees();
    }, [id]);

    useFocusEffect(
        React.useCallback(() => {
            loadKpis();
        }, [id])
    );

    const loadKpis = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setPermissionDenied(false);
            const response = await kpiApi.getKpis(id!);
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
            // Get all project personnel
            // Or get all users if needed. Better to get personnel of this project
            // For now, let's use projectApi.getAllUsers() and maybe filter
            // Ideally we should use personnelApi.getPersonnel(id)
            const response = await personnelApi.getPersonnel(id!);
            if (response.success) {
                setEmployees(response.data || []);
            }
        } catch (error) {
            // If fail, try fallback
            console.log("Failed to load personnel, trying all users");
            const response = await projectApi.getAllUsers();
            if (response.success) {
                setEmployees(response.data || []);
            }
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
            const data: CreateKpiData = {
                user_id: selectedUser,
                title,
                description,
                target_value: parseFloat(targetValue),
                unit,
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate.toISOString().split("T")[0],
            };

            const response = await kpiApi.createKpi(id!, data);
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
        setStartDate(new Date());
        setEndDate(new Date());
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "verified_success": return "#10B981"; // Green
            case "verified_fail": return "#EF4444"; // Red
            case "completed": return "#3B82F6"; // Blue (Waiting verification)
            case "pending": return "#F59E0B"; // Yellow/Orange
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

    const renderKpiItem = ({ item }: { item: Kpi }) => {
        const progress = Math.min(Math.max((item.current_value / item.target_value) * 100, 0), 100);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/projects/${id}/kpis/${item.id}`)}
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

                {item.end_date && (
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
                <ScreenHeader title="Quản Lý KPI" showBackButton />
                <PermissionDenied />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Quản Lý KPI"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.KPI_CREATE} projectId={id}>
                        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
                            <Ionicons name="add" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Chưa có KPI nào được tạo</Text>
                        </View>
                    }
                />
            )}

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
                                        key={emp.user_id || emp.id}
                                        style={[
                                            styles.employeeChip,
                                            selectedUser === (emp.user_id || emp.id) && styles.employeeChipSelected
                                        ]}
                                        onPress={() => setSelectedUser(emp.user_id || emp.id)}
                                    >
                                        <Text style={[
                                            styles.employeeChipText,
                                            selectedUser === (emp.user_id || emp.id) && styles.employeeChipTextSelected
                                        ]}>
                                            {emp.user?.name || emp.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tên KPI <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ví dụ: Hoàn thành thiết kế móng"
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

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                                <DatePickerInput
                                    label="Ngày bắt đầu"
                                    value={startDate}
                                    onChange={(date) => {
                                        if (date) setStartDate(date);
                                    }}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <DatePickerInput
                                    label="Ngày kết thúc"
                                    value={endDate}
                                    onChange={(date) => {
                                        if (date) setEndDate(date);
                                    }}
                                    minimumDate={startDate}
                                />
                            </View>
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
    dateButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12 },

    employeeSelector: { flexDirection: "row" },
    employeeChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#E5E7EB", borderRadius: 20, marginRight: 8 },
    employeeChipSelected: { backgroundColor: "#3B82F6" },
    employeeChipText: { color: "#374151" },
    employeeChipTextSelected: { color: "#FFF", fontWeight: "600" },

    modalFooter: { flexDirection: "row", padding: 16, backgroundColor: "#FFF", borderTopWidth: 1, borderColor: "#E5E7EB", gap: 12 },
    cancelButton: { flex: 1, padding: 14, backgroundColor: "#F3F4F6", borderRadius: 8, alignItems: "center" },
    cancelButtonText: { fontWeight: "600", color: "#4B5563" },
    submitButton: { flex: 1, padding: 14, backgroundColor: "#3B82F6", borderRadius: 8, alignItems: "center" },
    submitButtonText: { fontWeight: "600", color: "#FFF" },
    disabledButton: { opacity: 0.7 },
});
