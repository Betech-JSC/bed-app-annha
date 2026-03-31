import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { materialBillApi, MaterialBill } from "@/api/materialBillApi";
import { materialApi, Material } from "@/api/materialApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionGuard, PermissionDenied } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Permissions } from "@/constants/Permissions";

const { width } = Dimensions.get("window");

type TabType = "statistics" | "bills";

export default function ProjectMaterialsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = useProjectPermissions(id!);
    
    const [activeTab, setActiveTab] = useState<TabType>("statistics");
    
    // Bills related state
    const [bills, setBills] = useState<MaterialBill[]>([]);
    const [loadingBills, setLoadingBills] = useState(true);
    
    // Statistics related state
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [summary, setSummary] = useState({
        total_material_cost: 0,
        approved_material_cost: 0,
        pending_material_cost: 0,
        total_materials_count: 0,
        total_bills: 0,
        approved_bills: 0,
        pending_bills: 0,
        draft_bills: 0,
    });
    
    const [refreshing, setRefreshing] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");

    const loadBills = useCallback(async (isRefreshing = false) => {
        try {
            if (!isRefreshing) setLoadingBills(true);
            const response = await materialBillApi.getBills(id!);
            if (response.success) {
                setBills(response.data.data || []);
            }
        } catch (error: any) {
            handleError(error, "Không thể tải danh sách hóa đơn");
        } finally {
            setLoadingBills(false);
        }
    }, [id]);

    const loadStats = useCallback(async (isRefreshing = false) => {
        try {
            if (!isRefreshing) setLoadingStats(true);
            const response = await materialApi.getMaterialsByProject(id!);
            if (response.success) {
                setMaterials(response.data.data || []);
                if (response.summary) {
                    setSummary(response.summary);
                }
            }
        } catch (error: any) {
            handleError(error, "Không thể tải số liệu thống kê");
        } finally {
            setLoadingStats(false);
        }
    }, [id]);

    const handleError = (error: any, defaultMessage: string) => {
        if (error.response?.status === 403) {
            setPermissionDenied(true);
            setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem thông tin này.");
        } else {
            const errorMessage = error.userMessage || error.response?.data?.message || defaultMessage;
            Alert.alert("Lỗi", errorMessage);
        }
    };

    const loadData = useCallback(async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        await Promise.all([loadBills(isRefreshing), loadStats(isRefreshing)]);
        setRefreshing(false);
    }, [loadBills, loadStats]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        loadData(true);
    };

    const getStatusInfo = (status: MaterialBill['status']) => {
        switch (status) {
            case 'draft': return { label: 'NHÁP', color: '#6B7280', bg: '#F3F4F6' };
            case 'pending_management': return { label: 'CHỜ BĐH', color: '#F59E0B', bg: '#FEF3C7' };
            case 'pending_accountant': return { label: 'CHỜ KẾ TOÁN', color: '#3B82F6', bg: '#DBEAFE' };
            case 'approved': return { label: 'ĐÃ DUYỆT', color: '#10B981', bg: '#D1FAE5' };
            case 'rejected': return { label: 'TỪ CHỐI', color: '#EF4444', bg: '#FEE2E2' };
            default: return { label: (status as string)?.toUpperCase(), color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
    };

    const renderBillItem = ({ item }: { item: MaterialBill }) => {
        const { label, color, bg } = getStatusInfo(item.status);
        return (
            <TouchableOpacity
                style={styles.billCard}
                onPress={() => router.push(`/projects/${id}/material-bills/${item.id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.billHeader}>
                    <View style={styles.billIdContainer}>
                        <Ionicons name="receipt-outline" size={16} color="#3B82F6" />
                        <Text style={styles.billNumber}>
                            {item.bill_number ? `${item.bill_number}` : `#${item.id}`}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: color }]} />
                        <Text style={[styles.statusText, { color }]}>{label}</Text>
                    </View>
                </View>

                <View style={styles.billBody}>
                    <Text style={styles.supplierName} numberOfLines={1}>
                        {item.supplier?.name || "Chi phí không tên"}
                    </Text>
                    {item.notes && (
                        <Text style={styles.billNotes} numberOfLines={1}>{item.notes}</Text>
                    )}
                </View>

                <View style={styles.billFooter}>
                    <View style={styles.billMeta}>
                        <Ionicons name="calendar-clear-outline" size={13} color="#9CA3AF" />
                        <Text style={styles.metaText}>
                            {new Date(item.bill_date).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>
                    <View style={styles.billMeta}>
                        <Ionicons name="cube-outline" size={13} color="#9CA3AF" />
                        <Text style={styles.metaText}>
                            {item.items?.length || 0} vật tư
                        </Text>
                    </View>
                    <Text style={styles.billAmount}>{formatCurrency(item.total_amount)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderStatsContent = () => {
        if (loadingStats && !refreshing) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            );
        }

        const approvedCost = summary.approved_material_cost ?? 0;
        const pendingCost = summary.pending_material_cost ?? 0;
        const totalCost = summary.total_material_cost ?? 0;

        return (
            <ScrollView 
                style={styles.statsContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
            >
                {/* Summary Header Cards */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryCard}>
                        <View style={[styles.summaryIconBox, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        </View>
                        <Text style={styles.summaryLabel}>Đã duyệt</Text>
                        <Text style={[styles.summaryValue, { color: '#10B981', fontSize: 15 }]}>
                            {formatCurrency(approvedCost)}
                        </Text>
                        <Text style={styles.summarySubLabel}>{summary.approved_bills ?? 0} phiếu</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={[styles.summaryIconBox, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="time" size={24} color="#F59E0B" />
                        </View>
                        <Text style={styles.summaryLabel}>Đang chờ duyệt</Text>
                        <Text style={[styles.summaryValue, { color: '#F59E0B', fontSize: 15 }]}>
                            {formatCurrency(pendingCost)}
                        </Text>
                        <Text style={styles.summarySubLabel}>{(summary.pending_bills ?? 0) + (summary.draft_bills ?? 0)} phiếu</Text>
                    </View>
                </View>

                {/* Total Cost Banner */}
                <View style={styles.totalBanner}>
                    <View style={styles.totalBannerLeft}>
                        <Ionicons name="wallet" size={22} color="#FFFFFF" />
                        <View>
                            <Text style={styles.totalBannerLabel}>TỔNG CHI PHÍ VẬT TƯ</Text>
                            <Text style={styles.totalBannerSubLabel}>{summary.total_bills ?? 0} phiếu • {materials.length} loại vật tư</Text>
                        </View>
                    </View>
                    <Text style={styles.totalBannerValue}>{formatCurrency(totalCost)}</Text>
                </View>

                <View style={styles.reportSection}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.reportTitle}>CHI TIẾT VẬT LIỆU</Text>
                    </View>

                    <View style={styles.reportTable}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableCol, { flex: 3 }]}>VẬT TƯ / MÃ</Text>
                            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>SL</Text>
                            <Text style={[styles.tableCol, { flex: 2, textAlign: 'right' }]}>THÀNH TIỀN</Text>
                        </View>

                        {materials.map((m, idx) => (
                            <View key={m.id} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                                <View style={{ flex: 3 }}>
                                    <Text style={styles.matName} numberOfLines={2}>{m.name}</Text>
                                    <Text style={styles.matCode}>{m.code} • {m.unit}</Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={styles.matUsage}>
                                        {new Intl.NumberFormat("vi-VN").format(Math.abs(m.project_usage || 0))}
                                    </Text>
                                </View>
                                <View style={{ flex: 2, alignItems: 'flex-end' }}>
                                    <Text style={styles.matAmount}>
                                        {formatCurrency(m.project_total_amount || 0)}
                                    </Text>
                                    {(m as any).project_pending_amount > 0 && (
                                        <Text style={styles.matPendingHint}>
                                            Chờ: {formatCurrency((m as any).project_pending_amount)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}

                        {materials.length === 0 && (
                            <View style={styles.emptyTable}>
                                <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>Chưa có dữ liệu thống kê</Text>
                                <Text style={[styles.emptyText, { fontSize: 13, marginTop: 4 }]}>Tạo phiếu nhập vật tư để xem thống kê</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        );
    };

    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Vật Tư Dự Án" showBackButton />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Vật Tư Dự Án"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.MATERIAL_CREATE} projectId={id}>
                        <TouchableOpacity 
                            onPress={() => router.push(`/projects/${id}/material-bills/create`)} 
                            style={styles.addButton}
                        >
                            <Ionicons name="add" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "statistics" && styles.activeTab]}
                    onPress={() => setActiveTab("statistics")}
                >
                    <Ionicons name="bar-chart" size={18} color={activeTab === "statistics" ? "#3B82F6" : "#9CA3AF"} />
                    <Text style={[styles.tabText, activeTab === "statistics" && styles.activeTabText]}>Thống kê chi phí</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "bills" && styles.activeTab]}
                    onPress={() => setActiveTab("bills")}
                >
                    <Ionicons name="receipt" size={18} color={activeTab === "bills" ? "#3B82F6" : "#9CA3AF"} />
                    <Text style={[styles.tabText, activeTab === "bills" && styles.activeTabText]}>Danh sách Phiếu</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                {activeTab === "bills" ? (
                    loadingBills && !refreshing ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                        </View>
                    ) : (
                        <FlatList
                            data={bills}
                            renderItem={renderBillItem}
                            keyExtractor={(item) => item.id.toString()}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
                                    <Text style={styles.emptyText}>Chưa có hóa đơn nào</Text>
                                    <TouchableOpacity 
                                        style={styles.createFirstBtn}
                                        onPress={() => router.push(`/projects/${id}/material-bills/create`)}
                                    >
                                        <Text style={styles.createFirstBtnText}>Tạo phiếu nhập đầu tiên</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    )
                ) : (
                    renderStatsContent()
                )}
            </View>

            <PermissionGuard permission={Permissions.MATERIAL_CREATE} projectId={id}>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push(`/projects/${id}/material-bills/create`)}
                >
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                </TouchableOpacity>
            </PermissionGuard>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6", // Lighter gray background
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#3B82F6",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    tabContainer: {
        flexDirection: "row",
        padding: 4,
        backgroundColor: "#E5E7EB",
        margin: 16,
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        gap: 8,
    },
    activeTab: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    tabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
    },
    activeTabText: {
        color: "#1F2937",
    },

    // LIST CONTENT
    listContent: {
        paddingHorizontal: 16,
    },
    billCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    billHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    billIdContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    billNumber: {
        fontSize: 14,
        fontWeight: "800",
        color: "#1F2937",
        letterSpacing: 0.5,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "800",
    },
    billBody: {
        marginBottom: 16,
    },
    supplierName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#374151",
    },
    billNotes: {
        fontSize: 13,
        color: "#9CA3AF",
        marginTop: 4,
    },
    billFooter: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        gap: 12,
    },
    billMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: "#6B7280",
    },
    billAmount: {
        flex: 1,
        fontSize: 16,
        fontWeight: "800",
        color: "#1F2937",
        textAlign: "right",
    },

    // STATS CONTENT
    statsContainer: {
        flex: 1,
    },
    summarySection: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    summaryIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: "900",
        color: '#1F2937',
    },
    summarySubLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
    },

    reportSection: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 24,
        flex: 1,
        minHeight: 500,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    reportTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1F2937',
        letterSpacing: 1,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    filterBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    reportTable: {
        paddingHorizontal: 16,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 8,
    },
    tableCol: {
        fontSize: 11,
        fontWeight: '800',
        color: '#9CA3AF',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    matName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    matCode: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    matUsage: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    matAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10B981',
    },
    emptyTable: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    matPendingHint: {
        fontSize: 11,
        color: '#F59E0B',
        marginTop: 2,
    },
    totalBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E40AF',
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 16,
        padding: 16,
    },
    totalBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    totalBannerLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#BFDBFE',
        letterSpacing: 0.5,
    },
    totalBannerSubLabel: {
        fontSize: 12,
        color: '#93C5FD',
        marginTop: 2,
    },
    totalBannerValue: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },


    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 100,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: "#9CA3AF",
    },
    createFirstBtn: {
        marginTop: 20,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createFirstBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 999,
    },
});
