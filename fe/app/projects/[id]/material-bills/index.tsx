import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { materialBillApi, MaterialBill } from "@/api/materialBillApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionGuard, PermissionDenied } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function MaterialBillsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = useProjectPermissions(id);
    const [bills, setBills] = useState<MaterialBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");

    const loadBills = useCallback(async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            const response = await materialBillApi.getBills(id!);
            if (response.success) {
                setBills(response.data.data || []);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem hóa đơn vật liệu.");
            } else {
                Alert.alert("Lỗi", "Không thể tải danh sách hóa đơn.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            loadBills();
        }, [loadBills])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadBills();
    };

    const getStatusInfo = (status: MaterialBill['status']) => {
        switch (status) {
            case 'draft': return { label: 'Nháp', color: '#6B7280', bg: '#F3F4F6' };
            case 'pending_management': return { label: 'Chờ BĐH', color: '#F59E0B', bg: '#FEF3C7' };
            case 'pending_accountant': return { label: 'Chờ Kế Toán', color: '#3B82F6', bg: '#DBEAFE' };
            case 'approved': return { label: 'Đã Duyệt', color: '#10B981', bg: '#D1FAE5' };
            case 'rejected': return { label: 'Từ Chối', color: '#EF4444', bg: '#FEE2E2' };
            default: return { label: status, color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    };

    const renderItem = ({ item }: { item: MaterialBill }) => {
        const { label, color, bg } = getStatusInfo(item.status);
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/projects/${id}/material-bills/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.billNumber}>
                            {item.bill_number ? `#${item.bill_number}` : `Hóa đơn mã ${item.id}`}
                        </Text>
                        <Text style={styles.supplierName}>{item.supplier?.name || "N/A"}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                        <Text style={[styles.statusText, { color }]}>{label}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoText}>
                            {new Date(item.bill_date).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>
                    <Text style={styles.totalAmount}>{formatCurrency(item.total_amount)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Hóa Đơn Vật Liệu" showBackButton />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Hóa Đơn Vật Liệu"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.MATERIAL_CREATE} projectId={id}>
                        <TouchableOpacity
                            onPress={() => router.push(`/projects/${id}/material-bills/create`)}
                            style={styles.addButton}
                        >
                            <Ionicons name="add" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={bills}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có hóa đơn vật liệu nào</Text>
                        </View>
                    }
                />
            )}
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
    addButton: {
        padding: 4,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
        marginBottom: 12,
    },
    billNumber: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    supplierName: {
        fontSize: 14,
        color: "#6B7280",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    infoText: {
        fontSize: 13,
        color: "#6B7280",
    },
    totalAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: "center",
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: "#6B7280",
    },
});
