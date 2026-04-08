import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { equipmentRentalApi, EquipmentRental } from "@/api/equipmentRentalApi";
import { assetUsageApi, AssetUsage } from "@/api/assetUsageApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

type TabType = "rental" | "usage";

const STATUS_LABELS: Record<string, string> = {
    draft: "Nháp",
    pending_management: "Chờ BĐH",
    pending_accountant: "Chờ KT",
    completed: "Hoàn tất",
    rejected: "Từ chối",
    approved: "Đã duyệt",
    in_use: "Đang SD",
    pending_return: "Chờ trả",
    returned: "Đã trả",
    pending_receive: "Chờ nhận",
};

const STATUS_COLORS: Record<string, string> = {
    draft: "#6B7280",
    pending_management: "#F59E0B",
    pending_accountant: "#8B5CF6",
    completed: "#10B981",
    rejected: "#EF4444",
    approved: "#06B6D4",
    in_use: "#3B82F6",
    pending_return: "#8B5CF6",
    returned: "#10B981",
    pending_receive: "#F59E0B",
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " đ";
};

export default function EquipmentModuleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = useProjectPermissions(id);

    const [activeTab, setActiveTab] = useState<TabType>("rental");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [rentals, setRentals] = useState<EquipmentRental[]>([]);
    const [usages, setUsages] = useState<AssetUsage[]>([]);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!id) return;
        try {
            if (!isRefresh) setLoading(true);
            if (activeTab === "rental") {
                const res = await equipmentRentalApi.list(id);
                if (res.success) setRentals(res.data?.data || res.data || []);
            } else {
                const res = await assetUsageApi.list(id);
                if (res.success) setUsages(res.data?.data || res.data || []);
            }
        } catch (error) {
            console.error("Error loading equipment data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, activeTab]);

    useEffect(() => { loadData(); }, [loadData]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const getCreateRoute = () => {
        switch (activeTab) {
            case "rental": return `/projects/${id}/equipment/rental/create`;
            case "usage": return `/projects/${id}/equipment/usage/create`;
        }
    };

    // ─── Render Items ───

    const renderRentalItem = ({ item }: { item: EquipmentRental }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/projects/${id}/equipment/rental/${item.id}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.equipment_name}</Text>
                    <Text style={styles.cardSubtitle}>
                        {item.supplier?.name || "Chưa chọn NCC"}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                        {STATUS_LABELS[item.status]}
                    </Text>
                </View>
            </View>
            <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.metaText}>
                        {new Date(item.rental_start_date).toLocaleDateString("vi-VN")} → {new Date(item.rental_end_date).toLocaleDateString("vi-VN")}
                    </Text>
                </View>
                <Text style={styles.cardAmount}>{formatCurrency(item.total_cost)}</Text>
            </View>
            {item.creator && (
                <View style={styles.cardFooter}>
                    <Ionicons name="person-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.footerText}>{item.creator.name}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderUsageItem = ({ item }: { item: AssetUsage }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/projects/${id}/equipment/usage/${item.id}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.asset?.name || "Thiết bị"}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                        {item.asset?.asset_code || ""}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                        {STATUS_LABELS[item.status]}
                    </Text>
                </View>
            </View>
            <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.metaText}>Người nhận: {item.receiver?.name}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.metaText}>
                        {new Date(item.received_date).toLocaleDateString("vi-VN")}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
                {activeTab === "rental" ? "Chưa có phiếu thuê nào" :
                 "Chưa có phiếu mượn nào"}
            </Text>
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            );
        }

        switch (activeTab) {
            case "rental":
                return (
                    <FlatList
                        data={rentals}
                        renderItem={renderRentalItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 100 }]}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={renderEmpty}
                    />
                );
            case "usage":
                return (
                    <FlatList
                        data={usages}
                        renderItem={renderUsageItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 100 }]}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={renderEmpty}
                    />
                );
        }
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Thiết Bị Dự Án"
                showBackButton
                rightComponent={
                    hasPermission(Permissions.EQUIPMENT_CREATE) ? (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => router.push(getCreateRoute() as any)}
                        >
                            <Ionicons name="add" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    ) : null
                }
            />

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {([
                    { key: "rental" as TabType, label: "Thuê", icon: "cart-outline" },
                    { key: "usage" as TabType, label: "Sử dụng", icon: "swap-horizontal-outline" },
                ] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={18}
                            color={activeTab === tab.key ? "#3B82F6" : "#9CA3AF"}
                        />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {renderContent()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    tabBar: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        paddingHorizontal: 4,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: "#3B82F6" },
    tabText: { fontSize: 13, fontWeight: "500", color: "#9CA3AF" },
    tabTextActive: { color: "#3B82F6", fontWeight: "600" },
    listContent: { padding: 16 },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
    cardSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: { fontSize: 11, fontWeight: "600" },
    cardMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, color: "#6B7280" },
    cardAmount: { fontSize: 15, fontWeight: "700", color: "#059669" },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    footerText: { fontSize: 12, color: "#9CA3AF", flex: 1 },
    addButton: { padding: 4 },
    emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    emptyText: { fontSize: 16, color: "#9CA3AF", marginTop: 12 },
});
