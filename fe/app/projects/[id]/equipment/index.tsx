import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentApi, Equipment } from "@/api/equipmentApi";
import { optionsApi, Option } from "@/api/optionsApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, CurrencyInput, PermissionGuard, PermissionDenied } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

// Labels and Colors
const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
    available: "Sẵn sàng",
    in_use: "Đang sử dụng",
    maintenance: "Bảo trì",
    retired: "Ngừng sử dụng",
    returned: "Đã trả",
};

const EQUIPMENT_STATUS_COLORS: Record<string, string> = {
    available: "#10B981",
    in_use: "#3B82F6",
    maintenance: "#F59E0B",
    retired: "#6B7280",
    returned: "#6366F1",
};

type ViewMode = "allocations" | "statistics";

export default function ProjectEquipmentScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = useProjectPermissions(id);
    
    // State
    const [viewMode, setViewMode] = useState<ViewMode>("allocations");
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    
    // Statistics data
    const [statsData, setStatsData] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);

    // Permission state
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");

    const loadData = useCallback(async (isRefresh = false) => {
        if (!id) return;
        
        try {
            if (!isRefresh) setLoading(true);
            setPermissionDenied(false);

            const params = {
                search: searchQuery || undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
            };

            const response = await equipmentApi.getEquipmentByProject(id, params);
            if (response.success) {
                const data = response.data.data || response.data || [];
                setEquipment(data);
                
                // Calculate stats locally from the equipment list
                // BUSINESS RULE: Aggregate by equipment ID
                const statsMap = new Map();
                data.forEach((item: any) => {
                    const allocation = item.project_allocation;
                    if (!statsMap.has(item.id)) {
                        statsMap.set(item.id, {
                            id: item.id,
                            name: item.name,
                            code: item.code,
                            unit: item.unit || "Bộ",
                            total_quantity: 0,
                            total_cost: 0,
                            allocations_count: 0
                        });
                    }
                    const s = statsMap.get(item.id);
                    if (allocation) {
                        s.total_quantity += Number(allocation.quantity) || 0;
                        s.total_cost += Number(allocation.rental_fee) || 0;
                        s.allocations_count += 1;
                    }
                });
                setStatsData(Array.from(statsMap.values()));
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem thiết bị.");
            } else {
                Alert.alert("Lỗi", "Không thể tải dữ liệu thiết bị");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, searchQuery, selectedStatus]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    const renderAllocationItem = ({ item }: { item: Equipment }) => {
        const projectAllocation = (item as any).project_allocation;
        const statusColor = EQUIPMENT_STATUS_COLORS[item.status] || "#6B7280";
        
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => router.push(`/projects/${id}/equipment/${item.id}/allocations/${projectAllocation?.id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: statusColor + "15" }]}>
                            <Ionicons name="construct" size={20} color={statusColor} />
                        </View>
                        <View>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.cardSubtitle}>{item.code || "N/A"}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {EQUIPMENT_STATUS_LABELS[item.status] || item.status}
                        </Text>
                    </View>
                </View>

                {projectAllocation && (
                    <View style={styles.cardBody}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoCol}>
                                <Text style={styles.infoLabel}>Số lượng</Text>
                                <Text style={styles.infoValue}>{projectAllocation.quantity} {item.unit || "Bộ"}</Text>
                            </View>
                            <View style={styles.infoCol}>
                                <Text style={styles.infoLabel}>Loại</Text>
                                <Text style={styles.infoValue}>
                                    {projectAllocation.allocation_type === "rent" ? "Thuê" : "Có sẵn"}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.infoRow, { marginTop: 12 }]}>
                            <View style={styles.infoCol}>
                                <Text style={styles.infoLabel}>Thời gian</Text>
                                <Text style={styles.infoValue}>
                                    {formatDate(projectAllocation.start_date)}
                                    {projectAllocation.end_date ? ` - ${formatDate(projectAllocation.end_date)}` : ""}
                                </Text>
                            </View>
                            {projectAllocation.rental_fee > 0 && (
                                <View style={styles.infoCol}>
                                    <Text style={styles.infoLabel}>Chi phí</Text>
                                    <Text style={[styles.infoValue, { color: "#3B82F6", fontWeight: "700" }]}>
                                        {formatCurrency(projectAllocation.rental_fee)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderStatsItem = ({ item }: { item: any }) => (
        <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
                <View style={styles.iconContainerStats}>
                    <Ionicons name="analytics" size={20} color="#3B82F6" />
                </View>
                <View style={styles.statsHeaderCenter}>
                    <Text style={styles.statsName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.statsCode}>{item.code || "N/A"}</Text>
                </View>
                <View style={styles.statsCountBadge}>
                    <Text style={styles.statsCountText}>{item.allocations_count} đợt</Text>
                </View>
            </View>
            
            <View style={styles.statsBody}>
                <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Tổng số lượng đã dùng:</Text>
                    <Text style={styles.statsValue}>{item.total_quantity} {item.unit}</Text>
                </View>
                <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Tổng chi phí:</Text>
                    <Text style={[styles.statsValue, { color: "#EF4444", fontWeight: "700" }]}>
                        {formatCurrency(item.total_cost)}
                    </Text>
                </View>
            </View>
        </View>
    );

    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Thiết Bị Dự Án" showBackButton />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Thiết Bị Dự Án"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.EQUIPMENT_CREATE} projectId={id}>
                        <TouchableOpacity 
                            onPress={() => router.push(`/projects/${id}/equipment/create`)} 
                            style={styles.addButton}
                        >
                            <Ionicons name="add" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

            {/* Tab Navigation */}
            <View style={styles.tabBar}>
                <TouchableOpacity 
                    style={[styles.tab, viewMode === "allocations" && styles.activeTab]}
                    onPress={() => setViewMode("allocations")}
                >
                    <Ionicons 
                        name="list-outline" 
                        size={20} 
                        color={viewMode === "allocations" ? "#3B82F6" : "#6B7280"} 
                    />
                    <Text style={[styles.tabText, viewMode === "allocations" && styles.activeTabText]}>Sử dụng</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, viewMode === "statistics" && styles.activeTab]}
                    onPress={() => setViewMode("statistics")}
                >
                    <Ionicons 
                        name="pie-chart-outline" 
                        size={20} 
                        color={viewMode === "statistics" ? "#3B82F6" : "#6B7280"} 
                    />
                    <Text style={[styles.tabText, viewMode === "statistics" && styles.activeTabText]}>Thống kê</Text>
                </TouchableOpacity>
            </View>

            {viewMode === "allocations" ? (
                <>
                    {/* Search & Filter */}
                    <View style={styles.searchBar}>
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm kiếm thiết bị..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
                            <TouchableOpacity 
                                style={[styles.filterChip, selectedStatus === "all" && styles.activeFilterChip]}
                                onPress={() => setSelectedStatus("all")}
                            >
                                <Text style={[styles.filterText, selectedStatus === "all" && styles.activeFilterText]}>Tất cả</Text>
                            </TouchableOpacity>
                            {Object.entries(EQUIPMENT_STATUS_LABELS).map(([key, label]) => (
                                <TouchableOpacity 
                                    key={key}
                                    style={[styles.filterChip, selectedStatus === key && styles.activeFilterChip]}
                                    onPress={() => setSelectedStatus(key)}
                                >
                                    <Text style={[styles.filterText, selectedStatus === key && styles.activeFilterText]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {loading && !refreshing ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                        </View>
                    ) : (
                        <FlatList
                            data={equipment}
                            renderItem={renderAllocationItem}
                            keyExtractor={(item, index) => `${item.id}-${index}`}
                            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="construct-outline" size={64} color="#D1D5DB" />
                                    <Text style={styles.emptyText}>Chưa có thiết bị nào</Text>
                                </View>
                            }
                        />
                    )}
                </>
            ) : (
                <View style={{ flex: 1 }}>
                    {loading && !refreshing ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                        </View>
                    ) : (
                        <FlatList
                            data={statsData}
                            renderItem={renderStatsItem}
                            keyExtractor={(item) => `stat-${item.id}`}
                            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
                                    <Text style={styles.emptyText}>Chưa có thống kê dữ liệu</Text>
                                </View>
                            }
                        />
                    )}
                </View>
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: "#3B82F6",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    activeTabText: {
        color: "#3B82F6",
    },
    searchBar: {
        backgroundColor: "#FFFFFF",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        marginBottom: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: "#1F2937",
    },
    statusFilter: {
        flexDirection: "row",
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        marginRight: 8,
    },
    activeFilterChip: {
        backgroundColor: "#3B82F6",
    },
    filterText: {
        fontSize: 12,
        color: "#6B7280",
    },
    activeFilterText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    cardHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    cardSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },
    cardBody: {
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 12,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    infoCol: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: "#9CA3AF",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    statsCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statsHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 12,
    },
    iconContainerStats: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    statsHeaderCenter: {
        flex: 1,
    },
    statsName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    statsCode: {
        fontSize: 12,
        color: "#6B7280",
    },
    statsCountBadge: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statsCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#4B5563",
    },
    statsBody: {
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statsLabel: {
        fontSize: 13,
        color: "#6B7280",
    },
    statsValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#9CA3AF",
        marginTop: 12,
    },
});
