import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, ScrollView, TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { assetUsageApi, AssetUsage } from "@/api/assetUsageApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useSelector } from "react-redux";
import type { RootState } from "@/reducers/index";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

const STATUS_LABELS: Record<string, string> = {
    draft: "Nháp",
    pending_management: "Chờ BĐH duyệt",
    pending_accountant: "Chờ KT xác nhận",
    approved: "Đã duyệt",
    in_use: "Đang sử dụng",
    pending_return: "Chờ xác nhận trả",
    returned: "Đã trả",
    rejected: "Từ chối",
    pending_receive: "Chờ nhận",
};
const STATUS_COLORS: Record<string, string> = {
    draft: "#6B7280",
    pending_management: "#F59E0B",
    pending_accountant: "#8B5CF6",
    approved: "#06B6D4",
    in_use: "#3B82F6",
    pending_return: "#8B5CF6",
    returned: "#10B981",
    rejected: "#EF4444",
    pending_receive: "#F59E0B",
};

const STEPS = [
    { key: "draft", label: "Nháp" },
    { key: "pending_management", label: "BĐH" },
    { key: "pending_accountant", label: "KT" },
    { key: "in_use", label: "Đang SD" },
    { key: "returned", label: "Đã trả" },
];

export default function AssetUsageDetailScreen() {
    const router = useRouter();
    const { id, usageId } = useLocalSearchParams<{ id: string; usageId: string }>();
    const user = useSelector((state: RootState) => state.user);
    const { hasPermission } = useProjectPermissions(id || null);
    const [usage, setUsage] = useState<AssetUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectInput, setShowRejectInput] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await assetUsageApi.show(id!, Number(usageId));
            if (res.success) setUsage(res.data);
        } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể tải phiếu.");
        } finally { setLoading(false); }
    }, [id, usageId]);

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
                            case "submit": res = await assetUsageApi.submit(id!, Number(usageId)); break;
                            case "approveManagement": res = await assetUsageApi.approveManagement(id!, Number(usageId)); break;
                            case "confirmAccountant": res = await assetUsageApi.confirmAccountant(id!, Number(usageId)); break;
                            case "requestReturn": res = await assetUsageApi.requestReturn(id!, Number(usageId)); break;
                            case "confirmReturn": res = await assetUsageApi.confirmReturn(id!, Number(usageId)); break;
                            case "delete": res = await assetUsageApi.destroy(id!, Number(usageId)); break;
                        }
                        if (res?.success) {
                            Alert.alert("Thành công", res.message || "Thao tác thành công");
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
        if (!rejectReason.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối.");
            return;
        }
        try {
            setActionLoading(true);
            const res = await assetUsageApi.reject(id!, Number(usageId), rejectReason);
            if (res?.success) {
                Alert.alert("Thành công", res.message || "Đã từ chối phiếu");
                setShowRejectInput(false);
                setRejectReason("");
                loadData();
            }
        } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Thao tác thất bại.");
        } finally { setActionLoading(false); }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Sử Dụng TB" showBackButton />
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /></View>
            </View>
        );
    }

    if (!usage) return null;

    // Determine step index — handle rejected as special case
    const getStepIndex = () => {
        if (usage.status === "rejected") return -1;
        if (usage.status === "pending_return") return 3;
        return STEPS.findIndex(s => s.key === usage.status);
    };
    const currentStepIndex = getStepIndex();
    const isCreator = user?.id?.toString() === usage.created_by?.toString();
    const canApproveManagement = hasPermission(Permissions.COST_APPROVE_MANAGEMENT);
    const canApproveAccountant = hasPermission(Permissions.COST_APPROVE_ACCOUNTANT);
    const canEdit = hasPermission(Permissions.EQUIPMENT_UPDATE || 'equipment.update');
    const canDelete = hasPermission(Permissions.EQUIPMENT_DELETE || 'equipment.delete');

    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi Tiết Sử Dụng TB" showBackButton />
            <ScrollView style={styles.content}>

                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[usage.status] + "15" }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[usage.status] }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[usage.status] }]}>
                        {STATUS_LABELS[usage.status] || usage.status}
                    </Text>
                </View>

                {/* Stepper */}
                {usage.status !== "rejected" && (
                    <View style={styles.stepperContainer}>
                        {STEPS.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const color = isCompleted ? "#10B981" : isCurrent ? STATUS_COLORS[usage.status] : "#D1D5DB";
                            return (
                                <React.Fragment key={step.key}>
                                    <View style={styles.stepItem}>
                                        <View style={[styles.stepCircle, { backgroundColor: color }]}>
                                            {isCompleted ? <Ionicons name="checkmark" size={14} color="#FFF" /> :
                                                <Text style={styles.stepNumber}>{index + 1}</Text>}
                                        </View>
                                        <Text style={[styles.stepLabel, isCurrent && { color, fontWeight: "700" }]}>{step.label}</Text>
                                    </View>
                                    {index < STEPS.length - 1 && (
                                        <View style={[styles.stepLine, { backgroundColor: isCompleted ? "#10B981" : "#E5E7EB" }]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>
                )}

                {/* Rejection reason */}
                {usage.status === "rejected" && usage.rejection_reason && (
                    <View style={styles.rejectionCard}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <Ionicons name="close-circle" size={18} color="#EF4444" />
                            <Text style={styles.rejectionTitle}>Lý do từ chối</Text>
                        </View>
                        <Text style={styles.rejectionText}>{usage.rejection_reason}</Text>
                    </View>
                )}

                {/* Equipment Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Thông tin thiết bị</Text>
                    <InfoRow label="Thiết bị" value={usage.asset?.name || "—"} />
                    <InfoRow label="Mã" value={usage.asset?.asset_code || usage.asset?.code || "—"} />
                    <InfoRow label="Số lượng" value={String(usage.quantity)} />
                </View>

                {/* Usage Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Thông tin sử dụng</Text>
                    <InfoRow label="Người lập" value={usage.creator?.name || "—"} />
                    <InfoRow label="Người nhận" value={usage.receiver?.name || "—"} />
                    <InfoRow label="Ngày nhận" value={fmtDate(usage.received_date)} />
                    {usage.returned_date && (
                        <InfoRow label="Ngày trả" value={fmtDate(usage.returned_date)} />
                    )}
                    {usage.notes && <InfoRow label="Ghi chú" value={usage.notes} />}
                </View>

                {/* Approval History */}
                {(usage.approver || usage.confirmer) && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Lịch sử duyệt</Text>
                        {usage.approver && (
                            <InfoRow label="BĐH duyệt" value={`${usage.approver.name} · ${fmtDate(usage.approved_at)}`} />
                        )}
                        {usage.confirmer && (
                            <InfoRow label="KT xác nhận" value={`${usage.confirmer.name} · ${fmtDate(usage.confirmed_at)}`} />
                        )}
                    </View>
                )}

                {/* Reject Input */}
                {showRejectInput && (
                    <View style={styles.rejectCard}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 8 }}>Lý do từ chối</Text>
                        <TextInput
                            style={styles.rejectInput}
                            placeholder="Nhập lý do từ chối..."
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                        />
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#FEE2E2", flex: 1 }]}
                                onPress={handleReject}
                                disabled={actionLoading}
                            >
                                <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Xác nhận từ chối</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#F3F4F6", flex: 1 }]}
                                onPress={() => { setShowRejectInput(false); setRejectReason(""); }}
                            >
                                <Text style={[styles.actionBtnText, { color: "#6B7280" }]}>Hủy</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionSection}>

                    {/* Draft / Rejected: Edit + Submit */}
                    {["draft", "rejected"].includes(usage.status) && (isCreator || canEdit) && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
                                onPress={() => handleAction("submit", "Gửi duyệt phiếu này?")}
                                disabled={actionLoading}
                            >
                                <Ionicons name="send" size={18} color="#FFF" />
                                <Text style={styles.actionBtnText}>Gửi Duyệt</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#EEF2FF" }]}
                                onPress={() => router.push(`/projects/${id}/equipment/usage/edit/${usageId}` as any)}
                                disabled={actionLoading}
                            >
                                <Ionicons name="create-outline" size={18} color="#4F46E5" />
                                <Text style={[styles.actionBtnText, { color: "#4F46E5" }]}>Sửa Phiếu</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Pending Management: BĐH Approve / Reject */}
                    {usage.status === "pending_management" && canApproveManagement && !showRejectInput && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                                onPress={() => handleAction("approveManagement", "BĐH duyệt phiếu này?")}
                                disabled={actionLoading}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                                <Text style={styles.actionBtnText}>BĐH Duyệt</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                                onPress={() => setShowRejectInput(true)}
                                disabled={actionLoading}
                            >
                                <Ionicons name="close-circle" size={18} color="#EF4444" />
                                <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Từ Chối</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Pending Accountant: KT Confirm / Reject */}
                    {usage.status === "pending_accountant" && canApproveAccountant && !showRejectInput && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
                                onPress={() => handleAction("confirmAccountant", "KT xác nhận phiếu này?")}
                                disabled={actionLoading}
                            >
                                <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                                <Text style={styles.actionBtnText}>KT Xác Nhận</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                                onPress={() => setShowRejectInput(true)}
                                disabled={actionLoading}
                            >
                                <Ionicons name="close-circle" size={18} color="#EF4444" />
                                <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Từ Chối</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* In Use: Request Return */}
                    {usage.status === "in_use" && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                            onPress={() => handleAction("requestReturn", "Yêu cầu trả thiết bị?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="return-down-back" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Yêu Cầu Trả</Text>
                        </TouchableOpacity>
                    )}

                    {/* Pending Return: Confirm Return (KT only) */}
                    {usage.status === "pending_return" && canApproveAccountant && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                            onPress={() => handleAction("confirmReturn", "Xác nhận đã nhận lại thiết bị?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>KT Xác Nhận Nhận Lại</Text>
                        </TouchableOpacity>
                    )}

                    {/* Delete — only draft/rejected */}
                    {["draft", "rejected"].includes(usage.status) && (isCreator || canDelete) && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#FEE2E2", marginTop: 8 }]}
                            onPress={() => handleAction("delete", "Xóa phiếu này vĩnh viễn?")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="trash" size={18} color="#EF4444" />
                            <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Xóa Phiếu</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
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
    statusBadge: {
        flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 12, gap: 8,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 14, fontWeight: "700" },
    stepperContainer: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20,
        backgroundColor: "#FFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB",
    },
    stepItem: { alignItems: "center", width: 56 },
    stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    stepNumber: { fontSize: 12, fontWeight: "700", color: "#FFF" },
    stepLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
    stepLine: { flex: 1, height: 2, marginHorizontal: 2 },
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
    rejectionCard: {
        backgroundColor: "#FEF2F2", borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: "#FECACA",
    },
    rejectionTitle: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
    rejectionText: { fontSize: 13, color: "#B91C1C" },
    rejectCard: {
        backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: "#FECACA",
    },
    rejectInput: {
        borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12,
        fontSize: 14, minHeight: 60, textAlignVertical: "top",
    },
    actionSection: { marginTop: 8 },
    actionBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 10,
    },
    actionBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
