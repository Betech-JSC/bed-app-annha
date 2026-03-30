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
// Simplified Group Config (role-based like CRM)
// ─────────────────────────────────────────────────
const GROUP_CONFIG: Record<string, {
    label: string;
    shortLabel: string;
    icon: string;
    color: string;
    bgColor: string;
    order: number;
}> = {
    management: {
        label: 'Ban Điều Hành duyệt',
        shortLabel: 'BĐH',
        icon: 'ribbon-outline',
        color: '#F97316',
        bgColor: '#FFF7ED',
        order: 1,
    },
    accountant: {
        label: 'Kế Toán xác nhận',
        shortLabel: 'KT',
        icon: 'calculator-outline',
        color: '#06B6D4',
        bgColor: '#ECFEFF',
        order: 2,
    },
    supervisor: {
        label: 'Giám sát duyệt',
        shortLabel: 'GS',
        icon: 'eye-outline',
        color: '#0D9488',
        bgColor: '#CCFBF1',
        order: 3,
    },
    project_manager: {
        label: 'QLDA duyệt',
        shortLabel: 'QLDA',
        icon: 'person-outline',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        order: 4,
    },
    customer: {
        label: 'Khách hàng duyệt',
        shortLabel: 'KH',
        icon: 'people-outline',
        color: '#10B981',
        bgColor: '#D1FAE5',
        order: 5,
    },
    change_request: {
        label: 'Yêu cầu thay đổi',
        shortLabel: 'CR',
        icon: 'git-compare-outline',
        color: '#EC4899',
        bgColor: '#FCE7F3',
        order: 6,
    },
    additional_cost: {
        label: 'Chi phí phát sinh',
        shortLabel: 'CPPS',
        icon: 'trending-up-outline',
        color: '#F97316',
        bgColor: '#FFF7ED',
        order: 7,
    },
    sub_acceptance: {
        label: 'Nghiệm thu NTP',
        shortLabel: 'NT NTP',
        icon: 'checkbox-outline',
        color: '#0D9488',
        bgColor: '#CCFBF1',
        order: 8,
    },
    supplier_acceptance: {
        label: 'Nghiệm thu NCC',
        shortLabel: 'NT NCC',
        icon: 'storefront-outline',
        color: '#84CC16',
        bgColor: '#ECFCCB',
        order: 9,
    },
    construction_log: {
        label: 'Nhật ký công trường',
        shortLabel: 'NK',
        icon: 'newspaper-outline',
        color: '#A855F7',
        bgColor: '#F3E8FF',
        order: 10,
    },
    schedule_adjustment: {
        label: 'Điều chỉnh tiến độ',
        shortLabel: 'TĐ',
        icon: 'calendar-outline',
        color: '#E11D48',
        bgColor: '#FFE4E6',
        order: 11,
    },
    contract: {
        label: 'Hợp đồng',
        shortLabel: 'HĐ',
        icon: 'document-text-outline',
        color: '#6366F1',
        bgColor: '#E0E7FF',
        order: 12,
    },
    project_payment: {
        label: 'Thanh toán dự án',
        shortLabel: 'TT',
        icon: 'cash-outline',
        color: '#D946EF',
        bgColor: '#FAE8FF',
        order: 13,
    },
};

