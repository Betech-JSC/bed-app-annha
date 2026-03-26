import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
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
    Animated,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { approvalCenterApi, ApprovalItem, ApprovalSummary, ApprovalCenterData } from '@/api/approvalCenterApi';
import { ScreenHeader, PermissionGuard } from '@/components';
import { Permissions } from '@/constants/Permissions';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────
// Type Config Map
// ─────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    company_cost: {
        label: 'Chi phí công ty',
        icon: 'wallet-outline',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
    },
    project_cost: {
        label: 'Chi phí dự án',
        icon: 'construct-outline',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
    },
    material_bill: {
        label: 'Phiếu xuất vật tư',
        icon: 'cube-outline',
        color: '#8B5CF6',
        bgColor: '#EDE9FE',
    },
    acceptance: {
        label: 'Nghiệm thu KH',
        icon: 'checkmark-done-outline',
        color: '#10B981',
        bgColor: '#D1FAE5',
    },
    change_request: {
        label: 'Yêu cầu thay đổi',
        icon: 'git-compare-outline',
        color: '#EC4899',
        bgColor: '#FCE7F3',
    },
    additional_cost: {
        label: 'CP Phát sinh',
        icon: 'trending-up-outline',
        color: '#F97316',
        bgColor: '#FFF7ED',
    },
    sub_payment: {
        label: 'Thanh toán NTP',
        icon: 'card-outline',
        color: '#0EA5E9',
        bgColor: '#E0F2FE',
    },
    contract: {
        label: 'HĐ chờ KH',
        icon: 'document-text-outline',
        color: '#6366F1',
        bgColor: '#E0E7FF',
    },
    payment: {
        label: 'TT chờ KH',
        icon: 'cash-outline',
        color: '#D946EF',
        bgColor: '#FAE8FF',
    },
    sub_acceptance: {
        label: 'NT NTP',
        icon: 'checkbox-outline',
        color: '#0D9488',
        bgColor: '#CCFBF1',
    },
    supplier_acceptance: {
        label: 'NT NCC',
        icon: 'storefront-outline',
        color: '#84CC16',
        bgColor: '#ECFCCB',
    },
};

const APPROVAL_LEVEL_CONFIG: Record<string, { label: string; shortLabel: string; color: string; bgColor: string }> = {
    management: {
        label: 'Ban Điều Hành',
        shortLabel: 'BĐH',
        color: '#F97316',
        bgColor: '#FFF7ED',
    },
    accountant: {
        label: 'Kế Toán',
        shortLabel: 'KT',
        color: '#06B6D4',
        bgColor: '#ECFEFF',
    },
    customer: {
        label: 'Khách Hàng',
        shortLabel: 'KH',
        color: '#10B981',
        bgColor: '#D1FAE5',
    },
    change_request: {
        label: 'Yêu Cầu Thay Đổi',
        shortLabel: 'CR',
        color: '#EC4899',
        bgColor: '#FCE7F3',
    },
    additional_cost: {
        label: 'CP Phát Sinh',
        shortLabel: 'CPPS',
        color: '#F97316',
        bgColor: '#FFF7ED',
    },
    sub_acceptance: {
        label: 'Nghiệm Thu NTP',
        shortLabel: 'NT',
        color: '#0D9488',
        bgColor: '#CCFBF1',
    },
    supplier_acceptance: {
        label: 'Nghiệm Thu NCC',
        shortLabel: 'NCC',
        color: '#84CC16',
        bgColor: '#ECFCCB',
    },
};

const DEFAULT_LEVEL_CONFIG = {
    label: 'Duyệt',
    shortLabel: 'Duyệt',
    color: '#6B7280',
    bgColor: '#F3F4F6',
};

// ─────────────────────────────────────────────────
// Role Filter Config
// ─────────────────────────────────────────────────
const ROLE_FILTERS: { key: string; label: string; icon: string; color: string }[] = [
    { key: 'all', label: 'Tất cả', icon: 'grid-outline', color: '#6B7280' },
    { key: 'project_owner', label: 'Giám đốc', icon: 'ribbon-outline', color: '#F97316' },
    { key: 'accountant', label: 'Kế toán', icon: 'calculator-outline', color: '#06B6D4' },
    { key: 'client', label: 'Khách hàng', icon: 'people-outline', color: '#10B981' },
    { key: 'project_manager', label: 'QLDA', icon: 'person-outline', color: '#3B82F6' },
    { key: 'site_supervisor', label: 'Giám sát', icon: 'eye-outline', color: '#0D9488' },
];

