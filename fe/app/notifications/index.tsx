import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    TextInput,
    Modal,
    ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { notificationApi, Notification, NotificationFilters } from "@/api/notificationApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

type TabType = "all" | "unread";

export default function NotificationsScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [searchText, setSearchText] = useState("");
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState<NotificationFilters>({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filter form state
    const [filterFormData, setFilterFormData] = useState<NotificationFilters>({
        type: undefined,
        category: undefined,
        priority: undefined,
    });

    const loadNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const params: NotificationFilters = {
                ...filters,
                page: pageNum,
                per_page: 20,
            };

            if (activeTab === "unread") {
                params.unread_only = true;
            }

            if (searchText) {
                params.search = searchText;
            }

            const response = await notificationApi.getAll(params);
            const data = response.data || [];

            if (append) {
                setNotifications((prev) => [...prev, ...data]);
            } else {
                setNotifications(data);
            }

            setHasMore(data.length === 20);
            setPage(pageNum);
        } catch (error: any) {
            console.error("Error loading notifications:", error);
            Alert.alert("Lỗi", "Không thể tải thông báo");
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [filters, activeTab, searchText]);

    const loadUnreadCount = useCallback(async () => {
        try {
            const response = await notificationApi.getUnreadCount();
            if (response.success) {
                setUnreadCount(response.unread_count || 0);
            }
        } catch (error) {
            console.error("Error loading unread count:", error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadNotifications(1, false);
            loadUnreadCount();
        }, [loadNotifications, loadUnreadCount])
    );

    // Reload khi filters hoặc activeTab thay đổi
    useEffect(() => {
        loadNotifications(1, false);
    }, [filters, activeTab, loadNotifications]);

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        loadNotifications(1, false);
        loadUnreadCount();
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            loadNotifications(page + 1, true);
        }
    };

    const handleMarkAsRead = async (notification: Notification) => {
        if (notification.status === "read") return;

        try {
            await notificationApi.markAsRead(notification.id);
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notification.id ? { ...n, status: "read" as const, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking as read:", error);
            Alert.alert("Lỗi", "Không thể đánh dấu đã đọc");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, status: "read" as const, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
            Alert.alert("Thành công", "Đã đánh dấu tất cả thông báo là đã đọc");
        } catch (error) {
            console.error("Error marking all as read:", error);
            Alert.alert("Lỗi", "Không thể đánh dấu tất cả đã đọc");
        }
    };

    const handleDelete = async (notification: Notification) => {
        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xóa thông báo này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await notificationApi.delete(notification.id);
                            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                            if (notification.status === "unread") {
                                setUnreadCount((prev) => Math.max(0, prev - 1));
                            }
                        } catch (error) {
                            console.error("Error deleting notification:", error);
                            Alert.alert("Lỗi", "Không thể xóa thông báo");
                        }
                    },
                },
            ]
        );
    };

    const handleNotificationPress = (notification: Notification) => {
        if (notification.status === "unread") {
            handleMarkAsRead(notification);
        }

        if (notification.action_url) {
            router.push(notification.action_url as any);
        }
    };

    const handleApplyFilters = () => {
        setFilters(filterFormData);
        setShowFilterModal(false);
        setPage(1);
        loadNotifications(1, false);
    };

    const handleClearFilters = () => {
        setFilterFormData({});
        setFilters({});
        setShowFilterModal(false);
        setPage(1);
        loadNotifications(1, false);
    };

    const filteredNotifications = useMemo(() => {
        let filtered = notifications;

        if (searchText) {
            const searchLower = searchText.toLowerCase();
            filtered = filtered.filter(
                (n) =>
                    n.title?.toLowerCase().includes(searchLower) ||
                    n.body?.toLowerCase().includes(searchLower) ||
                    n.message?.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [notifications, searchText]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent":
                return "#EF4444";
            case "high":
                return "#F59E0B";
            case "medium":
                return "#3B82F6";
            case "low":
                return "#6B7280";
            default:
                return "#6B7280";
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            project_performance: "Hiệu suất dự án",
            system: "Hệ thống",
            workflow: "Workflow",
            assignment: "Phân công",
            mention: "Đề cập",
            file_upload: "Tải file",
        };
        return labels[type] || type;
    };

    const renderNotificationItem = ({ item }: { item: Notification }) => {
        const isUnread = item.status === "unread";
        const priorityColor = getPriorityColor(item.priority);

        return (
            <TouchableOpacity
                style={[styles.notificationItem, isUnread && styles.notificationItemUnread]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                        <View style={styles.notificationHeaderLeft}>
                            {isUnread && <View style={[styles.unreadDot, { backgroundColor: priorityColor }]} />}
                            <Text style={styles.notificationTitle} numberOfLines={1}>
                                {item.title || item.message || "Thông báo"}
                            </Text>
                        </View>
                        <View style={styles.notificationActions}>
                            {isUnread && (
                                <TouchableOpacity
                                    onPress={() => handleMarkAsRead(item)}
                                    style={styles.actionButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#3B82F6" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => handleDelete(item)}
                                style={styles.actionButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.notificationBody} numberOfLines={2}>
                        {item.body || item.message || ""}
                    </Text>
                    <View style={styles.notificationFooter}>
                        <View style={styles.notificationMeta}>
                            <Text style={styles.notificationType}>{getTypeLabel(item.type || "system")}</Text>
                            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "20" }]}>
                                <Text style={[styles.priorityText, { color: priorityColor }]}>
                                    {item.priority === "urgent" ? "Khẩn cấp" : item.priority === "high" ? "Cao" : item.priority === "medium" ? "Trung bình" : "Thấp"}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.notificationTime}>
                            {new Date(item.created_at).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyComponent = () => {
        if (loading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.emptyText}>Đang tải thông báo...</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                    {activeTab === "unread" ? "Không có thông báo chưa đọc" : "Không có thông báo nào"}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Thông Báo"
                rightComponent={
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <Ionicons name="filter-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                style={styles.markAllButton}
                                onPress={handleMarkAllAsRead}
                            >
                                <Text style={styles.markAllText}>Đánh dấu tất cả</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "all" && styles.tabActive]}
                    onPress={() => {
                        setActiveTab("all");
                        setPage(1);
                    }}
                >
                    <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>Tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "unread" && styles.tabActive]}
                    onPress={() => {
                        setActiveTab("unread");
                        setPage(1);
                    }}
                >
                    <Text style={[styles.tabText, activeTab === "unread" && styles.tabTextActive]}>
                        Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm thông báo..."
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholderTextColor="#9CA3AF"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Notifications List */}
            <FlatList
                data={filteredNotifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={renderEmptyComponent}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.loadMoreContainer}>
                            <ActivityIndicator size="small" color="#3B82F6" />
                        </View>
                    ) : null
                }
            />

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Bộ lọc</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            {/* Type Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Loại thông báo</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {[
                                        { value: undefined, label: "Tất cả" },
                                        { value: "project_performance", label: "Hiệu suất dự án" },
                                        { value: "system", label: "Hệ thống" },
                                        { value: "workflow", label: "Workflow" },
                                        { value: "assignment", label: "Phân công" },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.value || "all"}
                                            style={[
                                                styles.filterChip,
                                                filterFormData.type === option.value && styles.filterChipActive,
                                            ]}
                                            onPress={() => setFilterFormData({ ...filterFormData, type: option.value })}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    filterFormData.type === option.value && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Priority Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Độ ưu tiên</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {[
                                        { value: undefined, label: "Tất cả" },
                                        { value: "urgent", label: "Khẩn cấp" },
                                        { value: "high", label: "Cao" },
                                        { value: "medium", label: "Trung bình" },
                                        { value: "low", label: "Thấp" },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.value || "all"}
                                            style={[
                                                styles.filterChip,
                                                filterFormData.priority === option.value && styles.filterChipActive,
                                            ]}
                                            onPress={() => setFilterFormData({ ...filterFormData, priority: option.value as "low" | "medium" | "high" | "urgent" | undefined })}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    filterFormData.priority === option.value && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.modalButtonSecondary} onPress={handleClearFilters}>
                                <Text style={styles.modalButtonTextSecondary}>Xóa bộ lọc</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleApplyFilters}>
                                <Text style={styles.modalButtonTextPrimary}>Áp dụng</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    filterButton: {
        padding: 8,
    },
    markAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#3B82F6",
        borderRadius: 6,
    },
    markAllText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
    },
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: "#3B82F6",
    },
    tabText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    tabTextActive: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#374151",
    },
    clearButton: {
        marginLeft: 8,
    },
    listContent: {
        padding: 16,
    },
    notificationItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    notificationItemUnread: {
        borderLeftWidth: 4,
        borderLeftColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    notificationHeaderLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    notificationTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },
    notificationActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        padding: 4,
    },
    notificationBody: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 12,
        lineHeight: 20,
    },
    notificationFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    notificationMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    notificationType: {
        fontSize: 12,
        color: "#6B7280",
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: "600",
    },
    notificationTime: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 64,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
    },
    loadMoreContainer: {
        paddingVertical: 16,
        alignItems: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    modalBody: {
        padding: 16,
    },
    filterSection: {
        marginBottom: 24,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 12,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: "#3B82F6",
    },
    filterChipText: {
        fontSize: 14,
        color: "#374151",
        fontWeight: "500",
    },
    filterChipTextActive: {
        color: "#FFFFFF",
    },
    modalFooter: {
        flexDirection: "row",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        gap: 12,
    },
    modalButtonSecondary: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
    },
    modalButtonTextSecondary: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
    },
    modalButtonPrimary: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: "#3B82F6",
        alignItems: "center",
    },
    modalButtonTextPrimary: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
