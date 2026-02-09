import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { companyFinancialReportApi, CompanyFinancialSummary } from '@/api/companyFinancialReportApi';
import { ScreenHeader } from '@/components';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function FinancialDetailsScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<CompanyFinancialSummary | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await companyFinancialReportApi.getSummary();
            if (response.success) {
                setSummary(response.data);
            }
        } catch (error) {
            console.error('Error loading financial details:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!summary) {
        return (
            <View style={styles.centerContainer}>
                <Text>Không có dữ liệu</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Chi Tiết Số Liệu Tài Chính"
                showBackButton
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Revenue Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PHÂN TÍCH DOANH THU</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Tổng giá trị hợp đồng</Text>
                        <Text style={styles.value}>{formatCurrency(summary.revenue.total_contract_value)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Đã thu trong kỳ</Text>
                        <Text style={styles.value}>{formatCurrency(summary.revenue.paid_in_period)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Tổng cộng đã thu</Text>
                        <Text style={[styles.value, { color: '#10B981' }]}>{formatCurrency(summary.revenue.total_paid)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Công nợ còn lại</Text>
                        <Text style={[styles.value, { color: '#EF4444' }]}>{formatCurrency(summary.revenue.outstanding)}</Text>
                    </View>
                </View>

                {/* Project Costs Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CHI PHÍ DỰ ÁN THEO LOẠI</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Vật tư</Text>
                        <Text style={styles.value}>{formatCurrency(summary.project_costs.by_type.material)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Thiết bị</Text>
                        <Text style={styles.value}>{formatCurrency(summary.project_costs.by_type.equipment)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Nhân công/Thầu phụ</Text>
                        <Text style={styles.value}>{formatCurrency(summary.project_costs.by_type.subcontractor)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Khác</Text>
                        <Text style={styles.value}>{formatCurrency(summary.project_costs.by_type.other)}</Text>
                    </View>
                    <View style={[styles.detailRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Tổng chi phí dự án</Text>
                        <Text style={styles.totalValue}>{formatCurrency(summary.project_costs.total)}</Text>
                    </View>
                </View>

                {/* Company Costs Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CHI PHÍ VẬN HÀNH CÔNG TY</Text>
                    {summary.company_costs.by_cost_group.map((group, index) => (
                        <View key={group.cost_group_id || index} style={styles.detailRow}>
                            <Text style={styles.label}>{group.cost_group_name}</Text>
                            <Text style={styles.value}>{formatCurrency(group.total)}</Text>
                        </View>
                    ))}
                    <View style={[styles.detailRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Tổng chi phí vận hành</Text>
                        <Text style={styles.totalValue}>{formatCurrency(summary.company_costs.total)}</Text>
                    </View>
                </View>
            </ScrollView>
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
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    label: {
        fontSize: 14,
        color: '#6B7280',
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    totalRow: {
        marginTop: 8,
        borderBottomWidth: 0,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3B82F6',
    },
});
