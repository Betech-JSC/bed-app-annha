import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    TextInput,
    Modal,
    ScrollView,
    SectionList,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { notificationApi, Notification, NotificationFilters } from "@/api/notificationApi";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useNotifications } from "@/hooks/useNotifications";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

type TabType = "all" | "unread";

interface Section {
    title: string;
    data: Notification[];
}

export default function NotificationsScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const token = useSelector((state: RootState) => state.user.token);

    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [searchText, setSearchText] = useState("");
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState<NotificationFilters>({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const { unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh: refreshGlobal } = useNotifications({
        autoRefresh: false,
        loadNotifications: false
    });

    const loadNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
        if (!token) return;
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

            const response = await notificationApi.getAll(params);
            const data = response.data || [];

            if (append) {
                setAllNotifications((prev) => [...prev, ...data]);
            } else {
                setAllNotifications(data);
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
    }, [filters, activeTab, token]);

    useEffect(() => {
        loadNotifications(1, false);
    }, [filters, activeTab, loadNotifications]);

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        loadNotifications(1, false);
        refreshGlobal();
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !searchText) {
            loadNotifications(page + 1, true);
        }
    };

    const sections = useMemo(() => {
        let filtered = allNotifications;

        if (searchText) {
            const searchLower = searchText.toLowerCase();
            filtered = filtered.filter(
                (n) =>
                    n.title?.toLowerCase().includes(searchLower) ||
                    n.body?.toLowerCase().includes(searchLower) ||
                    n.message?.toLowerCase().includes(searchLower)
            );
        }

        const grouped: { [key: string]: Notification[] } = {};

        filtered.forEach((noti) => {
            const date = parseISO(noti.created_at);
            let title = "";
            if (isToday(date)) {
                title = "Hôm nay";
            } else if (isYesterday(date)) {
                title = "Hôm qua";
            } else {
                title = format(date, "eeee, dd/MM", { locale: vi });
            }

            if (!grouped[title]) {
                grouped[title] = [];
            }
            grouped[title].push(noti);
        });

        return Object.keys(grouped).map((title) => ({
            title,
            data: grouped[title],
        }));
    }, [allNotifications, searchText]);

    const handleNotificationPress = async (notification: Notification) => {
        if (notification.status === "unread") {
            try {
                await markAsRead(notification.id);
                setAllNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'read' as const } : n));
            } catch (e) { }
        }

        const { type, data, action_url } = notification;

        try {
            switch (type) {
                case 'project_cost':
                    if (data?.project_id && data?.cost_id) {
                        router.push(`/projects/${data.project_id}/costs/${data.cost_id}`);
                    } else if (data?.project_id) {
                        router.push(`/projects/${data.project_id}/costs`);
                    } else if (action_url) {
                        router.push(action_url as any);
                    }
                    break;
                case 'project_invoice':
                    if (data?.project_id && data?.invoice_id) {
                        router.push(`/projects/${data.project_id}/invoices/${data.invoice_id}`);
                    } else if (data?.project_id) {
                        router.push(`/projects/${data.project_id}/invoices`);
                    } else if (action_url) {
                        router.push(action_url as any);
                    }
                    break;
                case 'project_comment':
                    if (data?.project_id) {
                        router.push(`/projects/${data.project_id}/comments`);
                    } else if (action_url) {
                        router.push(action_url as any);
                    }
                    break;
                case 'project_update':
                case 'assignment':
                    if (data?.project_id) {
                        router.push(`/projects/${data.project_id}`);
                    } else if (action_url) {
                        router.push(action_url as any);
                    }
                    break;
                case 'chat_message':
                    if (data?.chat_id) {
                        router.push(`/chat/${data.chat_id}`);
                    } else if (action_url) {
                        router.push(action_url as any);
                    }
                    break;
                case 'system':
                default:
                    if (action_url) {
                        router.push(action_url as any);
                    } else {
                        // Fallback or just stay on the screen if it's already a system notification
                    }
                    break;
            }
        } catch (error) {
            console.error('Navigation error:', error);
            // If smart navigation fails, try the action_url if it exists
            if (action_url) {
                try {
                    router.push(action_url as any);
                } catch (err) {
                    console.error('Final navigation fallback error:', err);
                }
            }
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'project_cost': return { name: 'cash-outline', color: '#10B981' };
            case 'project_invoice': return { name: 'receipt-outline', color: '#3B82F6' };
            case 'project_comment': return { name: 'chatbubble-ellipses-outline', color: '#8B5CF6' };
            case 'assignment': return { name: 'person-add-outline', color: '#F59E0B' };
            case 'system': return { name: 'settings-outline', color: '#6B7280' };
            default: return { name: 'notifications-outline', color: '#3B82F6' };
        }
    };

    const renderNotificationItem = ({ item }: { item: Notification }) => {
        const isUnread = item.status === "unread";
        const icon = getTypeIcon(item.type);

        return (
            <TouchableOpacity
                style={[styles.notificationItem, isUnread && styles.notificationItemUnread]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
                    <Ionicons name={icon.name as any} size={22} color={icon.color} />
                </View>

                <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                        <Text style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]} numberOfLines={1}>
                            {item.title || item.message || "Thông báo"}
                        </Text>
                        <Text style={styles.notificationTime}>
                            {format(parseISO(item.created_at), "HH:mm")}
                        </Text>
                    </View>

                    <Text style={styles.notificationBody} numberOfLines={2}>
                        {item.body || item.message || ""}
                    </Text>

                    <View style={styles.itemFooter}>
                        {isUnread && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>Mới</Text></View>}
                        <View style={styles.itemActions}>
                            {isUnread && (
                                <TouchableOpacity
                                    onPress={() => {
                                        markAsRead(item.id);
                                        setAllNotifications(prev => prev.map(n => n.id === item.id ? { ...n, status: 'read' as const } : n));
                                    }}
                                    style={styles.actionBtn}
                                >
                                    <Ionicons name="checkmark-done" size={16} color="#3B82F6" />
                                    <Text style={styles.actionBtnText}>Đã đọc</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert("Xác nhận", "Xóa thông báo này?", [
                                        { text: "Hủy", style: "cancel" },
                                        {
                                            text: "Xóa", style: "destructive", onPress: () => {
                                                deleteNotification(item.id);
                                                setAllNotifications(prev => prev.filter(n => n.id !== item.id));
                                            }
                                        }
                                    ]);
                                }}
                                style={styles.actionBtn}
                            >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyComponent = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyText}>
                    {activeTab === "unread" ? "Bạn đã đọc hết thông báo rồi!" : "Chưa có thông báo nào"}
                </Text>
                <Text style={styles.emptySubText}>
                    Các cập nhật mới nhất sẽ xuất hiện ở đây.
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
                            style={styles.headerIconBtn}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <Ionicons name="filter" size={20} color={Object.keys(filters).length > 0 ? "#3B82F6" : "#6B7280"} />
                        </TouchableOpacity>
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                style={styles.headerIconBtn}
                                onPress={() => {
                                    Alert.alert("Xác nhận", "Đánh dấu tất cả là đã đọc?", [
                                        { text: "Hủy", style: "cancel" },
                                        {
                                            text: "Đồng ý", onPress: () => {
                                                markAllAsRead();
                                                setAllNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
                                            }
                                        }
                                    ]);
                                }}
                            >
                                <Ionicons name="checkmark-done-circle-outline" size={24} color="#3B82F6" />
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "all" && styles.tabActive]}
                    onPress={() => setActiveTab("all")}
                >
                    <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>Tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "unread" && styles.tabActive]}
                    onPress={() => setActiveTab("unread")}
                >
                    <View style={styles.tabWithLabel}>
                        <Text style={[styles.tabText, activeTab === "unread" && styles.tabTextActive]}>Chưa đọc</Text>
                        {unreadCount > 0 && (
                            <View style={styles.unreadCountBadge}>
                                <Text style={styles.unreadCountText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm thông báo..."
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText("")}>
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderNotificationItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{title}</Text>
                    </View>
                )}
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3B82F6" />}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={renderEmptyComponent}
                stickySectionHeadersEnabled={false}
                ListFooterComponent={
                    loadingMore ? (
                        <ActivityIndicator style={styles.loader} color="#3B82F6" />
                    ) : loading ? (
                        <View style={{ marginTop: 40 }}><ActivityIndicator size="large" color="#3B82F6" /></View>
                    ) : null
                }
            />

            <Modal visible={showFilterModal} animationType="fade" transparent onRequestClose={() => setShowFilterModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Bộ lọc thông báo</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.filterLabel}>Độ ưu tiên</Text>
                            <View style={styles.filterGrid}>
                                {[
                                    { id: undefined, label: 'Tất cả' },
                                    { id: 'urgent', label: 'Khẩn cấp', color: '#EF4444' },
                                    { id: 'high', label: 'Cao', color: '#F59E0B' },
                                    { id: 'medium', label: 'Trung bình', color: '#3B82F6' },
                                ].map(p => (
                                    <TouchableOpacity
                                        key={p.id || 'all'}
                                        style={[styles.filterChip, filters.priority === p.id && styles.filterChipActive]}
                                        onPress={() => setFilters({ ...filters, priority: p.id as any })}
                                    >
                                        <Text style={[styles.filterChipText, filters.priority === p.id && styles.filterChipTextActive]}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.filterLabel, { marginTop: 20 }]}>Loại thông báo</Text>
                            <View style={styles.filterGrid}>
                                {[
                                    { id: undefined, label: 'Tất cả' },
                                    { id: 'project_cost', label: 'Chi phí' },
                                    { id: 'project_invoice', label: 'Hóa đơn' },
                                    { id: 'project_comment', label: 'Bình luận' },
                                    { id: 'assignment', label: 'Giao việc' },
                                ].map(t => (
                                    <TouchableOpacity
                                        key={t.id || 'all'}
                                        style={[styles.filterChip, filters.type === t.id && styles.filterChipActive]}
                                        onPress={() => setFilters({ ...filters, type: t.id as any })}
                                    >
                                        <Text style={[styles.filterChipText, filters.type === t.id && styles.filterChipTextActive]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.resetBtn}
                                onPress={() => { setFilters({}); setShowFilterModal(false); }}
                            >
                                <Text style={styles.resetBtnText}>Thiết lập lại</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={() => setShowFilterModal(false)}
                            >
                                <Text style={styles.applyBtnText}>Áp dụng</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerIconBtn: { padding: 6 },
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 3,
        borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: "#3B82F6" },
    tabText: { fontSize: 15, color: "#6B7280", fontWeight: "600" },
    tabTextActive: { color: "#3B82F6" },
    tabWithLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unreadCountBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    unreadCountText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    searchWrapper: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 8,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchInput: { flex: 1, fontSize: 14, color: "#1F2937", marginLeft: 8 },
    listContent: { padding: 16 },
    sectionHeader: { marginTop: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: 'uppercase', letterSpacing: 0.5 },
    notificationItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    notificationItemUnread: { backgroundColor: "#FFFFFF", borderLeftWidth: 4, borderLeftColor: "#3B82F6" },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationContent: { flex: 1 },
    notificationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    notificationTitle: { flex: 1, fontSize: 15, color: "#4B5563", fontWeight: "500" },
    notificationTitleUnread: { color: "#111827", fontWeight: "700" },
    notificationTime: { fontSize: 12, color: "#9CA3AF" },
    notificationBody: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 10 },
    itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    unreadBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    unreadBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    itemActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionBtnText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
    emptySubText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
    loader: { paddingVertical: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    modalBody: { padding: 20 },
    filterLabel: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 12 },
    filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    filterChipActive: { backgroundColor: '#3B82F620', borderColor: '#3B82F6' },
    filterChipText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
    filterChipTextActive: { color: '#3B82F6', fontWeight: '700' },
    modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    resetBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    resetBtnText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
    applyBtn: { flex: 1, backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    applyBtnText: { fontSize: 16, color: '#FFF', fontWeight: '700' },
});

