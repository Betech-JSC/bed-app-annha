import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { companyCostApi, CompanyCost } from '@/api/companyCostApi';
import { ScreenHeader, PermissionGuard, PermissionDenied } from '@/components';
import { Permissions } from '@/constants/Permissions';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function CompanyCostsScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [costs, setCosts] = useState<CompanyCost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    useEffect(() => {
        loadCosts();
    }, [selectedStatus]);

    const loadCosts = async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            setPermissionMessage('');

            const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
            const response = await companyCostApi.getCompanyCosts(params);

            if (response.success) {
                setCosts(response.data.data || []);
            }
        } catch (error: any) {
            console.error('Error loading company costs:', error);
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || 'Bạn không có quyền xem chi phí công ty.');
            } else {
                Alert.alert('Lỗi', 'Không thể tải danh sách chi phí công ty');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCosts();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft':
                return '#6B7280';
            case 'pending_management_approval':
            case 'pending_accountant_approval':
                return '#F59E0B';
            case 'approved':
                return '#10B981';
            case 'rejected':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'draft':
                return 'Nháp';
            case 'pending_management_approval':
                return 'Chờ BĐH duyệt';
            case 'pending_accountant_approval':
                return 'Chờ KT xác nhận';
            case 'approved':
                return 'Đã duyệt';
            case 'rejected':
                return 'Từ chối';
            default:
                return status;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const renderCostItem = ({ item }: { item: CompanyCost }) => (
        <TouchableOpacity
            style={styles.costCard}
            onPress={() => router.push(`/company-costs/${item.id}` as any)}
        >
            <View style={styles.costHeader}>
                <View style={styles.costHeaderLeft}>
                    <Text style={styles.costName} numberOfLines={2}>
                        {item.name}
                    </Text>
                    {item.cost_group && (
                        <Text style={styles.costGroup}>{item.cost_group.name}</Text>
                    )}
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + '20' },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusText(item.status)}
                    </Text>
                </View>
            </View>

            <View style={styles.costDetails}>
                <View style={styles.costDetailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.costDetailText}>{formatDate(item.cost_date)}</Text>
                </View>
                <View style={styles.costDetailRow}>
                    <Ionicons name="cash-outline" size={16} color="#6B7280" />
                    <Text style={styles.costAmount}>{formatCurrency(item.amount)}</Text>
                </View>
            </View>

            {item.description && (
                <Text style={styles.costDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            )}
        </TouchableOpacity>
    );

    const statusFilters = [
        { key: 'all', label: 'Tất cả' },
        { key: 'draft', label: 'Nháp' },
        { key: 'pending_management_approval', label: 'Chờ duyệt' },
        { key: 'approved', label: 'Đã duyệt' },
        { key: 'rejected', label: 'Từ chối' },
    ];

    if (permissionDenied) {
        return <PermissionDenied message={permissionMessage} />;
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Chi Phí Công Ty"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.COST_CREATE}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => router.push('/company-costs/create' as any)}
                        >
                            <Ionicons name="add" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

            {/* Status Filters */}
            <View style={styles.filtersContainer}>
                <FlatList
                    horizontal
                    data={statusFilters}
                    keyExtractor={(item) => item.key}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                selectedStatus === item.key && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedStatus(item.key)}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    selectedStatus === item.key && styles.filterChipTextActive,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={costs}
                    renderItem={renderCostItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="wallet-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có chi phí công ty</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        padding: 4,
    },
    filtersContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#3B82F6',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    costCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    costHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    costHeaderLeft: {
        flex: 1,
        marginRight: 12,
    },
    costName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    costGroup: {
        fontSize: 12,
        color: '#6B7280',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    costDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    costDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    costDetailText: {
        fontSize: 14,
        color: '#6B7280',
    },
    costAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10B981',
    },
    costDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
});