const DEFAULT_GROUP = {
    label: 'Khác',
    shortLabel: 'Khác',
    icon: 'ellipsis-horizontal-outline',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    order: 99,
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
    const [selectedGroup, setSelectedGroup] = useState<string>('all');

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

    const onRefresh = () => {
        setRefreshing(true);
        loadApprovals();
    };

    // ─────────────────────────────────────────────────
    // Group items by approval_level into sections
    // ─────────────────────────────────────────────────
    const sections = useMemo(() => {
        if (!data?.items) return [];

        const grouped: Record<string, ApprovalItem[]> = {};
        for (const item of data.items) {
            const groupKey = item.approval_level || 'other';
            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(item);
        }

        const result = Object.entries(grouped)
            .map(([key, items]) => {
                const config = GROUP_CONFIG[key] || DEFAULT_GROUP;
                return {
                    key,
                    title: config.label,
                    shortLabel: config.shortLabel,
                    icon: config.icon,
                    color: config.color,
                    bgColor: config.bgColor,
                    order: config.order,
                    data: items,
                };
            })
            .sort((a, b) => a.order - b.order);

        // If a group filter is active, only show that group
        if (selectedGroup !== 'all') {
            return result.filter(s => s.key === selectedGroup);
        }

        return result;
    }, [data?.items, selectedGroup]);

    // Group counts for the tab strip
    const groupCounts = useMemo(() => {
        if (!data?.items) return {};
        const counts: Record<string, number> = {};
        for (const item of data.items) {
            const key = item.approval_level || 'other';
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    }, [data?.items]);

    const groupKeys = useMemo(() => {
        return Object.keys(groupCounts).sort((a, b) => {
            const orderA = GROUP_CONFIG[a]?.order ?? 99;
            const orderB = GROUP_CONFIG[b]?.order ?? 99;
            return orderA - orderB;
        });
    }, [groupCounts]);

    // ─────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────
    const handleQuickApprove = async (item: ApprovalItem) => {
        const groupConfig = GROUP_CONFIG[item.approval_level] || DEFAULT_GROUP;
        Alert.alert(
            'Xác nhận duyệt',
            `Duyệt "${item.title}"?\n\n${item.amount > 0 ? `Số tiền: ${formatCurrency(item.amount)}` : ''}`,
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
    // Group Filter Strip
    // ─────────────────────────────────────────────────
    const renderGroupStrip = () => {
        if (!data || data.grand_total === 0) return null;

        return (
            <View style={styles.stripContainer}>
                {/* Total Badge */}
                <TouchableOpacity
                    style={[
                        styles.stripItem,
                        selectedGroup === 'all' && styles.stripItemActive,
                    ]}
                    onPress={() => setSelectedGroup('all')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.stripBadge, selectedGroup === 'all' && { backgroundColor: '#1B4F72' }]}>
                        <Text style={[styles.stripBadgeText, selectedGroup === 'all' && { color: '#FFF' }]}>
                            {data.grand_total}
                        </Text>
                    </View>
                    <Text style={[styles.stripLabel, selectedGroup === 'all' && styles.stripLabelActive]}>
                        Tất cả
                    </Text>
                </TouchableOpacity>

                {groupKeys.map((key) => {
                    const config = GROUP_CONFIG[key] || DEFAULT_GROUP;
                    const count = groupCounts[key] || 0;
                    const isActive = selectedGroup === key;

                    return (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.stripItem,
                                isActive && { backgroundColor: config.color + '15', borderColor: config.color },
                            ]}
                            onPress={() => setSelectedGroup(isActive ? 'all' : key)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.stripBadge, { backgroundColor: isActive ? config.color : config.bgColor }]}>
                                <Text style={[styles.stripBadgeText, { color: isActive ? '#FFF' : config.color }]}>
                                    {count}
                                </Text>
                            </View>
                            <Text style={[styles.stripLabel, isActive && { color: config.color, fontWeight: '700' }]}>
                                {config.shortLabel}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    // ─────────────────────────────────────────────────
    // Section Header
    // ─────────────────────────────────────────────────
    const renderSectionHeader = ({ section }: { section: any }) => {
        const config = GROUP_CONFIG[section.key] || DEFAULT_GROUP;
        return (
            <View style={[styles.sectionHeader, { borderLeftColor: section.color }]}>
                <View style={[styles.sectionIcon, { backgroundColor: section.bgColor }]}>
                    <Ionicons name={section.icon as any} size={18} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={[styles.sectionCount, { backgroundColor: section.color }]}>
                    <Text style={styles.sectionCountText}>{section.data.length}</Text>
                </View>
            </View>
        );
    };

    // ─────────────────────────────────────────────────
    // Approval Item Card (simplified)
    // ─────────────────────────────────────────────────
    const renderApprovalItem = ({ item }: { item: ApprovalItem }) => {
        const typeIcon = TYPE_ICON[item.type] || { icon: 'document-outline', color: '#6B7280' };
        const isLoading = actionLoading === item.id;

        return (
            <View style={styles.card}>
                {/* Card Content */}
                <TouchableOpacity
                    style={styles.cardContent}
                    onPress={() => handleNavigateToDetail(item)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.cardIcon, { backgroundColor: typeIcon.color + '15' }]}>
                        <Ionicons name={typeIcon.icon as any} size={20} color={typeIcon.color} />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                        <View style={styles.cardMeta}>
                            {item.amount > 0 && (
                                <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
                            )}
                            <Text style={styles.cardTime}>
                                <Ionicons name="time-outline" size={11} color="#9CA3AF" /> {formatDate(item.created_at)}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>

                {/* Quick Actions */}
                {item.can_approve && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => handleOpenReject(item)}
                            disabled={isLoading}
                        >
                            <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Từ chối</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => handleQuickApprove(item)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                                    <Text style={styles.approveBtnText}>Duyệt</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // ─────────────────────────────────────────────────
    // Empty State
    // ─────────────────────────────────────────────────
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
                <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>Tuyệt vời! 🎉</Text>
            <Text style={styles.emptyText}>Không có yêu cầu nào chờ duyệt</Text>
        </View>
    );

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

            {/* Group Filter Strip */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.stripScroll}
                contentContainerStyle={styles.stripScrollContent}
            >
                {renderGroupStrip()}
            </ScrollView>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    renderItem={renderApprovalItem}
                    renderSectionHeader={renderSectionHeader}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={{
                        paddingBottom: tabBarHeight + 24,
                        flexGrow: sections.length === 0 ? 1 : undefined,
                    }}
                    stickySectionHeadersEnabled={false}
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
                                </View>

                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Nhập lý do từ chối..."
                                    placeholderTextColor="#9CA3AF"
                                    value={rejectReason}
                                    onChangeText={setRejectReason}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    autoFocus
                                />

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
        backgroundColor: '#F3F4F6',
    },
    refreshBtn: {
        padding: 4,
    },

    // ─── Strip Filter ───
    stripScroll: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        maxHeight: 60,
    },
    stripScrollContent: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    stripContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stripItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    stripItemActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#1B4F72',
    },
    stripBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
        backgroundColor: '#F3F4F6',
    },
    stripBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#374151',
    },
    stripLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    stripLabelActive: {
        color: '#1B4F72',
        fontWeight: '700',
    },

    // ─── Loading ───
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

    // ─── Section Header ───
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 20,
        gap: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
        marginLeft: 16,
        marginRight: 16,
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    sectionCount: {
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    sectionCountText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // ─── Card ───
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    cardIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10B981',
    },
    cardTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },

    // ─── Card Actions ───
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        gap: 5,
    },
    rejectBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        gap: 5,
        backgroundColor: '#10B981',
        borderBottomRightRadius: 14,
    },
    approveBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // ─── Empty State ───
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIconBg: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
    },

    // ─── Reject Modal ───
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    modalItemName: {
        fontSize: 13,
        color: '#3B82F6',
        fontWeight: '600',
    },
    modalInput: {
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
        backgroundColor: '#F9FAFB',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 13,
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
