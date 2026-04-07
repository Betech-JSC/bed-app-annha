import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { kpiApi, Kpi, UpdateKpiData, VerifyKpiData } from "@/api/kpiApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function KpiDetailScreen() {
    const { id, kpiId } = useLocalSearchParams<{ id: string; kpiId: string }>();
    const router = useRouter();
    const [kpi, setKpi] = useState<Kpi | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Update Progress State
    const [progressModalVisible, setProgressModalVisible] = useState(false);
    const [newProgress, setNewProgress] = useState("");

    // Verify State
    const [verifyModalVisible, setVerifyModalVisible] = useState(false);
    const [verifyNote, setVerifyNote] = useState("");
    const [verifyStatus, setVerifyStatus] = useState<"verified_success" | "verified_fail">("verified_success");

    const { hasPermission } = useProjectPermissions(id!);

    useEffect(() => {
        loadKpi();
    }, [kpiId]);

    const loadKpi = async () => {
        try {
            setLoading(true);
            const response = await kpiApi.getKpi(id!, kpiId!);
            if (response.success) {
                setKpi(response.data);
            }
        } catch (error) {
            Alert.alert("Lỗi", "Không thể tải thông tin KPI");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProgress = async () => {
        if (!newProgress) return;
        try {
            setUpdating(true);
            const data: UpdateKpiData = {
                current_value: parseFloat(newProgress),
            };
            const response = await kpiApi.updateKpi(id!, kpiId!, data);
            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật tiến độ");
                setProgressModalVisible(false);
                setNewProgress("");
                loadKpi();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Cập nhật thất bại");
        } finally {
            setUpdating(false);
        }
    };

    const handleVerify = async () => {
        try {
            setUpdating(true);
            const data: VerifyKpiData = {
                status: verifyStatus,
                note: verifyNote
            };

            const response = await kpiApi.verifyKpi(id!, kpiId!, data);
            if (response.success) {
                Alert.alert("Thành công", "Đã xác nhận KPI");
                setVerifyModalVisible(false);
                setVerifyNote("");
                loadKpi();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Xác nhận thất bại");
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Xác nhận xóa",
            "Bạn có chắc chắn muốn xóa KPI này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await kpiApi.deleteKpi(id!, kpiId!);
                            Alert.alert("Thành công", "Đã xóa KPI");
                            router.back();
                        } catch (error) {
                            Alert.alert("Lỗi", "Không thể xóa KPI");
                        }
                    }
                }
            ]
        );
    };

    if (loading || !kpi) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    const progressPercent = Math.min(Math.max((kpi.current_value / kpi.target_value) * 100, 0), 100);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi Tiết KPI" showBackButton />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{kpi.title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(kpi.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(kpi.status) }]}>
                                {getStatusText(kpi.status)}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.description}>{kpi.description || "Không có mô tả"}</Text>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.label}>Người thực hiện</Text>
                            <View style={styles.userRow}>
                                {/* Avatar here if needed */}
                                <Text style={styles.value}>{kpi.user?.name}</Text>
                            </View>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.label}>Người tạo</Text>
                            <Text style={styles.value}>{kpi.creator?.name}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={styles.label}>Ngày bắt đầu</Text>
                            <Text style={styles.value}>{kpi.start_date ? new Date(kpi.start_date).toLocaleDateString("vi-VN") : "--"}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.label}>Hạn chót</Text>
                            <Text style={styles.value}>{kpi.end_date ? new Date(kpi.end_date).toLocaleDateString("vi-VN") : "--"}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Tiến độ thực hiện</Text>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${progressPercent}%`, backgroundColor: getStatusColor(kpi.status) }
                                ]}
                            />
                        </View>
                        <View style={styles.progressStats}>
                            <Text style={styles.progressText}>
                                <Text style={styles.progressHighlight}>{Math.round(kpi.current_value)}</Text> / {Math.round(kpi.target_value)} {kpi.unit}
                            </Text>
                            <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionButtons}>
                        {/* User can update progress if not verified */}
                        {kpi.status !== 'verified_success' && kpi.status !== 'verified_fail' && (
                            // TODO: Check if current user is assignee or manager
                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={() => setProgressModalVisible(true)}
                            >
                                <Ionicons name="create-outline" size={20} color="#FFF" />
                                <Text style={styles.updateButtonText}>Cập nhật tiến độ</Text>
                            </TouchableOpacity>
                        )}

                        {/* Manager Verification */}
                        <PermissionGuard permission={Permissions.KPI_VERIFY} projectId={id}>
                            {kpi.status === 'completed' || kpi.status === 'pending' ? (
                                <TouchableOpacity
                                    style={styles.verifyButton}
                                    onPress={() => setVerifyModalVisible(true)}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                    <Text style={styles.verifyButtonText}>Đánh giá / Duyệt</Text>
                                </TouchableOpacity>
                            ) : null}
                        </PermissionGuard>
                    </View>
                </View>

                <PermissionGuard permission={Permissions.KPI_DELETE} projectId={id}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.deleteButtonText}>Xóa KPI này</Text>
                    </TouchableOpacity>
                </PermissionGuard>
            </ScrollView>

            {/* Update Progress Modal */}
            <Modal visible={progressModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Cập nhật tiến độ</Text>
                        <Text style={styles.modalSubtitle}>Nhập giá trị hiện tại ({kpi.unit})</Text>

                        <TextInput
                            style={styles.modalInput}
                            value={newProgress}
                            onChangeText={setNewProgress}
                            keyboardType="numeric"
                            placeholder="0"
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setProgressModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonConfirm}
                                onPress={handleUpdateProgress}
                                disabled={updating}
                            >
                                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonConfirmText}>Lưu</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Verify Modal */}
            <Modal visible={verifyModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Đánh giá KPI</Text>

                        <View style={styles.verifyOptions}>
                            <TouchableOpacity
                                style={[styles.verifyOption, verifyStatus === 'verified_success' && styles.verifyOptionSelectedSuccess]}
                                onPress={() => setVerifyStatus('verified_success')}
                            >
                                <Ionicons name="checkmark-circle" size={24} color={verifyStatus === 'verified_success' ? "#FFF" : "#10B981"} />
                                <Text style={[styles.verifyOptionText, verifyStatus === 'verified_success' && { color: '#FFF' }]}>Đạt</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.verifyOption, verifyStatus === 'verified_fail' && styles.verifyOptionSelectedFail]}
                                onPress={() => setVerifyStatus('verified_fail')}
                            >
                                <Ionicons name="close-circle" size={24} color={verifyStatus === 'verified_fail' ? "#FFF" : "#EF4444"} />
                                <Text style={[styles.verifyOptionText, verifyStatus === 'verified_fail' && { color: '#FFF' }]}>Không đạt</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                            value={verifyNote}
                            onChangeText={setVerifyNote}
                            multiline
                            placeholder="Nhập nhận xét..."
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => setVerifyModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButtonConfirm, { backgroundColor: verifyStatus === 'verified_fail' ? '#EF4444' : '#10B981' }]}
                                onPress={handleVerify}
                                disabled={updating}
                            >
                                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonConfirmText}>Xác nhận</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { padding: 16 },

    card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    title: { fontSize: 18, fontWeight: "700", color: "#1F2937", flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: "600" },

    description: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
    divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 16 },

    infoRow: { flexDirection: "row", marginBottom: 12 },
    infoItem: { flex: 1 },
    label: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
    value: { fontSize: 14, fontWeight: "500", color: "#1F2937" },
    userRow: { flexDirection: "row", alignItems: "center" },

    sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
    progressContainer: { marginBottom: 20 },
    progressBarBg: { height: 12, backgroundColor: "#E5E7EB", borderRadius: 6, overflow: "hidden", marginBottom: 8 },
    progressBarFill: { height: "100%", borderRadius: 6 },
    progressStats: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    progressText: { fontSize: 14, color: "#4B5563" },
    progressHighlight: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    progressPercent: { fontSize: 14, fontWeight: "600", color: "#6B7280" },

    actionButtons: { gap: 12, marginTop: 8 },
    updateButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "#3B82F6", borderRadius: 8 },
    updateButtonText: { color: "#FFF", fontWeight: "600", marginLeft: 8 },
    verifyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "#10B981", borderRadius: 8 },
    verifyButtonText: { color: "#FFF", fontWeight: "600", marginLeft: 8 },

    deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "#FEE2E2", borderRadius: 8 },
    deleteButtonText: { color: "#EF4444", fontWeight: "600", marginLeft: 8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 8, textAlign: "center" },
    modalSubtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16, textAlign: "center" },
    modalInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },

    modalActions: { flexDirection: "row", gap: 12 },
    modalButtonCancel: { flex: 1, padding: 12, backgroundColor: "#F3F4F6", borderRadius: 8, alignItems: "center" },
    modalButtonCancelText: { color: "#4B5563", fontWeight: "600" },
    modalButtonConfirm: { flex: 1, padding: 12, backgroundColor: "#3B82F6", borderRadius: 8, alignItems: "center" },
    modalButtonConfirmText: { color: "#FFF", fontWeight: "600" },

    verifyOptions: { flexDirection: "row", gap: 12, marginBottom: 16 },
    verifyOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, gap: 8 },
    verifyOptionSelectedSuccess: { backgroundColor: "#10B981", borderColor: "#10B981" },
    verifyOptionSelectedFail: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
    verifyOptionText: { fontWeight: "600", color: "#374151" },
});
