import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { assetUsageApi, AssetUsage } from "@/api/assetUsageApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useSelector } from "react-redux";
import type { RootState } from "@/reducers/index";

const STATUS_LABELS: Record<string, string> = {
    pending_receive: "Chờ xác nhận nhận", in_use: "Đang sử dụng",
    pending_return: "Chờ xác nhận trả", returned: "Đã trả",
};
const STATUS_COLORS: Record<string, string> = {
    pending_receive: "#F59E0B", in_use: "#3B82F6",
    pending_return: "#8B5CF6", returned: "#10B981",
};

const STEPS = [
    { key: "pending_receive", label: "Chờ nhận" },
    { key: "in_use", label: "Đang SD" },
    { key: "pending_return", label: "Chờ trả" },
    { key: "returned", label: "Đã trả" },
];

export default function AssetUsageDetailScreen() {
    const router = useRouter();
    const { id, usageId } = useLocalSearchParams<{ id: string; usageId: string }>();
    const user = useSelector((state: RootState) => state.user);
    const [usage, setUsage] = useState<AssetUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await assetUsageApi.show(id!, Number(usageId));
            if (res.success) setUsage(res.data);
        } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể tải phiếu mượn.");
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
                            case "confirmReceive": res = await assetUsageApi.confirmReceive(id!, Number(usageId)); break;
                            case "requestReturn": res = await assetUsageApi.requestReturn(id!, Number(usageId)); break;
                            case "confirmReturn": res = await assetUsageApi.confirmReturn(id!, Number(usageId)); break;
                            case "delete": res = await assetUsageApi.destroy(id!, Number(usageId)); break;
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

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Phiếu Mượn" showBackButton />
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /></View>
            </View>
        );
    }

    if (!usage) return null;

    const currentStepIndex = STEPS.findIndex(s => s.key === usage.status);
    const isReceiver = user?.id?.toString() === usage.receiver_id?.toString();
    const isCreator = user?.id?.toString() === usage.created_by?.toString();

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi Tiết Phiếu Mượn" showBackButton />
            <ScrollView style={styles.content}>
                {/* Stepper */}
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

                {/* Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Thông tin thiết bị</Text>
                    <InfoRow label="Thiết bị" value={usage.asset?.name || "—"} />
                    <InfoRow label="Mã" value={usage.asset?.asset_code || "—"} />
                    <InfoRow label="Số lượng" value={String(usage.quantity)} />
                    <InfoRow label="Trạng thái kho" value={usage.asset?.status === "in_use" ? "Đang SD" : usage.asset?.status === "in_stock" ? "Trong kho" : (usage.asset?.status || "—")} />
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Thông tin mượn/trả</Text>
                    <InfoRow label="Người lập" value={usage.creator?.name || "—"} />
                    <InfoRow label="Người nhận" value={usage.receiver?.name || "—"} />
                    <InfoRow label="Ngày nhận" value={new Date(usage.received_date).toLocaleDateString("vi-VN")} />
                    {usage.returned_date && (
                        <InfoRow label="Ngày trả" value={new Date(usage.returned_date).toLocaleDateString("vi-VN")} />
                    )}
                    {usage.notes && <InfoRow label="Ghi chú" value={usage.notes} />}
                </View>

                {/* Role Info */}
                <View style={styles.roleCard}>
                    <Ionicons name="information-circle" size={18} color="#3B82F6" />
                    <Text style={styles.roleText}>
                        {isReceiver ? "Bạn là người nhận thiết bị" :
                         isCreator ? "Bạn là người lập phiếu" :
                         "Bạn đang xem chi tiết phiếu mượn"}
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionSection}>
                    {usage.status === "pending_receive" && isReceiver && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
                            onPress={() => handleAction("confirmReceive", "Xác nhận đã nhận thiết bị? Tồn kho sẽ được trừ.")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="hand-left" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Xác Nhận Đã Nhận</Text>
                        </TouchableOpacity>
                    )}

                    {usage.status === "in_use" && isReceiver && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
                            onPress={() => handleAction("requestReturn", "Xác nhận đã trả thiết bị? Chờ người lập xác nhận.")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="return-down-back" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Đã Trả Thiết Bị</Text>
                        </TouchableOpacity>
                    )}

                    {usage.status === "pending_return" && isCreator && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                            onPress={() => handleAction("confirmReturn", "Xác nhận đã nhận lại thiết bị? Tồn kho sẽ được cộng lại.")}
                            disabled={actionLoading}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                            <Text style={styles.actionBtnText}>Xác Nhận Nhận Lại</Text>
                        </TouchableOpacity>
                    )}

                    {usage.status === "pending_receive" && isCreator && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                            onPress={() => handleAction("delete", "Xóa phiếu mượn này?")}
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
    roleCard: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#EFF6FF", borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: "#BFDBFE",
    },
    roleText: { fontSize: 13, color: "#1E40AF", fontWeight: "500" },
    actionSection: { marginTop: 8 },
    actionBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 10,
    },
    actionBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
