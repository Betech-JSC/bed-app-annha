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
import { companyFinancialReportApi, CompanyFinancialSummary } from '@/api/companyFinancialReportApi';
import { ScreenHeader, PermissionGuard } from '@/components';
import { Permissions } from '@/constants/Permissions';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function CompanyFinancialDashboardScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<CompanyFinancialSummary | null>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');

    useEffect(() => {
        loadData();
    }, [selectedPeriod]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load summary
            const summaryResponse = await companyFinancialReportApi.getSummary();
            if (summaryResponse.success) {
                setSummary(summaryResponse.data);
            }

            // Load trends
            const trendsResponse = await companyFinancialReportApi.getTrend(6);
            if (trendsResponse.success) {
                setTrends(trendsResponse.data);
            }
        } catch (error) {
            console.error('Error loading financial data:', error);
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

    const formatCompact = (amount: number) => {
        if (amount >= 1000000000) {
            return `${(amount / 1000000000).toFixed(1)}B`;
        } else if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toString();
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

    // Prepare chart data
    const chartData = {
        labels: trends.map(t => t.month_name.split(' ')[0]),
        datasets: [
            {
                data: trends.map(t => t.net_profit),
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                strokeWidth: 2,
            },
        ],
    };

    const barChartData = {
        labels: ['Doanh thu', 'CP Dự án', 'CP Công ty'],
        datasets: [
            {
                data: [
                    summary.summary.total_revenue,
                    summary.summary.total_project_costs,
                    summary.summary.total_company_costs,
                ],
            },
        ],
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Báo Cáo Tài Chính"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        style={styles.detailButton}
                        onPress={() => router.push('/company-financial/details' as any)}
                    >
                        <Ionicons name="analytics-outline" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                    <View style={[styles.summaryCard, styles.revenueCard]}>
                        <Ionicons name="trending-up" size={24} color="#10B981" />
                        <Text style={styles.summaryLabel}>Doanh Thu</Text>
                        <Text style={styles.summaryValue}>
                            {formatCompact(summary.summary.total_revenue)}
                        </Text>
                        <Text style={styles.summarySubtext}>
                            {formatCurrency(summary.summary.total_revenue)}
                        </Text>
                    </View>

                    <View style={[styles.summaryCard, styles.profitCard]}>
                        <Ionicons name="cash-outline" size={24} color="#3B82F6" />
                        <Text style={styles.summaryLabel}>Lợi Nhuận Ròng</Text>
                        <Text style={styles.summaryValue}>
                            {formatCompact(summary.summary.net_profit)}
                        </Text>
                        <Text style={styles.summarySubtext}>
                            {summary.summary.net_margin.toFixed(1)}% margin
                        </Text>
                    </View>
                </View>

                <View style={styles.summaryGrid}>
                    <View style={[styles.summaryCard, styles.costCard]}>
                        <Ionicons name="construct-outline" size={24} color="#F59E0B" />
                        <Text style={styles.summaryLabel}>CP Dự Án</Text>
                        <Text style={styles.summaryValue}>
                            {formatCompact(summary.summary.total_project_costs)}
                        </Text>
                        <Text style={styles.summarySubtext}>
                            {formatCurrency(summary.summary.total_project_costs)}
                        </Text>
                    </View>

                    <View style={[styles.summaryCard, styles.companyCostCard]}>
                        <Ionicons name="business-outline" size={24} color="#EF4444" />
                        <Text style={styles.summaryLabel}>CP Công Ty</Text>
                        <Text style={styles.summaryValue}>
                            {formatCompact(summary.summary.total_company_costs)}
                        </Text>
                        <Text style={styles.summarySubtext}>
                            {formatCurrency(summary.summary.total_company_costs)}
                        </Text>
                    </View>
                </View>

                {/* Profit Breakdown */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Phân Tích Lợi Nhuận</Text>
                    <View style={styles.profitBreakdown}>
                        <View style={styles.profitRow}>
                            <Text style={styles.profitLabel}>Lợi nhuận gộp</Text>
                            <Text style={[styles.profitValue, { color: '#10B981' }]}>
                                {formatCurrency(summary.summary.gross_profit)}
                            </Text>
                        </View>
                        <View style={styles.profitRow}>
                            <Text style={styles.profitSubtext}>
                                {summary.summary.gross_margin.toFixed(1)}% gross margin
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.profitRow}>
                            <Text style={styles.profitLabel}>Chi phí vận hành</Text>
                            <Text style={[styles.profitValue, { color: '#EF4444' }]}>
                                -{formatCurrency(summary.summary.total_company_costs)}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.profitRow}>
                            <Text style={[styles.profitLabel, { fontWeight: '700' }]}>
                                Lợi nhuận ròng
                            </Text>
                            <Text style={[styles.profitValue, { fontWeight: '700', color: '#3B82F6' }]}>
                                {formatCurrency(summary.summary.net_profit)}
                            </Text>
                        </View>
                        <View style={styles.profitRow}>
                            <Text style={styles.profitSubtext}>
                                {summary.summary.net_margin.toFixed(1)}% net margin
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Trends Chart */}
                {trends.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Xu Hướng Lợi Nhuận (6 Tháng)</Text>
                        <LineChart
                            data={chartData}
                            width={screenWidth - 48}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#FFFFFF',
                                backgroundGradientFrom: '#FFFFFF',
                                backgroundGradientTo: '#FFFFFF',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                style: {
                                    borderRadius: 16,
                                },
                                propsForDots: {
                                    r: '4',
                                    strokeWidth: '2',
                                    stroke: '#10B981',
                                },
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                )}

                {/* Cost Breakdown Chart */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>So Sánh Chi Phí</Text>
                    <BarChart
                        data={barChartData}
                        width={screenWidth - 48}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={{
                            backgroundColor: '#FFFFFF',
                            backgroundGradientFrom: '#FFFFFF',
                            backgroundGradientTo: '#FFFFFF',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                            style: {
                                borderRadius: 16,
                            },
                        }}
                        style={styles.chart}
                    />
                </View>

                {/* Quick Actions */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Báo Cáo Chi Tiết</Text>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push('/company-financial/profit-loss' as any)}
                    >
                        <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
                        <Text style={styles.actionButtonText}>Báo Cáo P&L</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push('/company-costs' as any)}
                    >
                        <Ionicons name="wallet-outline" size={20} color="#3B82F6" />
                        <Text style={styles.actionButtonText}>Chi Phí Công Ty</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
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
    detailButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    revenueCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    profitCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    costCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    companyCostCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 8,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
    },
    summarySubtext: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    card: {
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
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    profitBreakdown: {
        gap: 8,
    },
    profitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profitLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    profitValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    profitSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 8,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        marginBottom: 8,
    },
    actionButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
});
