import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { companyFinancialReportApi, ProfitLossStatement } from '@/api/companyFinancialReportApi';
import { ScreenHeader } from '@/components';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function ProfitLossReportScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [report, setReport] = useState<ProfitLossStatement | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await companyFinancialReportApi.getProfitLoss();
            if (response.success) {
                setReport(response.data);
            }
        } catch (error) {
            console.error('Error loading P&L data:', error);
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

    if (!report) {
        return (
            <View style={styles.centerContainer}>
                <Text>Không có dữ liệu</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Báo Cáo P&L"
                showBackButton
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Period Info */}
                <View style={styles.periodCard}>
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                    <Text style={styles.periodText}>
                        Giai đoạn: {new Date(report.period.start_date).toLocaleDateString('vi-VN')} - {new Date(report.period.end_date).toLocaleDateString('vi-VN')}
                    </Text>
                </View>

                {/* Income Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>DOANH THU</Text>
                        <Text style={styles.sectionTotal}>{formatCurrency(report.income.total_income)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Doanh thu từ hợp đồng</Text>
                        <Text style={styles.value}>{formatCurrency(report.income.revenue)}</Text>
                    </View>
                </View>

                {/* COGS Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>GÍA VỐN HÀNG BÁN (COGS)</Text>
                        <Text style={[styles.sectionTotal, { color: '#EF4444' }]}>
                            ({formatCurrency(report.cost_of_goods_sold.total_cogs)})
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Chi phí thi công dự án</Text>
                        <Text style={styles.value}>{formatCurrency(report.cost_of_goods_sold.project_costs)}</Text>
                    </View>
                </View>

                {/* Gross Profit */}
                <View style={[styles.section, styles.highlightSection]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, styles.highlightTitle]}>LỢI NHUẬN GỘP</Text>
                        <Text style={[styles.sectionTotal, styles.highlightValue]}>
                            {formatCurrency(report.gross_profit)}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Gross Margin</Text>
                        <Text style={styles.value}>{report.margins.gross_margin.toFixed(2)}%</Text>
                    </View>
                </View>

                {/* Operating Expenses */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>CHI PHÍ VẬN HÀNH</Text>
                        <Text style={[styles.sectionTotal, { color: '#EF4444' }]}>
                            ({formatCurrency(report.operating_expenses.total_operating_expenses)})
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Chi phí quản lý công ty</Text>
                        <Text style={styles.value}>{formatCurrency(report.operating_expenses.company_costs)}</Text>
                    </View>
                </View>

                {/* Net Profit */}
                <View style={[styles.section, styles.finalSection]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, styles.finalTitle]}>LỢI NHUẬN RÒNG (EBIT)</Text>
                        <Text style={[styles.sectionTotal, styles.finalValue]}>
                            {formatCurrency(report.net_profit)}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Net Margin</Text>
                        <Text style={styles.value}>{report.margins.net_margin.toFixed(2)}%</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>* Báo cáo được tổng hợp tự động từ các số liệu thanh toán và chi phí thực tế.</Text>
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
    periodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    periodText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6B7280',
    },
    sectionTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    label: {
        fontSize: 14,
        color: '#4B5563',
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    highlightSection: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
        borderWidth: 1,
    },
    highlightTitle: {
        color: '#047857',
    },
    highlightValue: {
        color: '#10B981',
    },
    finalSection: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
        borderWidth: 1,
        marginTop: 8,
    },
    finalTitle: {
        color: '#1E40AF',
        fontSize: 15,
    },
    finalValue: {
        color: '#3B82F6',
        fontSize: 20,
    },
    footer: {
        marginTop: 16,
        paddingHorizontal: 8,
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
