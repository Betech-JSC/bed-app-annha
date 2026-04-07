import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, ScrollView, Modal, TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { equipmentPurchaseApi, EquipmentPurchase } from "@/api/equipmentPurchaseApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, UniversalFileUploader } from "@/components";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

const STATUS_LABELS: Record<string, string> = {
    draft: "Nháp", pending_management: "Chờ BĐH duyệt",
    pending_accountant: "Chờ Kế toán", completed: "Hoàn tất", rejected: "Từ chối",
};
const STATUS_COLORS: Record<string, string> = {
    draft: "#6B7280", pending_management: "#F59E0B",
    pending_accountant: "#8B5CF6", completed: "#10B981", rejected: "#EF4444",
};

const WORKFLOW_STEPS = [
    { key: "draft", label: "Nháp" },
    { key: "pending_management", label: "Chờ BĐH" },
    { key: "pending_accountant", label: "Chờ KT" },
    { key: "completed", label: "Nhập kho" },
];

const formatCurrency = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";

export default function PurchaseDetailScreen() {
    const router = useRouter();
    const { id, purchaseId } = useLocalSearchParams<{ id: string; purchaseId: string }>();
    const { hasPermission } = useProjectPermissions(id);
    const [purchase, setPurchase] = useState<EquipmentPurchase | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await equipmentPurchaseApi.show(id!, Number(purchaseId));
            if (res.success) setPurchase(res.data);
        } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể tải phiếu mua.");
        } finally { setLoading(false); }
    }, [id, purchaseId]);

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
                            case "submit": res = await equipmentPurchaseApi.submit(id!, Number(purchaseId)); break;
                            case "approve": res = await equipmentPurchaseApi.approveManagement(id!, Number(purchaseId)); break;
                            case "confirm": res = await equipmentPurchaseApi.confirmAccountant(id!, Number(purchaseId)); break;
                            case "delete": res = await equipmentPurchaseApi.destroy(id!, Number(purchaseId)); break;
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
            const res = await equipmentPurchaseApi.rejectManagement(id!, Number(purchaseId), rejectReason.trim());
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
                <ScreenHeader title="Chi Tiết Phiếu Mua" showBackButton />
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /></View>
            </View>
        );
    }

    if (!purchase) return null;

    const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.key === purchase.status);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi Tiết Phiếu Mua" showBackButton />
            <ScrollView style={styles.content}>
                {/* Stepper */}
                {purchase.status !== "rejected" && (
                    <View style={styles.stepperContainer}>
                        {WORKFLOW_STEPS.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const color = isCompleted ? "#10B981" : isCurrent ? STATUS_COLORS[purchase.status] : "#D1D5DB";
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

                {purchase.status === "rejected" && purchase.rejection_reason && (
                    <View style={styles.rejectionBanner}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.rejectionTitle}>Đã bị từ chối</Text>
                            <Text style={styles.rejectionReason}>{purchase.rejection_reason}</Text>
                        </View>
                    </View>
                )}

                {/* Items List */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Danh sách thiết bị ({purchase.items?.length || 0})</Text>
                    {purchase.items?.map((item, index) => (
                        <View key={item.id || index} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                {item.code && <Text style={styles.itemCode}>Mã: {item.code}</Text>}
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.itemQty}>SL: {item.quantity}</Text>
                                <Text style={styles.itemPrice}>{formatCurrency(item.total_price || (item.quantity * item.unit_price))}</Text>
                            </View>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tổng cộng</Text>
                        <Text style={styles.totalValue}>{formatCurrency(purchase.total_amount)}</Text>
                    </View>
                </View>

                {/* People */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Người xử lý</Text>
                    <InfoRow label="Người lập" value={purchase.creator?.name || "—"} />
                    {purchase.approver && <InfoRow label="BĐH duyệt" value={purchase.approver.name} />}
                    {purchase.confirmer && <InfoRow label="KT xác nhận" value={purchase.confirmer.name} />}
                    {purchase.notes && <InfoRow label="Ghi chú" value={purchase.notes} />}
                </View>

                {/* Attachments */}
                {purchase.attachments && purchase.attachments.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Đính kèm</Text>
                        <UniversalFileUploader
                            multiple={true}
                            initialFiles={purchase.attachments}
                            disabled={true}
                            showPreview={true}
                            onUploadComplete={() => {}}
                        />
                    </View>
                )}

                {purchase.status === "completed" && (
                    <View style={styles.successBanner}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.successText}>Thiết bị đã được nhập vào kho công ty</Text>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionSection}>
                    {(purchase.status === "draft" || purchase.status === "rejected") && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
                            onPress={() => handleAction("submit", "Gửi phiếu mua để BĐH duyệt?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="send" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Gửi Duyệt</Text>
                        </TouchableOpacity>
                    )}
                    {purchase.status === "pending_management" && hasPermission(Permissions.EQUIPMENT_APPROVE) && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#10B981", flex: 1 }]}
                                onPress={() => handleAction("approve", "BĐH duyệt phiếu mua này?")}
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
                    {purchase.status === "pending_accountant" && hasPermission(Permissions.COST_APPROVE_ACCOUNTANT) && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
                            onPress={() => handleAction("confirm", "Xác nhận đã chuyển khoản? Thiết bị sẽ được nhập kho tự động.")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="wallet" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Xác Nhận CK & Nhập Kho</Text>
                        </TouchableOpacity>
                    )}
                    {purchase.status === "draft" && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                            onPress={() => handleAction("delete", "Xóa phiếu mua này?")}
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
                        <Text style={styles.modalTitle}>Từ chối phiếu mua</Text>
                        <TextInput
                            style={styles.rejectInput}
                            placeholder="Nhập lý do từ chối..."
                            placeholderTextColor="#9CA3AF"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
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

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { flex: 1, padding: 16 },
    stepperContainer: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20,
        backgroundColor: "#FFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB",
    },
    stepItem: { alignItems: "center", width: 56 },
    stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    stepNumber: { fontSize: 12, fontWeight: "700", color: "#FFF" },
    stepLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
    stepLine: { flex: 1, height: 2, marginHorizontal: 2 },
    rejectionBanner: {
        flexDirection: "row", backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 16,
        borderWidth: 1, borderColor: "#FEE2E2",
    },
    rejectionTitle: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
    rejectionReason: { fontSize: 13, color: "#991B1B", marginTop: 2 },
    successBanner: {
        flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5",
        borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#A7F3D0",
    },
    successText: { fontSize: 13, fontWeight: "600", color: "#065F46" },
    infoCard: {
        backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: "#E5E7EB",
    },
    infoTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    infoRow: {
        flexDirection: "row", justifyContent: "space-between", paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    },
    infoLabel: { fontSize: 13, color: "#6B7280", flex: 1 },
    infoValue: { fontSize: 13, fontWeight: "600", color: "#1F2937", flex: 1.5, textAlign: "right" },
    itemRow: {
        flexDirection: "row", justifyContent: "space-between", paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    },
    itemName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
    itemCode: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    itemQty: { fontSize: 12, color: "#6B7280" },
    itemPrice: { fontSize: 14, fontWeight: "700", color: "#059669", marginTop: 2 },
    totalRow: {
        flexDirection: "row", justifyContent: "space-between", paddingTop: 12,
        borderTopWidth: 2, borderTopColor: "#E5E7EB", marginTop: 4,
    },
    totalLabel: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
    totalValue: { fontSize: 16, fontWeight: "800", color: "#1E40AF" },
    actionSection: { marginTop: 8 },
    actionRow: { flexDirection: "row", gap: 10 },
    actionBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 10,
    },
    actionBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
    modalContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    rejectInput: {
        backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB",
        borderRadius: 10, padding: 12, fontSize: 14, color: "#1F2937", minHeight: 100,
    },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
    modalCancelBtn: { flex: 1, alignItems: "center", paddingVertical: 12, backgroundColor: "#F3F4F6", borderRadius: 10 },
    modalCancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
    modalSubmitBtn: { flex: 1, alignItems: "center", paddingVertical: 12, backgroundColor: "#EF4444", borderRadius: 10 },
    modalSubmitText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
