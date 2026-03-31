import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    SectionList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { approvalCenterApi, ApprovalItem, ApprovalCenterData } from '@/api/approvalCenterApi';
import { ScreenHeader } from '@/components';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────
// Consolidated Role Config (Matches CRM Tabs)
// ─────────────────────────────────────────────────
const ROLE_TABS = [
    { key: 'all', label: 'Tất cả', icon: 'apps-outline', color: '#6B7280', bgColor: '#F3F4F6' },
    { key: 'management', label: 'BĐH', icon: 'ribbon-outline', color: '#F97316', bgColor: '#FFF7ED' },
    { key: 'accountant', label: 'Kế Toán', icon: 'calculator-outline', color: '#06B6D4', bgColor: '#ECFEFF' },
    { key: 'customer', label: 'Khách Hàng', icon: 'people-outline', color: '#10B981', bgColor: '#D1FAE5' },
    { key: 'operations', label: 'Vận Hành', icon: 'construct-outline', color: '#3B82F6', bgColor: '#DBEAFE' },
];

const ROLE_MAPPING: Record<string, string> = {
    management: 'management',
    accountant: 'accountant',
    customer: 'customer',
    // Operations includes everything else technical
    supervisor: 'operations',
    project_manager: 'operations',
    change_request: 'operations',
    additional_cost: 'operations',
    sub_acceptance: 'operations',
    supplier_acceptance: 'operations',
    construction_log: 'operations',
    schedule_adjustment: 'operations',
    defect_verify: 'operations',
    acceptance_item: 'operations',
};

const ROLE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    management: { label: 'Ban Điều Hành duyệt', icon: 'ribbon-outline', color: '#F97316', bgColor: '#FFF7ED' },
    accountant: { label: 'Kế Toán xác nhận', icon: 'calculator-outline', color: '#06B6D4', bgColor: '#ECFEFF' },
    customer: { label: 'Khách hàng duyệt', icon: 'people-outline', color: '#10B981', bgColor: '#D1FAE5' },
    operations: { label: 'Vận Hành (Kỹ thuật/GS)', icon: 'construct-outline', color: '#3B82F6', bgColor: '#DBEAFE' },
};

// Type icon mapping for cards
const TYPE_ICON: Record<string, { icon: string; color: string }> = {
    company_cost: { icon: 'wallet-outline', color: '#F59E0B' },
    project_cost: { icon: 'construct-outline', color: '#3B82F6' },
    material_bill: { icon: 'cube-outline', color: '#8B5CF6' },
    acceptance: { icon: 'checkmark-done-outline', color: '#10B981' },
    acceptance_supervisor: { icon: 'eye-outline', color: '#0D9488' },
    acceptance_pm: { icon: 'person-outline', color: '#3B82F6' },
    acceptance_customer: { icon: 'people-outline', color: '#10B981' },
    change_request: { icon: 'git-compare-outline', color: '#EC4899' },
    additional_cost: { icon: 'trending-up-outline', color: '#F97316' },
    sub_payment: { icon: 'card-outline', color: '#0EA5E9' },
    contract: { icon: 'document-text-outline', color: '#6366F1' },
    payment: { icon: 'cash-outline', color: '#D946EF' },
    sub_acceptance: { icon: 'checkbox-outline', color: '#0D9488' },
    supplier_acceptance: { icon: 'storefront-outline', color: '#84CC16' },
    construction_log: { icon: 'newspaper-outline', color: '#A855F7' },
    schedule_adjustment: { icon: 'calendar-outline', color: '#E11D48' },
    budget: { icon: 'pie-chart-outline', color: '#F97316' },
    history: { icon: 'time-outline', color: '#6B7280' },
};