export default function ApprovalCenterScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();

    const [data, setData] = useState<ApprovalCenterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedRole, setSelectedRole] = useState<string>('all');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Animated values for card entry
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        loadApprovals();
    }, [selectedType]);

    const loadApprovals = async () => {
        try {
            setLoading(true);
            const params = selectedType !== 'all' ? { type: selectedType } : {};
            const response = await approvalCenterApi.getApprovals(params);

            if (response.success) {
                setData(response.data);
                // Animate in
                fadeAnim.setValue(0);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            }
        } catch (error: any) {
            console.error('[ApprovalCenter] Error:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu duyệt');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadApprovals();
    };

    const handleQuickApprove = async (item: ApprovalItem) => {
        const levelLabel = (APPROVAL_LEVEL_CONFIG[item.approval_level] || DEFAULT_LEVEL_CONFIG).label;

        Alert.alert(
            'Xác nhận duyệt',
            `Duyệt "${item.title}" (${levelLabel})?\n\nSố tiền: ${formatCurrency(item.amount)}`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Duyệt',
                    onPress: async () => {
                        try {
                            setActionLoading(item.id);
                            const response = await approvalCenterApi.quickApprove(item.type, item.id);
                            if (response.success) {
                                Alert.alert('✅ Thành công', response.message);
                                loadApprovals();
                            }
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể duyệt');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleOpenReject = (item: ApprovalItem) => {
        setRejectTarget(item);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectTarget || !rejectReason.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối');
            return;
        }

        try {
            setActionLoading(rejectTarget.id);
            const response = await approvalCenterApi.quickReject(
                rejectTarget.type,
                rejectTarget.id,
                rejectReason.trim()
            );
            if (response.success) {
                Alert.alert('✅ Thành công', response.message);
                setShowRejectModal(false);
                setRejectTarget(null);
                loadApprovals();
            }
        } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối');
        } finally {
            setActionLoading(null);
        }
    };

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
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Vừa xong';
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    // ─────────────────────────────────────────────────
    // Summary Cards
    // ─────────────────────────────────────────────────
    const renderSummarySection = () => {
        if (!data || data.summary.length === 0) return null;

        return (
            <View style={styles.summarySection}>
                {/* Grand Total Banner */}
                <View style={styles.grandTotalBanner}>
                    <View style={styles.grandTotalLeft}>
                        <View style={styles.grandTotalIconContainer}>
                            <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
                        </View>
                        <View>
                            <Text style={styles.grandTotalLabel}>Yêu cầu chờ duyệt</Text>
                            <Text style={styles.grandTotalValue}>{data.grand_total}</Text>
                        </View>
                    </View>
                    <View style={styles.grandTotalBadge}>
                        <Ionicons name="notifications" size={16} color="#F59E0B" />
                    </View>
                </View>

                {/* Category Cards */}
                <View style={styles.summaryCardsRow}>
                    {data.summary.map((s) => {
                        const config = TYPE_CONFIG[s.type] || TYPE_CONFIG.company_cost;
                        return (
                            <TouchableOpacity
                                key={s.type}
                                style={[
                                    styles.summaryCard,
                                    selectedType === s.type && styles.summaryCardActive,
                                    { borderColor: config.color + '40' },
                                ]}
                                onPress={() => setSelectedType(selectedType === s.type ? 'all' : s.type)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.summaryCardIcon, { backgroundColor: config.bgColor }]}>
                                    <Ionicons name={config.icon as any} size={20} color={config.color} />
                                </View>
                                <Text style={styles.summaryCardCount}>{s.total}</Text>
                                <Text style={styles.summaryCardLabel} numberOfLines={1}>{s.label}</Text>
                                <View style={styles.summaryCardBreakdown}>
                                    {s.pending_management > 0 && (
                                        <View style={[styles.miniTag, { backgroundColor: '#FFF7ED' }]}>
                                            <Text style={[styles.miniTagText, { color: '#F97316' }]}>
                                                BĐH: {s.pending_management}
                                            </Text>
                                        </View>
                                    )}
                                    {s.pending_accountant > 0 && (
                                        <View style={[styles.miniTag, { backgroundColor: '#ECFEFF' }]}>
                                            <Text style={[styles.miniTagText, { color: '#06B6D4' }]}>
                                                KT: {s.pending_accountant}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    // ─────────────────────────────────────────────────
    // Approval Item Card
    // ─────────────────────────────────────────────────
    // Check if user has the required role
    const userHasRole = (requiredRole: string): boolean => {
        if (!data?.user_roles) return true; // fallback: show all
        if (data.user_roles.includes('super_admin') || data.user_roles.includes('admin')) return true;
        return data.user_roles.includes(requiredRole);
    };

    // Filter items by selected role
    const getFilteredItems = (): ApprovalItem[] => {
        if (!data?.items) return [];
        let items = data.items;
        if (selectedRole !== 'all') {
            items = items.filter(item => item.required_role === selectedRole);
        }
        return items;
    };

    const renderApprovalItem = ({ item, index }: { item: ApprovalItem; index: number }) => {
        const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.company_cost;
        const levelConfig = APPROVAL_LEVEL_CONFIG[item.approval_level] || DEFAULT_LEVEL_CONFIG;
        const isLoading = actionLoading === item.id;
        const hasRole = userHasRole(item.required_role);

        return (
            <Animated.View
                style={[
                    styles.approvalCard,
                    !hasRole && styles.approvalCardDimmed,
                    {
                        opacity: fadeAnim,
                        transform: [{
                            translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                            }),
                        }],
                    },
                ]}
            >
                {/* Card Header */}
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => handleNavigateToDetail(item)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.typeIcon, { backgroundColor: typeConfig.bgColor }]}>
                        <Ionicons name={typeConfig.icon as any} size={22} color={typeConfig.color} />
                    </View>
                    <View style={styles.cardHeaderContent}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                    </View>
                    <View style={[styles.levelBadge, { backgroundColor: levelConfig.bgColor }]}>
                        <Text style={[styles.levelBadgeText, { color: levelConfig.color }]}>
                            {levelConfig.shortLabel}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Required Role Badge */}
                <View style={styles.roleBadgeRow}>
                    <View style={[styles.roleBadge, { backgroundColor: (item.required_role_color || '#6B7280') + '15' }]}>
                        <Ionicons
                            name={(item.required_role_icon || 'shield-outline') as any}
                            size={13}
                            color={item.required_role_color || '#6B7280'}
                        />
                        <Text style={[styles.roleBadgeText, { color: item.required_role_color || '#6B7280' }]}>
                            Cần: {item.required_role_label || 'N/A'}
                        </Text>
                    </View>
                    {hasRole ? (
                        <View style={styles.roleMatchBadge}>
                            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                            <Text style={styles.roleMatchText}>Có quyền</Text>
                        </View>
                    ) : (
                        <View style={styles.roleNoMatchBadge}>
                            <Ionicons name="lock-closed" size={13} color="#EF4444" />
                            <Text style={styles.roleNoMatchText}>Không có quyền</Text>
                        </View>
                    )}
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                    <View style={styles.cardInfoRow}>
                        <View style={styles.cardInfoItem}>
                            <Ionicons name="cash-outline" size={14} color="#6B7280" />
                            <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
                        </View>
                        <View style={styles.cardInfoItem}>
                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                            <Text style={styles.cardTime}>{formatDate(item.created_at)}</Text>
                        </View>
                    </View>
                    <View style={styles.cardInfoRow}>
                        <View style={styles.cardInfoItem}>
                            <Ionicons name="person-outline" size={14} color="#6B7280" />
                            <Text style={styles.cardCreator}>{item.created_by}</Text>
                        </View>
                        {item.management_approved_by && (
                            <View style={styles.cardInfoItem}>
                                <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                                <Text style={[styles.cardCreator, { color: '#10B981' }]}>
                                    BĐH: {item.management_approved_by}
                                </Text>
                            </View>
                        )}
                    </View>
                    {item.description && (
                        <Text style={styles.cardDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                </View>

                {/* Card Actions */}
                {item.can_approve && hasRole && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.cardActionBtn, styles.rejectBtn]}
                            onPress={() => handleOpenReject(item)}
                            disabled={isLoading}
                        >
                            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Từ chối</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.cardActionBtn, styles.viewBtn]}
                            onPress={() => handleNavigateToDetail(item)}
                        >
                            <Ionicons name="eye-outline" size={18} color="#6B7280" />
                            <Text style={styles.viewBtnText}>Xem</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.cardActionBtn, styles.approveBtn]}
                            onPress={() => handleQuickApprove(item)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.approveBtnText}>Duyệt</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* View-only for users without role */}
                {(!hasRole || !item.can_approve) && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.cardActionBtn, { flex: 1 }]}
                            onPress={() => handleNavigateToDetail(item)}
                        >
                            <Ionicons name="eye-outline" size={18} color="#6B7280" />
                            <Text style={styles.viewBtnText}>Xem chi tiết</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>
        );
    };

    // ─────────────────────────────────────────────────
    // Empty State
    // ─────────────────────────────────────────────────
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={80} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>Tuyệt vời! 🎉</Text>
            <Text style={styles.emptyText}>
                Không có yêu cầu nào đang chờ duyệt
            </Text>
            <Text style={styles.emptySubtext}>
                Bạn đã xử lý tất cả các yêu cầu
            </Text>
        </View>
    );

    // ─────────────────────────────────────────────────
    // Type Filters
    // ─────────────────────────────────────────────────
    const typeFilters = [
        { key: 'all', label: 'Tất cả', icon: 'grid-outline' },
        { key: 'company_cost', label: 'CP Công ty', icon: 'wallet-outline' },
        { key: 'project_cost', label: 'CP Dự án', icon: 'construct-outline' },
        { key: 'material_bill', label: 'Vật tư', icon: 'cube-outline' },
        { key: 'acceptance', label: 'Nghiệm thu', icon: 'checkmark-done-outline' },
        { key: 'change_request', label: 'Thay đổi', icon: 'git-compare-outline' },
        { key: 'additional_cost', label: 'Phát sinh', icon: 'trending-up-outline' },
        { key: 'sub_payment', label: 'TT NTP', icon: 'card-outline' },
        { key: 'contract', label: 'Hợp đồng', icon: 'document-text-outline' },
        { key: 'payment', label: 'TT KH', icon: 'cash-outline' },
        { key: 'sub_acceptance', label: 'NT NTP', icon: 'checkbox-outline' },
        { key: 'supplier_acceptance', label: 'NT NCC', icon: 'storefront-outline' },
    ];

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Trung Tâm Duyệt"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={onRefresh}
                        disabled={loading}
                    >
                        <Ionicons
                            name="refresh-outline"
                            size={22}
                            color={loading ? '#9CA3AF' : '#3B82F6'}
                        />
                    </TouchableOpacity>
                }
            />

            {/* Type Filter Bar */}
            <View style={styles.filterBar}>
                <FlatList
                    horizontal
                    data={typeFilters}
                    keyExtractor={(item) => item.key}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                selectedType === item.key && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedType(item.key)}
                        >
                            <Ionicons
                                name={item.icon as any}
                                size={16}
                                color={selectedType === item.key ? '#FFFFFF' : '#6B7280'}
                            />
                            <Text
                                style={[
                                    styles.filterChipText,
                                    selectedType === item.key && styles.filterChipTextActive,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Role Filter Bar */}
            <View style={styles.roleFilterBar}>
                <View style={styles.roleFilterHeader}>
                    <Ionicons name="people-outline" size={14} color="#6B7280" />
                    <Text style={styles.roleFilterLabel}>Theo vai trò:</Text>
                </View>
                <FlatList
                    horizontal
                    data={ROLE_FILTERS}
                    keyExtractor={(item) => item.key}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item: roleItem }) => {
                        const isActive = selectedRole === roleItem.key;
                        const isUserRole = data?.user_roles?.includes(roleItem.key) || (roleItem.key === 'all');
                        return (
                            <TouchableOpacity
                                style={[
                                    styles.roleChip,
                                    isActive && { backgroundColor: roleItem.color, borderColor: roleItem.color },
                                    isUserRole && !isActive && styles.roleChipHighlight,
                                ]}
                                onPress={() => setSelectedRole(roleItem.key)}
                            >
                                <Ionicons
                                    name={roleItem.icon as any}
                                    size={14}
                                    color={isActive ? '#FFFFFF' : roleItem.color}
                                />
                                <Text
                                    style={[
                                        styles.roleChipText,
                                        isActive && { color: '#FFFFFF' },
                                        !isActive && { color: roleItem.color },
                                    ]}
                                >
                                    {roleItem.label}
                                </Text>
                                {isUserRole && !isActive && roleItem.key !== 'all' && (
                                    <View style={styles.roleChipDot} />
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Đang tải yêu cầu...</Text>
                </View>
            ) : (
                <FlatList
                    data={getFilteredItems()}
                    renderItem={renderApprovalItem}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    ListHeaderComponent={renderSummarySection}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={{
                        paddingBottom: tabBarHeight + 24,
                        flexGrow: 1,
                    }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Reject Modal */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlayInner}>
                            <View style={styles.modalContent}>
                                {/* Modal Header */}
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalIconBg}>
                                        <Ionicons name="alert-circle" size={32} color="#EF4444" />
                                    </View>
                                    <Text style={styles.modalTitle}>Từ chối yêu cầu</Text>
                                    {rejectTarget && (
                                        <Text style={styles.modalItemName} numberOfLines={1}>
                                            "{rejectTarget.title}"
                                        </Text>
                                    )}
                                    <Text style={styles.modalSubtitle}>
                                        Nhập lý do từ chối để người tạo chỉnh sửa lại
                                    </Text>
                                </View>

                                {/* Reason Input */}
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Nhập lý do từ chối (bắt buộc)..."
                                    placeholderTextColor="#9CA3AF"
                                    value={rejectReason}
                                    onChangeText={setRejectReason}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    autoFocus
                                />

                                {/* Modal Actions */}
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.modalCancelBtn]}
                                        onPress={() => {
                                            setShowRejectModal(false);
                                            setRejectTarget(null);
                                            setRejectReason('');
                                        }}
                                        disabled={actionLoading !== null}
                                    >
                                        <Text style={styles.modalCancelText}>Hủy</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.modalBtn,
                                            styles.modalRejectBtn,
                                            (!rejectReason.trim() || actionLoading !== null) && styles.modalBtnDisabled,
                                        ]}
                                        onPress={handleReject}
                                        disabled={!rejectReason.trim() || actionLoading !== null}
                                    >
                                        {actionLoading !== null ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <Text style={styles.modalRejectText}>Xác nhận từ chối</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
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
        backgroundColor: '#F0F2F5',
    },
    refreshBtn: {
        padding: 4,
    },

    // Filter Bar
    filterBar: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#1B4F72',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#9CA3AF',
    },

    // Summary Section
    summarySection: {
        padding: 16,
        paddingBottom: 8,
    },
    grandTotalBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1B4F72',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#1B4F72',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    grandTotalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    grandTotalIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    grandTotalLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 2,
    },
    grandTotalValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    grandTotalBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Summary Cards
    summaryCardsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    summaryCard: {
        width: (SCREEN_WIDTH - 32 - 20) / 3,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    summaryCardActive: {
        borderColor: '#1B4F72',
        shadowColor: '#1B4F72',
        shadowOpacity: 0.15,
        elevation: 3,
    },
    summaryCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryCardCount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 2,
    },
    summaryCardLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 6,
    },
    summaryCardBreakdown: {
        flexDirection: 'row',
        gap: 4,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    miniTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    miniTagText: {
        fontSize: 9,
        fontWeight: '700',
    },

    // Approval Card
    approvalCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        overflow: 'hidden',
    },
    approvalCardDimmed: {
        opacity: 0.65,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    // Role Badge Row (inside card)
    roleBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    roleMatchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#D1FAE5',
    },
    roleMatchText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#10B981',
    },
    roleNoMatchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#FEE2E2',
    },
    roleNoMatchText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
    },

    // Role Filter Bar
    roleFilterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        gap: 8,
    },
    roleFilterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    roleFilterLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
    },
    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        marginRight: 6,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    roleChipHighlight: {
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
    },
    roleChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    roleChipDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginLeft: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
        gap: 12,
    },
    typeIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardHeaderContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 3,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    levelBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    levelBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },

    // Card Body
    cardBody: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    cardInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    cardInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981',
    },
    cardTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    cardCreator: {
        fontSize: 12,
        color: '#6B7280',
    },
    cardDescription: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginTop: 4,
    },

    // Card Actions
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cardActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    rejectBtn: {
        borderRightWidth: 1,
        borderRightColor: '#F3F4F6',
    },
    rejectBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },
    viewBtn: {
        borderRightWidth: 1,
        borderRightColor: '#F3F4F6',
    },
    viewBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    approveBtn: {
        backgroundColor: '#10B981',
        borderBottomRightRadius: 16,
    },
    approveBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#9CA3AF',
    },

    // Reject Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalOverlayInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
    },
    modalItemName: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 19,
    },
    modalInput: {
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        height: 110,
        textAlignVertical: 'top',
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    modalRejectBtn: {
        backgroundColor: '#EF4444',
    },
    modalCancelText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '600',
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
