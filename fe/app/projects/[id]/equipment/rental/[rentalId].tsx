import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, ScrollView, Modal, TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentRentalApi, EquipmentRental } from "@/api/equipmentRentalApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, UniversalFileUploader } from "@/components";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";
import { useFocusEffect } from "expo-router";

const STATUS_LABELS: Record<string, string> = {
    draft: "Nháp", pending_management: "Chờ BĐH duyệt",
    pending_accountant: "Chờ Kế toán xác nhận", completed: "Hoàn tất",
    in_use: "Đang sử dụng", pending_return: "Chờ xác nhận trả", returned: "Đã hoàn trả",
    rejected: "Từ chối",
};
const STATUS_COLORS: Record<string, string> = {
    draft: "#6B7280", pending_management: "#F59E0B",
    pending_accountant: "#8B5CF6", completed: "#10B981",
    in_use: "#3B82F6", pending_return: "#F59E0B", returned: "#10B981",
    rejected: "#EF4444",
};

const WORKFLOW_STEPS = [
    { key: "draft", label: "Nháp" },
    { key: "pending_management", label: "Chờ BĐH" },
    { key: "pending_accountant", label: "Chờ KT" },
    { key: "in_use", label: "Đang dùng" },
    { key: "returned", label: "Đã trả" },
];

const formatCurrency = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";

