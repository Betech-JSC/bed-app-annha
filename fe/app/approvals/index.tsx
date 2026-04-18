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
    Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { approvalCenterApi, ApprovalItem, ApprovalCenterData, BudgetItemOption } from '@/api/approvalCenterApi';
import { ScreenHeader, PermissionDenied } from '@/components';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import * as WebBrowser from 'expo-web-browser';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────
// Consolidated Role Config (Matches CRM Tabs)
// ─────────────────────────────────────────────────
const ROLE_TABS = [
    { key: 'management', label: 'BĐH', icon: 'business-outline', color: '#F59E0B', bgColor: '#FFF7ED' },
    { key: 'accountant', label: 'Kế Toán', icon: 'calculator-outline', color: '#10B981', bgColor: '#F0FDF4' },
    { key: 'project_manager', label: 'QLDA (PM)', icon: 'construct-outline', color: '#3B82F6', bgColor: '#EFF6FF' },
    { key: 'supervisor', label: 'Giám Sát', icon: 'search-outline', color: '#8B5CF6', bgColor: '#F5F3FF' },
    { key: 'customer', label: 'Khách Hàng', icon: 'people-outline', color: '#EF4444', bgColor: '#FEF2F2' },
    { key: 'hr', label: 'Nhân Sự', icon: 'id-card-outline', color: '#06B6D4', bgColor: '#ECFEFF' },
];

const CATEGORIES = [
    { label: 'Tất cả', value: 'all', icon: 'apps-outline' },
    { label: 'Tài chính', value: 'finance', icon: 'cash-outline' },
    { label: 'Nghiệm thu', value: 'acceptance', icon: 'checkmark-circle-outline' },
    { label: 'Vận hành', value: 'technical', icon: 'settings-outline' },
    { label: 'Nhân sự', value: 'hr', icon: 'people-circle-outline' },
];

const STATUS_FILTERS = [
    { label: 'Chờ xử lý', value: 'pending' },
    { label: 'Đã xử lý', value: 'processed' },
    { label: 'Tất cả', value: 'all' },
];

// Grouping mapping from approval_level to Role Tabs
const ROLE_MAPPING: Record<string, string> = {
    management: 'management',
    accountant: 'accountant',
    project_manager: 'project_manager',
    supervisor: 'supervisor',
    customer: 'customer',
    hr: 'hr',
};

// Colors for item types (Synced with Web CRM)
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    project_cost: { icon: 'cash-outline', color: '#3B82F6', label: 'Chi phí DA' },
    company_cost: { icon: 'wallet-outline', color: '#F59E0B', label: 'Chi phí TY' },
    acceptance: { icon: 'checkmark-done-outline', color: '#10B981', label: 'Nghiệm thu' },
    change_request: { icon: 'git-compare-outline', color: '#EC4899', label: 'Thay đổi' },
    additional_cost: { icon: 'trending-up-outline', color: '#F97316', label: 'Phát sinh' },
    sub_payment: { icon: 'card-outline', color: '#0EA5E9', label: 'Thanh toán NTP' },
    contract: { icon: 'document-text-outline', color: '#6366F1', label: 'Hợp đồng' },
    payment: { icon: 'receipt-outline', color: '#D946EF', label: 'Cấp tiền' },
    sub_acceptance: { icon: 'checkbox-outline', color: '#84CC16', label: 'NT NTP' },
    supplier_acceptance: { icon: 'storefront-outline', color: '#22C55E', label: 'NT NCC' },
    construction_log: { icon: 'newspaper-outline', color: '#A855F7', label: 'Nhật ký' },
    schedule_adjustment: { icon: 'calendar-outline', color: '#E11D48', label: 'Tiến độ' },
    budget: { icon: 'pie-chart-outline', color: '#3B82F6', label: 'Ngân sách' },
    material_bill: { icon: 'cube-outline', color: '#8B5CF6', label: 'Phiếu vật tư' },
    defect: { icon: 'alert-circle-outline', color: '#F43F5E', label: 'Lỗi' },
    defect_verify: { icon: 'alert-circle-outline', color: '#F43F5E', label: 'Chờ xác nhận lỗi' },
    equipment_rental: { icon: 'construct-outline', color: '#06B6D4', label: 'Thuê TB' },
    asset_usage: { icon: 'trail-sign-outline', color: '#3B82F6', label: 'Sử dụng kho' },
    attendance: { icon: 'finger-print-outline', color: '#06B6D4', label: 'Chấm công' },
};

