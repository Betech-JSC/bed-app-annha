import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { budgetApi } from "@/api/budgetApi";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const screenWidth = Dimensions.get("window").width;

interface ComparisonData {
    budget: any;
    items: Array<{
        id: number;
        name: string;
        estimated_amount: number;
        actual_amount: number;
        variance: number;
        variance_percentage: number;
        is_over_budget: boolean;
    }>;
    summary: {
        total_budget: number;
        total_actual: number;
        total_variance: number;
        variance_percentage: number;
        is_over_budget: boolean;
        budget_utilization: number;
    };
    category_comparison?: Array<{
        category: string;
        budget: number;
        actual: number;
        variance: number;
        variance_percentage: number;
        is_over_budget: boolean;
    }>;
}

export default function BudgetCompareScreen() {
    const router = useRouter();
    const { id, budgetId } = useLocalSearchParams<{ id: string; budgetId: string }>();
    const tabBarHeight = useTabBarHeight();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
    const [activeChart, setActiveChart] = useState<"items" | "category" | "time">("items");

    useEffect(() => {
        loadComparison();
    }, [id, budgetId]);

    const loadComparison = async () => {
        try {
            setLoading(true);
            const response = await budgetApi.compareWithActual(Number(id), Number(budgetId));
            if (response.success) {
                setComparisonData(response.data);
            }
        } catch (error) {
            console.error("Error loading comparison:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadComparison();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const handleExport = async () => {
        if (!comparisonData) return;
        
        try {
            // Generate comparison report
            let report = `BÁO CÁO SO SÁNH NGÂN SÁCH\n`;
            report += `================================\n\n`;
            report += `Tên ngân sách: ${comparisonData.budget.name}\n`;
            if (comparisonData.budget.version) report += `Phiên bản: v${comparisonData.budget.version}\n`;
            report += `Ngày lập: ${new Date(comparisonData.budget.budget_date).toLocaleDateString("vi-VN")}\n`;
            report += `\n================================\n`;
            report += `TỔNG QUAN\n`;
            report += `================================\n\n`;
            report += `Tổng ngân sách: ${formatCurrency(comparisonData.summary.total_budget)}\n`;
            report += `Chi phí thực tế: ${formatCurrency(comparisonData.summary.total_actual)}\n`;
            report += `Chênh lệch: ${formatCurrency(Math.abs(comparisonData.summary.total_variance))} `;
            report += `${comparisonData.summary.total_variance > 0 ? "(Vượt)" : "(Tiết kiệm)"}\n`;
            report += `Tỷ lệ chênh lệch: ${Math.abs(comparisonData.summary.variance_percentage).toFixed(2)}%\n`;
            report += `Tỷ lệ sử dụng: ${comparisonData.summary.budget_utilization.toFixed(1)}%\n`;
            report += `\n================================\n`;
            report += `CHI TIẾT THEO HẠNG MỤC\n`;
            report += `================================\n\n`;
            
            if (comparisonData.items && comparisonData.items.length > 0) {
                comparisonData.items.forEach((item, index) => {
                    report += `${index + 1}. ${item.name}\n`;
                    report += `   Ngân sách: ${formatCurrency(item.estimated_amount)}\n`;
                    report += `   Thực tế: ${formatCurrency(item.actual_amount)}\n`;
                    report += `   Chênh lệch: ${formatCurrency(Math.abs(item.variance))} `;
                    report += `${item.variance > 0 ? "(Vượt)" : "(Tiết kiệm)"}\n`;
                    report += `   Tỷ lệ: ${item.variance_percentage > 0 ? "+" : ""}${item.variance_percentage.toFixed(2)}%\n`;
                    if (item.is_over_budget) report += `   ⚠️ Vượt ngân sách\n`;
                    report += `\n`;
                });
            }
            
            if (comparisonData.category_comparison && comparisonData.category_comparison.length > 0) {
                report += `\n================================\n`;
                report += `SO SÁNH THEO DANH MỤC\n`;
                report += `================================\n\n`;
                comparisonData.category_comparison.forEach((cat, index) => {
                    report += `${index + 1}. ${cat.category}\n`;
                    report += `   Ngân sách: ${formatCurrency(cat.budget)}\n`;
                    report += `   Thực tế: ${formatCurrency(cat.actual)}\n`;
                    report += `   Chênh lệch: ${formatCurrency(Math.abs(cat.variance))} `;
                    report += `${cat.variance > 0 ? "(Vượt)" : "(Tiết kiệm)"}\n`;
                    report += `   Tỷ lệ: ${cat.variance_percentage > 0 ? "+" : ""}${cat.variance_percentage.toFixed(2)}%\n`;
                    if (cat.is_over_budget) report += `   ⚠️ Vượt ngân sách\n`;
                    report += `\n`;
                });
            }
            
            report += `\n================================\n`;
            report += `Ngày xuất báo cáo: ${new Date().toLocaleDateString("vi-VN")} ${new Date().toLocaleTimeString("vi-VN")}\n`;
            
            // Save to file
            const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
            const fileName = `budget_comparison_${comparisonData.budget.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.txt`;
            const fileUri = `${directory}${fileName}`;
            
            await FileSystem.writeAsStringAsync(fileUri, report, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            
            // Share file
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: "text/plain",
                    dialogTitle: "Xuất báo cáo so sánh ngân sách",
                });
            } else {
                Alert.alert("Thành công", `Báo cáo đã được lưu tại: ${fileUri}`);
            }
        } catch (error: any) {
            if (error.code !== "ERR_CANCELLED" && error.message !== "User did not share") {
                console.error("Error exporting comparison:", error);
                Alert.alert("Lỗi", "Không thể xuất báo cáo");
            }
        }
    };

    // Prepare chart data
    const itemsChartData = useMemo(() => {
        if (!comparisonData?.items) return null;
        
        const sortedItems = [...comparisonData.items]
            .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
            .slice(0, 10); // Top 10 items by variance
        
        return {
            labels: sortedItems.map(item => 
                item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name
            ),
            datasets: [
                {
                    data: sortedItems.map(item => item.estimated_amount),
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                },
                {
                    data: sortedItems.map(item => item.actual_amount),
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                },
            ],
        };
    }, [comparisonData]);

    const categoryChartData = useMemo(() => {
        if (!comparisonData?.category_comparison || comparisonData.category_comparison.length === 0) {
            return null;
        }
        
        return {
            labels: comparisonData.category_comparison.map(cat => cat.category),
            datasets: [
                {
                    data: comparisonData.category_comparison.map(cat => cat.budget),
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                },
                {
                    data: comparisonData.category_comparison.map(cat => cat.actual),
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                },
            ],
        };
    }, [comparisonData]);

    const pieChartData = useMemo(() => {
        if (!comparisonData?.items) return null;
        
        const total = comparisonData.items.reduce((sum, item) => sum + item.estimated_amount, 0);
        return comparisonData.items
            .filter(item => item.estimated_amount > 0)
            .slice(0, 8) // Top 8 items
            .map((item, index) => {
                const percentage = (item.estimated_amount / total) * 100;
                const colors = [
                    "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
                    "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
                ];
                return {
                    name: item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name,
                    amount: item.estimated_amount,
                    color: colors[index % colors.length],
                    legendFontColor: "#1F2937",
                    legendFontSize: 12,
                };
            });
    }, [comparisonData]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="So Sánh Ngân Sách" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (!comparisonData) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="So Sánh Ngân Sách" showBackButton />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Không có dữ liệu so sánh</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader 
                title="So Sánh Ngân Sách" 
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={handleExport}
                    >
                        <Ionicons name="download-outline" size={20} color="#10B981" />
                    </TouchableOpacity>
                }
            />
            
            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: tabBarHeight }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Summary Card */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="analytics-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Tổng quan so sánh</Text>
                    </View>
                    
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Ngân sách</Text>
                            <Text style={styles.summaryValue}>
                                {formatCurrency(comparisonData.summary.total_budget)}
                            </Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Chi phí thực tế</Text>
                            <Text style={[
                                styles.summaryValue,
                                { color: comparisonData.summary.is_over_budget ? "#EF4444" : "#10B981" }
                            ]}>
                                {formatCurrency(comparisonData.summary.total_actual)}
                            </Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Chênh lệch</Text>
                            <Text style={[
                                styles.summaryValue,
                                { color: comparisonData.summary.total_variance > 0 ? "#EF4444" : "#10B981" }
                            ]}>
                                {formatCurrency(Math.abs(comparisonData.summary.total_variance))}
                            </Text>
                            <Text style={[
                                styles.summarySubtext,
                                { color: comparisonData.summary.total_variance > 0 ? "#EF4444" : "#10B981" }
                            ]}>
                                {comparisonData.summary.total_variance > 0 ? "Vượt" : "Tiết kiệm"} {Math.abs(comparisonData.summary.variance_percentage).toFixed(1)}%
                            </Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Tỷ lệ sử dụng</Text>
                            <Text style={[
                                styles.summaryValue,
                                { 
                                    color: comparisonData.summary.budget_utilization > 100 
                                        ? "#EF4444" 
                                        : comparisonData.summary.budget_utilization > 80 
                                            ? "#F59E0B" 
                                            : "#10B981" 
                                }
                            ]}>
                                {comparisonData.summary.budget_utilization.toFixed(1)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Chart Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="bar-chart-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Biểu đồ so sánh</Text>
                    </View>
                    
                    <View style={styles.chartTabs}>
                        <TouchableOpacity
                            style={[styles.chartTab, activeChart === "items" && styles.chartTabActive]}
                            onPress={() => setActiveChart("items")}
                        >
                            <Text style={[styles.chartTabText, activeChart === "items" && styles.chartTabTextActive]}>
                                Theo hạng mục
                            </Text>
                        </TouchableOpacity>
                        {categoryChartData && (
                            <TouchableOpacity
                                style={[styles.chartTab, activeChart === "category" && styles.chartTabActive]}
                                onPress={() => setActiveChart("category")}
                            >
                                <Text style={[styles.chartTabText, activeChart === "category" && styles.chartTabTextActive]}>
                                    Theo danh mục
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Bar Chart - Items */}
                    {activeChart === "items" && itemsChartData && (
                        <View style={styles.chartContainer}>
                            <Text style={styles.chartTitle}>Ngân sách vs Chi phí thực tế (Top 10)</Text>
                            <BarChart
                                data={itemsChartData}
                                width={screenWidth - 64}
                                height={280}
                                chartConfig={{
                                    backgroundColor: "#FFFFFF",
                                    backgroundGradientFrom: "#FFFFFF",
                                    backgroundGradientTo: "#FFFFFF",
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                    barPercentage: 0.6,
                                }}
                                style={styles.chart}
                                showValuesOnTopOfBars={false}
                                withInnerLines={true}
                                yAxisLabel=""
                                yAxisSuffix=""
                            />
                            <View style={styles.chartLegend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: "#3B82F6" }]} />
                                    <Text style={styles.legendText}>Ngân sách</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: "#EF4444" }]} />
                                    <Text style={styles.legendText}>Chi phí thực tế</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Bar Chart - Category */}
                    {activeChart === "category" && categoryChartData && (
                        <View style={styles.chartContainer}>
                            <Text style={styles.chartTitle}>So sánh theo danh mục</Text>
                            <BarChart
                                data={categoryChartData}
                                width={screenWidth - 64}
                                height={280}
                                chartConfig={{
                                    backgroundColor: "#FFFFFF",
                                    backgroundGradientFrom: "#FFFFFF",
                                    backgroundGradientTo: "#FFFFFF",
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                    barPercentage: 0.6,
                                }}
                                style={styles.chart}
                                showValuesOnTopOfBars={false}
                                withInnerLines={true}
                                yAxisLabel=""
                                yAxisSuffix=""
                            />
                            <View style={styles.chartLegend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: "#3B82F6" }]} />
                                    <Text style={styles.legendText}>Ngân sách</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: "#EF4444" }]} />
                                    <Text style={styles.legendText}>Chi phí thực tế</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Pie Chart - Budget Distribution */}
                    {pieChartData && pieChartData.length > 0 && (
                        <View style={styles.chartContainer}>
                            <Text style={styles.chartTitle}>Phân bổ ngân sách</Text>
                            <PieChart
                                data={pieChartData}
                                width={screenWidth - 64}
                                height={220}
                                chartConfig={{
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                accessor="amount"
                                backgroundColor="transparent"
                                paddingLeft="15"
                                style={styles.chart}
                                absolute
                            />
                        </View>
                    )}
                </View>

                {/* Items Comparison Table */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="list-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Chi tiết theo hạng mục</Text>
                    </View>
                    
                    {comparisonData.items && comparisonData.items.length > 0 ? (
                        comparisonData.items.map((item, index) => {
                            const isOverBudget = item.is_over_budget;
                            return (
                                <View 
                                    key={item.id || index} 
                                    style={[
                                        styles.itemRow,
                                        isOverBudget && styles.itemRowOverBudget
                                    ]}
                                >
                                    <View style={styles.itemRowLeft}>
                                        <Text style={styles.itemRowName}>{item.name}</Text>
                                        {isOverBudget && (
                                            <View style={styles.overBudgetIndicator}>
                                                <Ionicons name="warning" size={12} color="#EF4444" />
                                                <Text style={styles.overBudgetIndicatorText}>Vượt</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.itemRowRight}>
                                        <View style={styles.itemRowValue}>
                                            <Text style={styles.itemRowLabel}>Ngân sách:</Text>
                                            <Text style={styles.itemRowAmount}>
                                                {formatCurrency(item.estimated_amount)}
                                            </Text>
                                        </View>
                                        <View style={styles.itemRowValue}>
                                            <Text style={styles.itemRowLabel}>Thực tế:</Text>
                                            <Text style={[
                                                styles.itemRowAmount,
                                                { color: isOverBudget ? "#EF4444" : "#10B981" }
                                            ]}>
                                                {formatCurrency(item.actual_amount)}
                                            </Text>
                                        </View>
                                        <View style={styles.itemRowValue}>
                                            <Text style={styles.itemRowLabel}>Chênh lệch:</Text>
                                            <Text style={[
                                                styles.itemRowAmount,
                                                { color: item.variance > 0 ? "#EF4444" : "#10B981" }
                                            ]}>
                                                {formatCurrency(Math.abs(item.variance))}
                                                {item.variance > 0 ? " (Vượt)" : " (Tiết kiệm)"}
                                            </Text>
                                        </View>
                                        <View style={styles.itemRowValue}>
                                            <Text style={styles.itemRowLabel}>Tỷ lệ:</Text>
                                            <Text style={[
                                                styles.itemRowAmount,
                                                { color: item.variance_percentage > 0 ? "#EF4444" : "#10B981" }
                                            ]}>
                                                {item.variance_percentage > 0 ? "+" : ""}{item.variance_percentage.toFixed(1)}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyText}>Chưa có dữ liệu hạng mục</Text>
                    )}
                </View>

                {/* Alerts */}
                {comparisonData.summary.is_over_budget && (
                    <View style={[styles.section, styles.alertSection]}>
                        <View style={styles.alertHeader}>
                            <Ionicons name="warning" size={24} color="#EF4444" />
                            <Text style={styles.alertTitle}>Cảnh báo vượt ngân sách</Text>
                        </View>
                        <Text style={styles.alertText}>
                            Dự án đã vượt ngân sách {Math.abs(comparisonData.summary.variance_percentage).toFixed(1)}% 
                            ({formatCurrency(Math.abs(comparisonData.summary.total_variance))})
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: "#FFFFFF",
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    summaryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    summaryLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 6,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    summarySubtext: {
        fontSize: 11,
        fontWeight: "600",
        marginTop: 4,
    },
    chartTabs: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    chartTab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    chartTabActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    chartTabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    chartTabTextActive: {
        color: "#FFFFFF",
    },
    chartContainer: {
        marginBottom: 24,
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
        textAlign: "center",
    },
    chart: {
        borderRadius: 12,
    },
    chartLegend: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        marginTop: 12,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
    },
    itemRow: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    itemRowOverBudget: {
        borderColor: "#EF4444",
        borderWidth: 2,
        backgroundColor: "#FEF2F2",
    },
    itemRowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    itemRowName: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    overBudgetIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: "#FEE2E2",
    },
    overBudgetIndicatorText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#EF4444",
    },
    itemRowRight: {
        gap: 6,
    },
    itemRowValue: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemRowLabel: {
        fontSize: 12,
        color: "#6B7280",
    },
    itemRowAmount: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1F2937",
    },
    alertSection: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FCA5A5",
    },
    alertHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#EF4444",
    },
    alertText: {
        fontSize: 14,
        color: "#991B1B",
        lineHeight: 20,
    },
    emptyText: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        padding: 20,
    },
    exportButton: {
        padding: 4,
    },
});