export default function RentalDetailScreen() {
    const router = useRouter();
    const { id, rentalId } = useLocalSearchParams<{ id: string; rentalId: string }>();
    const { hasPermission } = useProjectPermissions(id);
    const [rental, setRental] = useState<EquipmentRental | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await equipmentRentalApi.show(id!, Number(rentalId));
            if (res.success) setRental(res.data);
        } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể tải phiếu thuê.");
        } finally { setLoading(false); }
    }, [id, rentalId]);

    useEffect(() => { loadData(); }, [loadData]);
    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const handleAction = async (action: string, confirmMsg: string) => {
        Alert.alert("Xác nhận", confirmMsg, [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xác nhận", onPress: async () => {
                    try {
                        setActionLoading(true);
                        let res;
                        switch (action) {
                            case "submit": res = await equipmentRentalApi.submit(id!, Number(rentalId)); break;
                            case "approve": res = await equipmentRentalApi.approveManagement(id!, Number(rentalId)); break;
                            case "confirm": res = await equipmentRentalApi.confirmAccountant(id!, Number(rentalId)); break;
                            case "requestReturn": res = await equipmentRentalApi.requestReturn(id!, Number(rentalId)); break;
                            case "confirmReturn": res = await equipmentRentalApi.confirmReturn(id!, Number(rentalId)); break;
                            case "delete": res = await equipmentRentalApi.destroy(id!, Number(rentalId)); break;
                        }
                        if (res?.success) {
                            Alert.alert("Thành công", res.message);
                            if (action === "delete") router.back();
                            else loadData();
                        }
                    } catch (e: any) {
                        Alert.alert("Lỗi", e.response?.data?.message || "Thao tác thất bại.");
                    } finally { setActionLoading(false); }
                }
            }
        ]);
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        try {
            setActionLoading(true);
            const res = await equipmentRentalApi.rejectManagement(id!, Number(rentalId), rejectReason.trim());
            if (res.success) {
                Alert.alert("Thành công", res.message);
                setShowRejectModal(false);
                setRejectReason("");
                loadData();
            }
        } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Từ chối thất bại.");
        } finally { setActionLoading(false); }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Phiếu Thuê" showBackButton />
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /></View>
            </View>
        );
    }

    if (!rental) return null;

    const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.key === rental.status);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi Tiết Phiếu Thuê" showBackButton />
            <ScrollView style={styles.content}>
                {/* Workflow Stepper */}
                {rental.status !== "rejected" && (
                    <View style={styles.stepperContainer}>
                        {WORKFLOW_STEPS.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const color = isCompleted ? "#10B981" : isCurrent ? STATUS_COLORS[rental.status] : "#D1D5DB";
                            return (
                                <React.Fragment key={step.key}>
                                    <View style={styles.stepItem}>
                                        <View style={[styles.stepCircle, { backgroundColor: color }]}>
                                            {isCompleted ? <Ionicons name="checkmark" size={14} color="#FFF" /> :
                                                <Text style={styles.stepNumber}>{index + 1}</Text>}
                                        </View>
                                        <Text style={[styles.stepLabel, isCurrent && { color, fontWeight: "700" }]}>{step.label}</Text>
                                    </View>
                                    {index < WORKFLOW_STEPS.length - 1 && (
                                        <View style={[styles.stepLine, { backgroundColor: isCompleted ? "#10B981" : "#E5E7EB" }]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>
                )}

                {/* Rejection Banner */}
                {rental.status === "rejected" && rental.rejection_reason && (
                    <View style={styles.rejectionBanner}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.rejectionTitle}>Đã bị từ chối</Text>
                            <Text style={styles.rejectionReason}>{rental.rejection_reason}</Text>
                        </View>
                    </View>
                )}

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Thông tin thuê</Text>
                    <InfoRow label="Tên thiết bị" value={rental.equipment_name} />
                    <InfoRow label="Số lượng" value={rental.quantity?.toString() || "1"} />
                    <InfoRow label="Đơn giá" value={formatCurrency(rental.unit_price || 0)} />
                    <InfoRow label="Tổng chi phí" value={formatCurrency(rental.total_cost)} valueColor="#059669" />
                    <InfoRow label="NCC" value={rental.supplier?.name || "—"} />
                    <InfoRow label="Thời gian" value={`${new Date(rental.rental_start_date).toLocaleDateString("vi-VN")} → ${new Date(rental.rental_end_date).toLocaleDateString("vi-VN")}`} />
                    {rental.notes && <InfoRow label="Ghi chú" value={rental.notes} />}
                </View>

                {/* People */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Người xử lý</Text>
                    <InfoRow label="Người lập" value={rental.creator?.name || "—"} />
                    {rental.approver && <InfoRow label="BĐH duyệt" value={rental.approver.name} />}
                    {rental.confirmer && <InfoRow label="KT xác nhận" value={rental.confirmer.name} />}
                </View>

                {/* Attachments */}
                {rental.attachments && rental.attachments.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Đính kèm</Text>
                        <UniversalFileUploader
                            multiple={true}
                            initialFiles={rental.attachments}
                            disabled={true}
                            showPreview={true}
                            onUploadComplete={() => {}}
                        />
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    {(rental.status === "draft" || rental.status === "rejected") && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
                            onPress={() => handleAction("submit", "Gửi phiếu thuê để BĐH duyệt?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="send" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Gửi Duyệt</Text>
                        </TouchableOpacity>
                    )}
                    {rental.status === "pending_management" && hasPermission(Permissions.EQUIPMENT_APPROVE) && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#10B981", flex: 1 }]}
                                onPress={() => handleAction("approve", "BĐH duyệt phiếu thuê này?")}
                                disabled={actionLoading}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                                <Text style={styles.actionBtnText}>BĐH Duyệt</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#EF4444", flex: 1 }]}
                                onPress={() => setShowRejectModal(true)}
                                disabled={actionLoading}
                            >
                                <Ionicons name="close-circle" size={18} color="#FFF" />
                                <Text style={styles.actionBtnText}>Từ Chối</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {rental.status === "pending_accountant" && hasPermission(Permissions.COST_APPROVE_ACCOUNTANT) && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
                            onPress={() => handleAction("confirm", "Xác nhận đã chuyển khoản?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="wallet" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Xác Nhận CK</Text>
                        </TouchableOpacity>
                    )}
                    {rental.status === "in_use" && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                            onPress={() => handleAction("requestReturn", "Đánh dấu thiết bị đã được trả?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="return-up-back" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Đánh Dấu Đã Trả</Text>
                        </TouchableOpacity>
                    )}
                    {rental.status === "pending_return" && hasPermission(Permissions.COST_APPROVE_ACCOUNTANT) && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                            onPress={() => handleAction("confirmReturn", "Xác nhận thiết bị đã được trả về kho?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="checkmark-done-circle" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>KT Xác Nhận Trả</Text>
                        </TouchableOpacity>
                    )}
                    {rental.status === "draft" && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                            onPress={() => handleAction("delete", "Xóa phiếu thuê này?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="trash" size={18} color="#EF4444" />
                            <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Xóa Phiếu</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Reject Modal */}
            <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Từ chối phiếu thuê</Text>
                        <TextInput
                            style={styles.rejectInput}
                            placeholder="Nhập lý do từ chối..."
                            placeholderTextColor="#9CA3AF"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowRejectModal(false); setRejectReason(""); }}>
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, !rejectReason.trim() && { opacity: 0.5 }]}
                                onPress={handleReject}
                                disabled={actionLoading || !rejectReason.trim()}
                            >
                                {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalSubmitText}>Xác nhận</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const InfoRow = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { flex: 1, padding: 16 },
    stepperContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20, backgroundColor: "#FFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
    stepItem: { alignItems: "center", width: 56 },
    stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    stepNumber: { fontSize: 12, fontWeight: "700", color: "#FFF" },
    stepLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
    stepLine: { flex: 1, height: 2, marginHorizontal: 2 },
    rejectionBanner: { flexDirection: "row", backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#FEE2E2" },
    rejectionTitle: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
    rejectionReason: { fontSize: 13, color: "#991B1B", marginTop: 2 },
    infoCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
    infoTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    infoLabel: { fontSize: 13, color: "#6B7280", flex: 1 },
    infoValue: { fontSize: 13, fontWeight: "600", color: "#1F2937", flex: 1.5, textAlign: "right" },
    actionSection: { marginTop: 8 },
    actionRow: { flexDirection: "row", gap: 10 },
    actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 10 },
    actionBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
    modalContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    rejectInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 12, fontSize: 14, color: "#1F2937", minHeight: 100 },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
    modalCancelBtn: { flex: 1, alignItems: "center", paddingVertical: 12, backgroundColor: "#F3F4F6", borderRadius: 10 },
    modalCancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
    modalSubmitBtn: { flex: 1, alignItems: "center", paddingVertical: 12, backgroundColor: "#EF4444", borderRadius: 10 },
    modalSubmitText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
