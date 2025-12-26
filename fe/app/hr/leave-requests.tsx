import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { leaveApi, LeaveRequest, CreateLeaveRequestData } from "@/api/leaveApi";
import { projectApi } from "@/api/projectApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import BackButton from "@/components/BackButton";

const LEAVE_TYPE_LABELS: Record<string, string> = {
    annual: "Phép năm",
    sick: "Phép ốm",
    unpaid: "Phép không lương",
    maternity: "Thai sản",
    paternity: "Chăm con",
    other: "Khác",
};

export default function LeaveRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [formData, setFormData] = useState<CreateLeaveRequestData>({
        project_id: undefined,
        leave_type: "annual",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        reason: "",
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadRequests();
        loadProjects();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const response = await leaveApi.getRequests();
            if (response.success) {
                setRequests(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading leave requests:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadProjects = async () => {
        try {
            const response = await projectApi.getProjects({ my_projects: true });
            if (response.success) {
                setProjects(response.data?.data || []);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadRequests();
    };

    const handleCreate = async () => {
        if (!formData.start_date || !formData.end_date) {
            Alert.alert("Lỗi", "Vui lòng chọn ngày bắt đầu và kết thúc");
            return;
        }

        try {
            setSubmitting(true);
            const response = await leaveApi.createRequest(formData);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo đơn nghỉ phép thành công");
                setShowCreateModal(false);
                resetForm();
                loadRequests();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo đơn nghỉ phép");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            project_id: undefined,
            leave_type: "annual",
            start_date: new Date().toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
            reason: "",
        });
    };

    const getStatusColor = (status: string) => {
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

    const renderItem = ({ item }: { item: LeaveRequest }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{LEAVE_TYPE_LABELS[item.leave_type]}</Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.start_date).toLocaleDateString("vi-VN")} -{" "}
                        {new Date(item.end_date).toLocaleDateString("vi-VN")}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + "20" },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status === "approved"
                            ? "Đã duyệt"
                            : item.status === "rejected"
                                ? "Từ chối"
                                : "Chờ duyệt"}
                    </Text>
                </View>
            </View>
            <Text style={styles.daysText}>{item.days} ngày</Text>
            {item.reason && <Text style={styles.reasonText}>{item.reason}</Text>}
            {item.project && (
                <Text style={styles.projectText}>Dự án: {item.project.name}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Đơn Nghỉ Phép</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={24} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có đơn nghỉ phép</Text>
                        </View>
                    }
                />
            )}

            {/* Create Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tạo Đơn Nghỉ Phép</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Loại nghỉ phép</Text>
                                <View style={styles.typeContainer}>
                                    {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.typeButton,
                                                formData.leave_type === key && styles.typeButtonActive,
                                            ]}
                                            onPress={() => setFormData({ ...formData, leave_type: key as any })}
                                        >
                                            <Text
                                                style={[
                                                    styles.typeButtonText,
                                                    formData.leave_type === key && styles.typeButtonTextActive,
                                                ]}
                                            >
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày bắt đầu</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <Text>{formData.start_date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showStartDatePicker && (
                                    <DateTimePicker
                                        value={new Date(formData.start_date)}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowStartDatePicker(false);
                                            if (date) {
                                                setFormData({
                                                    ...formData,
                                                    start_date: date.toISOString().split("T")[0],
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày kết thúc</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowEndDatePicker(true)}
                                >
                                    <Text>{formData.end_date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showEndDatePicker && (
                                    <DateTimePicker
                                        value={new Date(formData.end_date)}
                                        mode="date"
                                        display="default"
                                        minimumDate={new Date(formData.start_date)}
                                        onChange={(event, date) => {
                                            setShowEndDatePicker(false);
                                            if (date) {
                                                setFormData({
                                                    ...formData,
                                                    end_date: date.toISOString().split("T")[0],
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Lý do (tùy chọn)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Nhập lý do nghỉ phép"
                                    value={formData.reason}
                                    onChangeText={(text) => setFormData({ ...formData, reason: text })}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                onPress={handleCreate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Tạo Đơn</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    addButton: {
        padding: 4,
    },
    card: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    cardHeaderLeft: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 14,
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
    daysText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "600",
        marginTop: 4,
    },
    reasonText: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 8,
    },
    projectText: {
        fontSize: 13,
        color: "#9CA3AF",
        marginTop: 4,
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
        padding: 16,
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
    typeContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    typeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    typeButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    typeButtonText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    typeButtonTextActive: {
        color: "#FFFFFF",
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
});

