import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { projectApi } from "@/api/projectApi";
import { officeKpiApi, OfficeKpi } from "@/api/officeKpiApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function EmployeeDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();

    const [employee, setEmployee] = useState<any>(null);
    const [kpis, setKpis] = useState<OfficeKpi[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "kpi">("info");

    useEffect(() => {
        loadEmployeeData();
    }, [id]);

    const loadEmployeeData = async () => {
        try {
            setLoading(true);

            // Load employee info
            const usersResponse = await projectApi.getAllUsers();
            if (usersResponse.success) {
                const foundEmployee = usersResponse.data?.find((u: any) => u.id === parseInt(id as string));
                setEmployee(foundEmployee);
            }

            // Load employee KPIs
            const kpisResponse = await officeKpiApi.getKpis({ user_id: parseInt(id as string) });
            if (kpisResponse.success) {
                setKpis(kpisResponse.data || []);
            }
        } catch (error) {
            console.error("Error loading employee data:", error);
            Alert.alert("Lỗi", "Không thể tải thông tin nhân sự");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadEmployeeData();
    };

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

    const renderKpiItem = (item: OfficeKpi) => {
        const progress = Math.min(Math.max((item.current_value / item.target_value) * 100, 0), 100);

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.kpiCard}
                onPress={() => router.push(`/hr/kpis/${item.id}`)}
            >
                <View style={styles.kpiHeader}>
                    <Text style={styles.kpiTitle}>{item.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusText(item.status)}
                        </Text>
                    </View>
                </View>

                {item.description && (
                    <Text style={styles.kpiDescription} numberOfLines={2}>{item.description}</Text>
                )}

                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Tiến độ</Text>
                        <Text style={styles.progressValue}>
                            {item.current_value} / {item.target_value} {item.unit}
                        </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progress}%`, backgroundColor: getStatusColor(item.status) }
                            ]}
                        />
                    </View>
                </View>

                {item.year ? (
                    <Text style={styles.dateText}>
                        📅 Năm: {item.year}
                    </Text>
                ) : item.end_date && (
                    <Text style={styles.dateText}>
                        📅 Hạn chót: {new Date(item.end_date).toLocaleDateString("vi-VN")}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    const renderInfoTab = () => (
        <View style={styles.tabContent}>
            {/* Avatar and Basic Info */}
            <View style={styles.profileHeader}>
                <View style={styles.avatarLarge}>
                    {employee?.image ? (
                        <Image source={{ uri: employee.image }} style={styles.avatarLargeImage} />
                    ) : (
                        <View style={[styles.avatarLargeImage, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarLargeText}>
                                {employee?.name?.charAt(0)?.toUpperCase() || "?"}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.employeeName}>{employee?.name || "N/A"}</Text>
                {employee?.role && (
                    <View style={styles.roleBadgeLarge}>
                        <Text style={styles.roleBadgeText}>{employee.role}</Text>
                    </View>
                )}
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

                <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={20} color="#6B7280" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{employee?.email || "N/A"}</Text>
                    </View>
                </View>

                {employee?.phone && (
                    <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={20} color="#6B7280" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Số điện thoại</Text>
                            <Text style={styles.infoValue}>{employee.phone}</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* KPI Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tổng quan KPI</Text>

                <View style={styles.kpiSummaryGrid}>
                    <View style={styles.kpiSummaryItem}>
                        <Text style={styles.kpiSummaryNumber}>{kpis.length}</Text>
                        <Text style={styles.kpiSummaryLabel}>Tổng KPI</Text>
                    </View>
                    <View style={styles.kpiSummaryItem}>
                        <Text style={[styles.kpiSummaryNumber, { color: "#10B981" }]}>
                            {kpis.filter(k => k.status === "verified_success").length}
                        </Text>
                        <Text style={styles.kpiSummaryLabel}>Đạt</Text>
                    </View>
                    <View style={styles.kpiSummaryItem}>
                        <Text style={[styles.kpiSummaryNumber, { color: "#F59E0B" }]}>
                            {kpis.filter(k => k.status === "pending" || k.status === "completed").length}
                        </Text>
                        <Text style={styles.kpiSummaryLabel}>Đang thực hiện</Text>
                    </View>
                    <View style={styles.kpiSummaryItem}>
                        <Text style={[styles.kpiSummaryNumber, { color: "#EF4444" }]}>
                            {kpis.filter(k => k.status === "verified_fail").length}
                        </Text>
                        <Text style={styles.kpiSummaryLabel}>Không đạt</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderKpiTab = () => (
        <View style={styles.tabContent}>
            {kpis.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Chưa có KPI nào</Text>
                </View>
            ) : (
                kpis.map(renderKpiItem)
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi tiết nhân sự" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (!employee) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi tiết nhân sự" showBackButton />
                <View style={styles.centerContainer}>
                    <Ionicons name="person-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Không tìm thấy nhân sự</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi tiết nhân sự" showBackButton />

            {/* Tab Navigation */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "info" && styles.tabActive]}
                    onPress={() => setActiveTab("info")}
                >
                    <Ionicons
                        name="person-outline"
                        size={20}
                        color={activeTab === "info" ? "#3B82F6" : "#6B7280"}
                    />
                    <Text style={[styles.tabText, activeTab === "info" && styles.tabTextActive]}>
                        Thông tin
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "kpi" && styles.tabActive]}
                    onPress={() => setActiveTab("kpi")}
                >
                    <Ionicons
                        name="trophy-outline"
                        size={20}
                        color={activeTab === "kpi" ? "#3B82F6" : "#6B7280"}
                    />
                    <Text style={[styles.tabText, activeTab === "kpi" && styles.tabTextActive]}>
                        KPI ({kpis.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {activeTab === "info" ? renderInfoTab() : renderKpiTab()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },

    // Tab Bar
    tabBar: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: "#3B82F6",
    },
    tabText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#3B82F6",
        fontWeight: "600",
    },

    tabContent: { flex: 1 },

    // Profile Header
    profileHeader: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarLarge: {
        marginBottom: 16,
    },
    avatarLargeImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        backgroundColor: "#E0E7FF",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarLargeText: {
        fontSize: 40,
        fontWeight: "700",
        color: "#4F46E5",
    },
    employeeName: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
    },
    roleBadgeLarge: {
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    roleBadgeText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4F46E5",
    },

    // Section
    section: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 16,
    },

    // Info Row
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    infoContent: {
        marginLeft: 12,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: "500",
        color: "#111827",
    },

    // KPI Summary
    kpiSummaryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    kpiSummaryItem: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "#F9FAFB",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    kpiSummaryNumber: {
        fontSize: 28,
        fontWeight: "700",
        color: "#3B82F6",
        marginBottom: 4,
    },
    kpiSummaryLabel: {
        fontSize: 13,
        color: "#6B7280",
    },

    // KPI Card
    kpiCard: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    kpiHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    kpiTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        flex: 1,
        marginRight: 8,
    },
    kpiDescription: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 12,
        color: "#6B7280",
    },
    progressValue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1F2937",
    },
    progressBarBg: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    dateText: {
        fontSize: 12,
        color: "#6B7280",
    },

    // Empty State
    emptyContainer: {
        alignItems: "center",
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        color: "#9CA3AF",
        fontSize: 16,
    },
});