export default function ApprovalCenterScreen() {
    const router = useRouter();
    const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
    const tabBarHeight = useTabBarHeight();

    const [data, setData] = useState<ApprovalCenterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // UI States
    // Pre-select tab from notification deep-link if provided
    const [selectedRole, setSelectedRole] = useState<string>(initialTab || '');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    
    // Action States
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    
    // Permission States
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState('');
    
    // Budget Selection States (for Accountant)
    const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<number | null>(null);
    const [budgetPickerVisible, setBudgetPickerVisible] = useState(false);

    useEffect(() => {
        loadApprovals();
    }, []);

    const loadApprovals = async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            const response = await approvalCenterApi.getApprovals();
            if (response.success) {
                setData(response.data);

                // Set initial tab: prefer notification deep-link tab, then first available summary tab
                if (!selectedRole && response.data.summary.length > 0) {
                    const deepLinkTab = initialTab && ROLE_TABS.find(t => t.key === initialTab);
                    setSelectedRole(deepLinkTab ? initialTab! : response.data.summary[0].type);
                }
            }
        } catch (error: any) {
            console.error('[ApprovalCenter] Error:', error);
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || 'Bạn không có quyền xem thông tin duyệt.');
            } else {
                Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu duyệt');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleApprove = async (item: ApprovalItem, notes?: string) => {
        // Business Rule: Mandatory attachments for Accountant (skip attendance/labor costs)
        if (selectedRole === 'accountant' && item.type !== 'attendance' && (item.attachments_count === 0 || !item.attachments_count)) {
            // Check if it's a financial item
            const financialTypes = ['project_cost', 'company_cost', 'sub_payment', 'material_bill', 'budget'];
            if (financialTypes.includes(item.type)) {
                Alert.alert(
                    'Thiếu chứng từ',
                    'Cảnh báo: Yêu cầu tài chính này chưa có tệp chứng từ đính kèm. Kế toán bắt buộc phải kiểm tra chứng từ trước khi xác nhận.',
                    [{ text: 'Đã hiểu' }]
                );
                return;
            }
        }

        // Business Rule: Accountant must select budget for project financial items
        const isAccountantFinancial = selectedRole === 'accountant' 
            && ['project_cost', 'sub_payment', 'material_bill'].includes(item.type)
            && item.project_id;
        const budgetOptions = item.project_id ? (data?.budget_items_by_project?.[item.project_id] || []) : [];
        
        if (isAccountantFinancial && budgetOptions.length > 0 && !selectedBudgetItemId) {
            Alert.alert(
                'Chọn ngân sách',
                'Kế toán bắt buộc phải chọn hạng mục ngân sách cho khoản chi này trước khi xác nhận.',
                [{ text: 'Đã hiểu' }]
            );
            return;
        }

        Alert.alert(
            'Xác nhận duyệt',
            `Bạn có chắc chắn muốn duyệt yêu cầu "${item.title}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                { 
                    text: 'Duyệt', 
                    onPress: async () => {
                        try {
                            setActionLoading(item.id);
                            const res = await approvalCenterApi.quickApprove(
                                item.type, item.id, notes,
                                isAccountantFinancial ? (selectedBudgetItemId ?? undefined) : undefined
                            );
                            if (res.success) {
                                setDetailItem(null);
                                setSelectedBudgetItemId(null);
                                loadApprovals(); // Refresh full data to sync stats
                            } else {
                                Alert.alert('Thông báo', res.message || 'Không thể duyệt yêu cầu này');
                            }
                        } catch (error) {
                            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi duyệt');
                        } finally {
                            setActionLoading(null);
                        }
                    }
                }
            ]
        );
    };

    const handleReject = async () => {
        if (!detailItem || !rejectReason.trim()) return;
        try {
            setActionLoading(detailItem.id);
            const res = await approvalCenterApi.quickReject(detailItem.type, detailItem.id, rejectReason);
            if (res.success) {
                setRejectModalVisible(false);
                setDetailItem(null);
                loadApprovals();
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
    // Filtering Logic
    // ─────────────────────────────────────────────────
    const filteredItems = useMemo(() => {
        if (!data) return [];
        
        let items = [...data.items];

        // 1. Filter by Role Group
        if (selectedRole) {
            items = items.filter(i => (i.role_group || i.required_role) === selectedRole);
        }

        // 2. Filter by Category
        if (selectedCategory !== 'all') {
            items = items.filter(i => {
                if (selectedCategory === 'finance') return ['project_cost', 'company_cost', 'sub_payment', 'payment', 'material_bill', 'budget', 'equipment_rental'].includes(i.type);
                if (selectedCategory === 'acceptance') return ['acceptance', 'sub_acceptance', 'supplier_acceptance', 'acceptance_item'].includes(i.type);
                if (selectedCategory === 'technical') return ['change_request', 'additional_cost', 'construction_log', 'schedule_adjustment', 'defect', 'defect_verify', 'asset_usage'].includes(i.type);
                if (selectedCategory === 'hr') return i.type === 'attendance';
                return true;
            });
        }

        return items;
    }, [data, selectedRole, selectedCategory]);

    const sections = useMemo(() => {
        if (statusFilter === 'processed') {
            return [{
                title: 'Hoạt động gần đây',
                data: data?.recent_items || []
            }];
        }

        // Group by Project or Type for "Pending"
        const grouped: Record<string, ApprovalItem[]> = {};
        filteredItems.forEach(item => {
            const groupTitle = item.project_name || 'Khác';
            if (!grouped[groupTitle]) grouped[groupTitle] = [];
            grouped[groupTitle].push(item);
        });

        return Object.entries(grouped).map(([title, items]) => ({
            title,
            data: items
        }));
    }, [filteredItems, statusFilter, data?.recent_items]);

    // ─────────────────────────────────────────────────
    // Formatters
    // ─────────────────────────────────────────────────
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatCompact = (amount: number) => {
        if (!amount) return '0';
        if (amount >= 1e9) return (amount / 1e9).toFixed(1) + ' tỷ';
        if (amount >= 1e6) return (amount / 1e6).toFixed(1) + ' tr';
        if (amount >= 1e3) return (amount / 1e3).toFixed(0) + 'k';
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // ─────────────────────────────────────────────────
    // Render Functions
    // ─────────────────────────────────────────────────
    const renderStats = () => {
        if (!data?.stats) return null;
        const { stats } = data;
        return (
            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { borderLeftColor: '#F59E0B' }]}>
                    <Text style={styles.statVal}>{stats.pending_total}</Text>
                    <Text style={styles.statLab}>Chờ duyệt</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: '#10B981' }]}>
                    <Text style={styles.statVal}>{stats.approved_today}</Text>
                    <Text style={styles.statLab}>Đã duyệt</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: '#EF4444' }]}>
                    <Text style={styles.statVal}>{stats.rejected_today}</Text>
                    <Text style={styles.statLab}>Từ chối</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: '#3B82F6', flex: 1.5 }]}>
                    <Text style={[styles.statVal, { color: '#059669' }]}>{formatCompact(stats.pending_amount)}</Text>
                    <Text style={styles.statLab}>Giá trị chờ</Text>
                </View>
            </View>
        );
    };

    const renderRoleTabs = () => {
        if (!data?.summary) return null;
        return (
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabList}>
                    {ROLE_TABS.map((tab) => {
                        const sum = data.summary.find(s => s.type === tab.key);
                        const count = sum?.total || 0;
                        const isActive = selectedRole === tab.key;
                        
                        return (
                            <TouchableOpacity 
                                key={tab.key}
                                style={[styles.roleTab, isActive && { backgroundColor: tab.bgColor, borderColor: tab.color }]}
                                onPress={() => setSelectedRole(tab.key)}
                            >
                                <Ionicons name={tab.icon as any} size={18} color={isActive ? tab.color : '#94A3B8'} />
                                <Text style={[styles.roleTabText, isActive && { color: tab.color, fontWeight: '700' }]}>{tab.label}</Text>
                                {count > 0 && (
                                    <View style={[styles.badge, { backgroundColor: tab.color }]}>
                                        <Text style={styles.badgeText}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderFilters = () => {
        return (
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity 
                            key={cat.value} 
                            style={[styles.catBtn, selectedCategory === cat.value && styles.catBtnActive]}
                            onPress={() => setSelectedCategory(cat.value)}
                        >
                            <Ionicons name={cat.icon as any} size={16} color={selectedCategory === cat.value ? '#FFF' : '#64748B'} />
                            <Text style={[styles.catText, selectedCategory === cat.value && styles.catTextActive]}>{cat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                
                <View style={styles.statusSegment}>
                    {STATUS_FILTERS.map(f => (
                        <TouchableOpacity 
                            key={f.value}
                            style={[styles.segmentBtn, statusFilter === f.value && styles.segmentBtnActive]}
                            onPress={() => setStatusFilter(f.value)}
                        >
                            <Text style={[styles.segmentText, statusFilter === f.value && styles.segmentTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderItem = ({ item }: { item: ApprovalItem }) => {
        const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.project_cost;
        const isProcessed = statusFilter === 'processed';

        return (
            <TouchableOpacity 
                style={styles.itemCard}
                onPress={() => { setDetailItem(item); setSelectedBudgetItemId(null); }}
                activeOpacity={0.8}
            >
                <View style={styles.itemMain}>
                    <View style={[styles.itemIconWrap, { backgroundColor: config.color + '15' }]}>
                        <Ionicons name={config.icon as any} size={22} color={config.color} />
                    </View>
                    <View style={styles.itemContent}>
                        <View style={styles.itemHeader}>
                            <View style={[styles.typeTag, { backgroundColor: config.color + '10' }]}>
                                <Text style={[styles.typeTagText, { color: config.color }]}>{config.label}</Text>
                            </View>
                            {item.amount > 0 && (
                                <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                            )}
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={styles.itemMeta}>
                            <View style={styles.metaCol}>
                                <Ionicons name="person-outline" size={12} color="#94A3B8" />
                                <Text style={styles.metaText}>{item.created_by}</Text>
                            </View>
                            <View style={styles.metaCol}>
                                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                            </View>
                            {item.attachments_count ? (
                                <View style={styles.metaCol}>
                                    <Ionicons name="attach-outline" size={12} color="#3B82F6" />
                                    <Text style={[styles.metaText, { color: '#3B82F6' }]}>{item.attachments_count}</Text>
                                </View>
                            ) : null}
                        </View>
                        
                        {isProcessed && (
                            <View style={[styles.statusBadge, { backgroundColor: item.status === 'rejected' ? '#FEF2F2' : '#F0FDF4' }]}>
                                <Ionicons 
                                    name={item.status === 'rejected' ? 'close-circle-outline' : 'checkmark-circle-outline'} 
                                    size={14} 
                                    color={item.status === 'rejected' ? '#EF4444' : '#10B981'} 
                                />
                                <Text style={[styles.statusBadgeText, { color: item.status === 'rejected' ? '#EF4444' : '#10B981' }]}>
                                    {item.status_label || item.status}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Trung tâm Duyệt" showBackButton />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Trung tâm Duyệt" showBackButton />
            
            {loading && !data && (
                <View style={styles.loadingFull}>
                    <ActivityIndicator size="large" color="#1B4F72" />
                    <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                </View>
            )}
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHead}>
                        <Text style={styles.sectionHeadText}>{title}</Text>
                    </View>
                )}
                ListHeaderComponent={() => (
                    <View>
                        {renderStats()}
                        {renderRoleTabs()}
                        {renderFilters()}
                        {sections.length === 0 && !loading && (
                            <View style={styles.emptyWrap}>
                                <MaterialCommunityIcons name="clipboard-check-outline" size={80} color="#E2E8F0" />
                                <Text style={styles.emptyHint}>Không có yêu cầu nào</Text>
                                <Text style={styles.emptySub}>Danh sách đang trống, hãy làm mới để kiểm tra lại.</Text>
                            </View>
                        )}
                    </View>
                )}
                stickySectionHeadersEnabled={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
            />

            {/* Detail Drawer Modal */}
            <Modal
                visible={!!detailItem}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailItem(null)}
            >
                <View style={styles.sheetOverlay}>
                    <TouchableWithoutFeedback onPress={() => setDetailItem(null)}>
                        <View style={styles.sheetCloser} />
                    </TouchableWithoutFeedback>
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHandle} />
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {detailItem && (
                                <View style={styles.detailBody}>
                                    <View style={styles.sheetHeader}>
                                        <View style={[styles.typeTag, { backgroundColor: (TYPE_CONFIG[detailItem.type]?.color || '#666') + '15' }]}>
                                            <Text style={[styles.typeTagText, { color: TYPE_CONFIG[detailItem.type]?.color || '#666' }]}>
                                                {TYPE_CONFIG[detailItem.type]?.label || 'Duyệt'}
                                            </Text>
                                        </View>
                                        <Text style={styles.sheetTitle}>{detailItem.title}</Text>
                                        <Text style={styles.sheetSubtitle}>{detailItem.subtitle}</Text>
                                    </View>

                                    <View style={styles.detailGrid}>
                                        <View style={styles.detailBox}>
                                            <Text style={styles.detailLabel}>Số tiền</Text>
                                            <Text style={styles.detailValueAmount}>{formatCurrency(detailItem.amount)}</Text>
                                        </View>
                                        <View style={styles.detailBox}>
                                            <Text style={styles.detailLabel}>Người tạo</Text>
                                            <Text style={styles.detailValue}>{detailItem.created_by}</Text>
                                        </View>
                                        <View style={styles.detailBox}>
                                            <Text style={styles.detailLabel}>Ngày tạo</Text>
                                            <Text style={styles.detailValue}>{formatDate(detailItem.created_at)}</Text>
                                        </View>
                                        <View style={styles.detailBox}>
                                            <Text style={styles.detailLabel}>Độ ưu tiên</Text>
                                            <Text style={[styles.detailValue, { color: detailItem.priority === 'urgent' ? '#EF4444' : '#64748B' }]}>
                                                {detailItem.priority === 'urgent' ? 'Khẩn cấp' : (detailItem.priority === 'high' ? 'Cao' : 'Thường')}
                                            </Text>
                                        </View>
                                    </View>

                                    {detailItem.description && (
                                        <View style={styles.descBox}>
                                            <Text style={styles.detailLabel}>Mô tả / Ghi chú</Text>
                                            <Text style={styles.descText}>{detailItem.description}</Text>
                                        </View>
                                    )}

                                    {detailItem.rejected_reason && (
                                        <View style={[styles.descBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                            <Text style={[styles.detailLabel, { color: '#EF4444' }]}>Lý do từ chối</Text>
                                            <Text style={[styles.descText, { color: '#B91C1C' }]}>{detailItem.rejected_reason}</Text>
                                        </View>
                                    )}

                                    {/* Attachments Section */}
                                    <View style={styles.attachSection}>
                                        <Text style={styles.detailLabel}>Tệp đính kèm ({detailItem.attachments_count || 0})</Text>
                                        {detailItem.attachments && detailItem.attachments.length > 0 ? (
                                            detailItem.attachments.map(file => (
                                                <TouchableOpacity 
                                                    key={file.id}
                                                    style={styles.fileRow}
                                                    onPress={() => WebBrowser.openBrowserAsync(file.url)}
                                                >
                                                    <View style={styles.fileIcon}>
                                                        <Ionicons 
                                                            name={file.name.match(/\.(jpg|jpeg|png)$/i) ? "image-outline" : "document-outline"} 
                                                            size={20} color="#3B82F6" 
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                                                        <Text style={styles.fileSize}>{file.size}</Text>
                                                    </View>
                                                    <Ionicons name="eye-outline" size={20} color="#94A3B8" />
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <View style={styles.noAttach}>
                                                <Ionicons name="attach-outline" size={20} color="#CBD5E1" />
                                                <Text style={styles.noAttachText}>Không có tệp đính kèm</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Budget Picker — Accountant only, financial items with project */}
                                    {selectedRole === 'accountant' 
                                        && ['project_cost', 'sub_payment', 'material_bill'].includes(detailItem.type)
                                        && detailItem.project_id
                                        && (data?.budget_items_by_project?.[detailItem.project_id]?.length ?? 0) > 0 && (
                                        <View style={styles.budgetSection}>
                                            <Text style={styles.detailLabel}>Hạng mục ngân sách *</Text>
                                            <Text style={styles.budgetHint}>Chọn hạng mục ngân sách cho khoản chi này</Text>
                                            <ScrollView style={styles.budgetList} nestedScrollEnabled>
                                                {data!.budget_items_by_project![detailItem.project_id!]!.map((bi: BudgetItemOption) => (
                                                    <TouchableOpacity
                                                        key={bi.id}
                                                        style={[
                                                            styles.budgetOption,
                                                            selectedBudgetItemId === bi.id && styles.budgetOptionActive
                                                        ]}
                                                        onPress={() => setSelectedBudgetItemId(bi.id)}
                                                    >
                                                        <View style={styles.budgetOptionHeader}>
                                                            <Ionicons 
                                                                name={selectedBudgetItemId === bi.id ? 'radio-button-on' : 'radio-button-off'}
                                                                size={20}
                                                                color={selectedBudgetItemId === bi.id ? '#10B981' : '#CBD5E1'}
                                                            />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.budgetOptionName}>{bi.name}</Text>
                                                                <Text style={styles.budgetOptionMeta}>
                                                                    {bi.budget_name}{bi.cost_group ? ` · ${bi.cost_group}` : ''}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.budgetAmountRow}>
                                                            <Text style={styles.budgetAmountLabel}>Còn lại:</Text>
                                                            <Text style={[
                                                                styles.budgetAmountValue,
                                                                { color: bi.remaining_amount > 0 ? '#059669' : '#EF4444' }
                                                            ]}>
                                                                {formatCurrency(bi.remaining_amount)}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        {detailItem && statusFilter === 'pending' && (
                            <View style={styles.sheetActions}>
                                <TouchableOpacity 
                                    style={styles.actionBtnReject}
                                    onPress={() => setRejectModalVisible(true)}
                                >
                                    <Text style={styles.actionBtnTextReject}>Từ chối</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.actionBtnApprove}
                                    onPress={() => handleApprove(detailItem)}
                                >
                                    {actionLoading === detailItem.id ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.actionBtnTextApprove}>Phê duyệt</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                        
                        <TouchableOpacity style={styles.closeSheet} onPress={() => setDetailItem(null)}>
                            <Text style={styles.closeSheetText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal
                visible={rejectModalVisible}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalBg}>
                    <View style={styles.modalWindow}>
                        <Text style={styles.modalTitle}>Lý do từ chối</Text>
                        <TextInput 
                            style={styles.modalInput}
                            placeholder="Nhập lý do tại đây..."
                            multiline
                            numberOfLines={4}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />
                        <View style={styles.modalButs}>
                            <TouchableOpacity style={styles.mBtnCan} onPress={() => setRejectModalVisible(false)}>
                                <Text style={styles.mBtnCanText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.mBtnSub, !rejectReason.trim() && { opacity: 0.5 }]} 
                                onPress={handleReject}
                                disabled={!rejectReason.trim() || actionLoading !== null}
                            >
                                <Text style={styles.mBtnSubText}>Xác nhận từ chối</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FBFCFE' },
    
    // Stats
    statsContainer: { flexDirection: 'row', padding: 16, gap: 12, flexWrap: 'wrap' },
    statBox: { 
        backgroundColor: '#FFF', 
        padding: 12, 
        borderRadius: 16, 
        borderLeftWidth: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        minWidth: '30%',
        flex: 1
    },
    statVal: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    statLab: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
    
    // Tabs
    tabContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    tabList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    roleTab: { 
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, 
        borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 6, backgroundColor: '#F8FAFC'
    },
    roleTabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    badge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { fontSize: 10, color: '#FFF', fontWeight: '800' },

    // Filters
    filterSection: { padding: 16, gap: 16 },
    catScroll: { gap: 10 },
    catBtn: { 
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, 
        borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' 
    },
    catBtnActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
    catText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    catTextActive: { color: '#FFF' },
    
    statusSegment: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
    segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    segmentBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    segmentText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    segmentTextActive: { color: '#1E293B' },

    // List
    sectionHead: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    sectionHeadText: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
    
    itemCard: { 
        backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 20, 
        borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1
    },
    itemMain: { flexDirection: 'row', padding: 16, gap: 16 },
    itemIconWrap: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    itemContent: { flex: 1 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
    typeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    typeTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    itemAmount: { fontSize: 15, fontWeight: '800', color: '#059669' },
    itemTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8, lineHeight: 20 },
    itemMeta: { flexDirection: 'row', gap: 12 },
    metaCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
    statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

    // Empty
    emptyWrap: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    emptyHint: { fontSize: 18, fontWeight: '800', color: '#475569', marginTop: 16 },
    emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 },

    // Sheet
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheetCloser: { flex: 1 },
    sheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, maxHeight: '90%' },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
    detailBody: { paddingHorizontal: 24 },
    sheetHeader: { marginBottom: 24 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 12, marginBottom: 4 },
    sheetSubtitle: { fontSize: 14, color: '#64748B' },
    
    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    detailBox: { width: '48%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    detailLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    detailValue: { fontSize: 13, fontWeight: '600', color: '#475569' },
    detailValueAmount: { fontSize: 16, fontWeight: '800', color: '#059669' },
    
    descBox: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, marginBottom: 24 },
    descText: { fontSize: 14, color: '#475569', lineHeight: 22 },
    
    attachSection: { marginBottom: 24 },
    fileRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, marginBottom: 8, gap: 12 },
    fileIcon: { width: 40, height: 40, backgroundColor: '#EFF6FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    fileName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    fileSize: { fontSize: 11, color: '#94A3B8' },
    noAttach: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
    noAttachText: { fontSize: 12, color: '#94A3B8' },
    
    sheetActions: { flexDirection: 'row', padding: 24, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    actionBtnReject: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#FEF2F2', alignItems: 'center' },
    actionBtnApprove: { flex: 2, paddingVertical: 16, borderRadius: 16, backgroundColor: '#10B981', alignItems: 'center' },
    actionBtnTextReject: { color: '#EF4444', fontWeight: '800', fontSize: 15 },
    actionBtnTextApprove: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    
    closeSheet: { alignSelf: 'center', padding: 12 },
    closeSheetText: { color: '#94A3B8', fontWeight: '700' },

    // Modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalWindow: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
    modalInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0', height: 120, textAlignVertical: 'top' },
    modalButs: { flexDirection: 'row', marginTop: 24, gap: 12 },
    mBtnCan: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    mBtnCanText: { color: '#94A3B8', fontWeight: '700' },
    mBtnSub: { flex: 2, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    mBtnSubText: { color: '#FFF', fontWeight: '800' },

    // Budget Picker
    budgetSection: { marginBottom: 24, backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#DCFCE7' },
    budgetHint: { fontSize: 12, color: '#64748B', marginBottom: 12 },
    budgetList: { maxHeight: 220 },
    budgetOption: { 
        backgroundColor: '#FFF', padding: 14, borderRadius: 14, marginBottom: 8, 
        borderWidth: 1.5, borderColor: '#E2E8F0' 
    },
    budgetOptionActive: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
    budgetOptionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
    budgetOptionName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    budgetOptionMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    budgetAmountRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 },
    budgetAmountLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    budgetAmountValue: { fontSize: 13, fontWeight: '800' },

    loadingFull: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(251, 252, 254, 0.95)',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
});