export default function ApprovalCenterScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();

    const [data, setData] = useState<ApprovalCenterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');

    useEffect(() => {
        loadApprovals();
    }, []);

    const loadApprovals = async () => {
        try {
            setLoading(true);
            const response = await approvalCenterApi.getApprovals();
            if (response.success) {
                setData(response.data);
            }
        } catch (error: any) {
            console.error('[ApprovalCenter] Error:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu duyệt');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleQuickApprove = async (item: ApprovalItem) => {
        try {
            setActionLoading(item.id);
            const res = await approvalCenterApi.quickApprove(item.type, item.id);
            if (res.success) {
                // Remove item from UI locally for speed
                setData(prev => prev ? ({
                    ...prev,
                    items: prev.items.filter(i => i.id !== item.id || i.type !== item.type)
                }) : null);
            } else {
                Alert.alert('Thông báo', res.message || 'Không thể duyệt yêu cầu này');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi duyệt');
        } finally {
            setActionLoading(null);
        }
    };

    const openRejectModal = (item: ApprovalItem) => {
        setRejectTarget(item);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectTarget || !rejectReason.trim()) return;
        try {
            setActionLoading(rejectTarget.id);
            const res = await approvalCenterApi.quickReject(rejectTarget.type, rejectTarget.id, rejectReason);
            if (res.success) {
                setShowRejectModal(false);
                setData(prev => prev ? ({
                    ...prev,
                    items: prev.items.filter(i => i.id !== rejectTarget.id || i.type !== rejectTarget.type)
                }) : null);
            } else {
                Alert.alert('Thông báo', res.message || 'Không thể từ chối yêu cầu này');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi từ chối');
        } finally {
            setActionLoading(null);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadApprovals();
    };

    // ─────────────────────────────────────────────────
    // Consolidated grouping into 4 main roles + History
    // ─────────────────────────────────────────────────
    const sections = useMemo(() => {
        if (!data) return [];

        if (viewMode === 'history') {
            return [{
                key: 'history',
                title: 'Hoạt động gần đây',
                icon: 'time-outline',
                color: '#6B7280',
                bgColor: '#F3F4F6',
                data: data.recent_items || [],
            }];
        }

        const grouped: Record<string, ApprovalItem[]> = {};
        for (const item of (data.items || [])) {
            const level = item.approval_level || 'operations';
            const roleKey = ROLE_MAPPING[level] || 'operations';
            
            // Filter by selected role if not 'all'
            if (selectedRole !== 'all' && roleKey !== selectedRole) continue;

            if (!grouped[roleKey]) grouped[roleKey] = [];
            grouped[roleKey].push(item);
        }

        return Object.entries(grouped)
            .map(([key, items]) => {
                const config = ROLE_CONFIG[key] || ROLE_CONFIG.operations;
                return {
                    key,
                    title: config.label,
                    icon: config.icon,
                    color: config.color,
                    bgColor: config.bgColor,
                    data: items,
                };
            })
            .sort((a, b) => {
                // Order: management, accountant, customer, operations
                const order = ['management', 'accountant', 'customer', 'operations'];
                return order.indexOf(a.key) - order.indexOf(b.key);
            });
    }, [data, selectedRole, viewMode]);

    // Counts for role tabs (only for pending items)
    const roleCounts = useMemo(() => {
        const counts: Record<string, number> = { all: data?.items?.length || 0 };
        for (const item of (data?.items || [])) {
            const role = ROLE_MAPPING[item.approval_level] || 'operations';
            counts[role] = (counts[role] || 0) + 1;
        }
        return counts;
    }, [data?.items]);

    const handleNavigateToDetail = (item: ApprovalItem) => {
        if (item.type === 'company_cost') {
            router.push(`/company-costs/${item.id}` as any);
        } else if (item.project_id) {
            router.push(`/projects/${item.project_id}` as any);
        }
    };

    // ─────────────────────────────────────────────────
    // Formatters
    // ─────────────────────────────────────────────────
    const formatCurrency = (amount: number) => {
        if (amount === 0) return '';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Vừa xong';
        if (diffHours < 24) return `${diffHours}h trước`;
        if (diffDays < 7) return `${diffDays}d trước`;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };


    // ─────────────────────────────────────────────────
    // Stats Summary Cards (Matches CRM Dashboard)
    // ─────────────────────────────────────────────────
    const renderStatsCards = () => {
        if (!data?.stats) return null;
        const { stats } = data;

        return (
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#0EA5E9' }]}>
                        <Ionicons name="documents-outline" size={18} color="#FFF" />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{stats.pending_total}</Text>
                        <Text style={styles.statLabel}>Chờ duyệt</Text>
                    </View>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#22C55E' }]}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{stats.approved_today}</Text>
                        <Text style={styles.statLabel}>Duyệt hôm nay</Text>
                    </View>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FFF1F2' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F43F5E' }]}>
                        <Ionicons name="close-circle-outline" size={18} color="#FFF" />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{stats.rejected_today}</Text>
                        <Text style={styles.statLabel}>Từ chối</Text>
                    </View>
                </View>
            </View>
        );
    };

    // ─────────────────────────────────────────────────
    // Role Tabs (Matches CRM activeRole tabs)
    // ─────────────────────────────────────────────────
    const renderRoleTabs = () => {
        return (
            <View style={styles.roleTabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleTabsScroll}>
                    <TouchableOpacity 
                        style={[styles.viewModeToggle, viewMode === 'pending' && styles.viewModeToggleActive]}
                        onPress={() => setViewMode('pending')}
                    >
                        <Ionicons name="time-outline" size={16} color={viewMode === 'pending' ? '#3B82F6' : '#6B7280'} />
                        <Text style={[styles.viewModeText, viewMode === 'pending' && styles.viewModeTextActive]}>Đang chờ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.viewModeToggle, viewMode === 'history' && styles.viewModeToggleActive]}
                        onPress={() => setViewMode('history')}
                    >
                        <Ionicons name="list-outline" size={16} color={viewMode === 'history' ? '#3B82F6' : '#6B7280'} />
                        <Text style={[styles.viewModeText, viewMode === 'history' && styles.viewModeTextActive]}>Lịch sử</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.tabDivider} />

                    {viewMode === 'pending' && ROLE_TABS.map((tab) => {
                        const count = roleCounts[tab.key] || 0;
                        const isActive = selectedRole === tab.key;
                        if (tab.key !== 'all' && count === 0) return null;

                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.roleTab, isActive && { borderBottomColor: tab.color }]}
                                onPress={() => setSelectedRole(tab.key)}
                            >
                                <Text style={[styles.roleTabText, isActive && { color: tab.color, fontWeight: '700' }]}>
                                    {tab.label}
                                </Text>
                                {count > 0 && (
                                    <View style={[styles.roleTabBadge, { backgroundColor: tab.color }]}>
                                        <Text style={styles.roleTabBadgeText}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderSectionHeader = ({ section }: { section: any }) => (
        <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: section.bgColor }]}>
                <Ionicons name={section.icon as any} size={18} color={section.color} />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionCount, { backgroundColor: section.color }]}>
                <Text style={styles.sectionCountText}>{section.data.length}</Text>
            </View>
        </View>
    );

    const renderApprovalItem = ({ item }: { item: ApprovalItem }) => {
        const typeInfo = TYPE_ICON[item.type] || TYPE_ICON.project_cost;
        const isHistory = viewMode === 'history';

        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => handleNavigateToDetail(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.cardIcon, { backgroundColor: typeInfo.color + '15' }]}>
                        <Ionicons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
                    </View>
                    
                    <View style={styles.cardInfo}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            {item.amount > 0 && (
                                <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
                            )}
                        </View>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                        
                        <View style={styles.cardMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="person-outline" size={12} color="#9CA3AF" />
                                <Text style={styles.cardTime}>{item.created_by}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                                <Text style={styles.cardTime}>{formatDate(item.created_at)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {!isHistory && item.can_approve && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity 
                            style={styles.rejectBtn}
                            onPress={() => {
                                setRejectTarget(item);
                                setRejectReason('');
                                setShowRejectModal(true);
                            }}
                            disabled={actionLoading === item.id}
                        >
                            <Ionicons name="close-outline" size={18} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.approveBtn}
                            onPress={() => handleQuickApprove(item)}
                            disabled={actionLoading === item.id}
                        >
                            {actionLoading === item.id ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.approveBtnText}>Duyệt</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                
                {isHistory && (
                    <View style={[styles.historyStatus, { backgroundColor: item.status === 'approved' ? '#DCFCE7' : '#FEE2E2' }]}>
                         <Ionicons 
                            name={item.status === 'approved' ? 'checkmark-circle' : 'close-circle'} 
                            size={14} 
                            color={item.status === 'approved' ? '#166534' : '#991B1B'} 
                        />
                        <Text style={[styles.historyStatusText, { color: item.status === 'approved' ? '#166534' : '#991B1B' }]}>
                            {item.status_label}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Trung tâm Duyệt" showBackButton />
            
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
                renderItem={renderApprovalItem}
                renderSectionHeader={renderSectionHeader}
                ListHeaderComponent={() => (
                    <View style={styles.listHeader}>
                        {renderStatsCards()}
                        {renderRoleTabs()}
                        {sections.length === 0 && !loading && (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconBg}>
                                    <Ionicons name="documents-outline" size={64} color="#CBD5E1" />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {viewMode === 'pending' ? 'Hết việc rồi!' : 'Trống'}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {viewMode === 'pending' 
                                        ? 'Không có yêu cầu nào đang chờ bạn duyệt.' 
                                        : 'Chưa có hoạt động nào được ghi lại.'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                stickySectionHeadersEnabled={true}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
                }
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: tabBarHeight + 20 }
                ]}
                ListFooterComponent={() => loading ? (
                    <View style={styles.loadingFooter}>
                        <ActivityIndicator color="#3B82F6" />
                        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                    </View>
                ) : null}
            />

            {/* Reject Reason Modal */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowRejectModal(false)}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalOverlayInner}
                        >
                            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                <View style={styles.modalContent}>
                                    <View style={styles.modalHeader}>
                                        <View style={styles.modalIconBg}>
                                            <Ionicons name="close-circle-outline" size={28} color="#EF4444" />
                                        </View>
                                        <Text style={styles.modalTitle}>Lý do từ chối</Text>
                                        <Text style={styles.modalItemName}>{rejectTarget?.title}</Text>
                                    </View>

                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Nhập lý do tại đây..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={4}
                                        value={rejectReason}
                                        onChangeText={setRejectReason}
                                        autoFocus
                                    />

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.modalBtn, styles.modalCancelBtn]}
                                            onPress={() => setShowRejectModal(false)}
                                        >
                                            <Text style={styles.modalCancelText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.modalBtn,
                                                styles.modalRejectBtn,
                                                (!rejectReason.trim() || actionLoading === rejectTarget?.id) && styles.modalBtnDisabled
                                            ]}
                                            onPress={handleReject}
                                            disabled={!rejectReason.trim() || actionLoading === rejectTarget?.id}
                                        >
                                            {actionLoading === rejectTarget?.id ? (
                                                <ActivityIndicator color="#FFF" size="small" />
                                            ) : (
                                                <Text style={styles.modalRejectText}>Xác nhận</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}


// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listHeader: {
        paddingTop: 16,
    },
    listContent: {
        paddingTop: 0,
    },

    // ─── Stats Grid ───
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        marginTop: -1,
    },

    // ─── Role Tabs ───
    roleTabsContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 4,
    },
    roleTabsScroll: {
        paddingHorizontal: 16,
        alignItems: 'center',
        height: 48,
    },
    viewModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
        gap: 6,
    },
    viewModeToggleActive: {
        backgroundColor: '#EFF6FF',
    },
    viewModeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    viewModeTextActive: {
        color: '#3B82F6',
    },
    tabDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 12,
    },
    roleTab: {
        height: 48,
        justifyContent: 'center',
        marginRight: 20,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    roleTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    roleTabBadge: {
        position: 'absolute',
        top: 6,
        right: -12,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    roleTabBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // ─── Section Header ───
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 24,
        backgroundColor: '#F8FAFC',
        gap: 10,
    },
    sectionIconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    sectionCount: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    sectionCountText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // ─── Card ───
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
        gap: 14,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        marginRight: 8,
    },
    cardAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: '#10B981',
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 8,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardTime: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },

    // ─── Actions ───
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#F8FAFC',
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    rejectBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
        backgroundColor: '#10B981',
    },
    approveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // ─── History Status ───
    historyStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    historyStatusText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // ─── Empty ───
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconBg: {
        marginBottom: 16,
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#475569',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
    },

    // ─── Footer ───
    loadingFooter: {
        paddingVertical: 20,
        alignItems: 'center',
        gap: 8,
    },
    loadingText: {
        fontSize: 12,
        color: '#94A3B8',
    },

    // ─── Reject Modal ───
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalOverlayInner: {
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIconBg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF1F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    modalItemName: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        height: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    modalCancelBtn: {
        backgroundColor: '#F1F5F9',
    },
    modalRejectBtn: {
        backgroundColor: '#EF4444',
    },
    modalCancelText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '700',
    },
    modalRejectText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    modalBtnDisabled: {
        opacity: 0.5,
    },
});

