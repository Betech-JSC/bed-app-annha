import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { PieChart, BarChart } from "react-native-gifted-charts";

interface KpiStatsChartProps {
    total: number;
    pending: number;
    completed: number;
    verifiedSuccess: number;
    verifiedFail: number;
}

export const KpiStatsChart: React.FC<KpiStatsChartProps> = ({
    total,
    pending,
    completed,
    verifiedSuccess,
    verifiedFail,
}) => {
    const screenWidth = Dimensions.get("window").width;

    // Pie Chart Data
    const pieData = [
        {
            value: verifiedSuccess,
            color: "#10B981",
            text: `${verifiedSuccess}`,
            label: "Đạt",
        },
        {
            value: pending + completed,
            color: "#F59E0B",
            text: `${pending + completed}`,
            label: "Đang thực hiện",
        },
        {
            value: verifiedFail,
            color: "#EF4444",
            text: `${verifiedFail}`,
            label: "Không đạt",
        },
    ].filter(item => item.value > 0);

    // Bar Chart Data
    const barData = [
        {
            value: pending,
            label: "Đang\nthực hiện",
            frontColor: "#F59E0B",
            labelTextStyle: { fontSize: 10, color: "#6B7280" },
        },
        {
            value: completed,
            label: "Chờ\nduyệt",
            frontColor: "#3B82F6",
            labelTextStyle: { fontSize: 10, color: "#6B7280" },
        },
        {
            value: verifiedSuccess,
            label: "Đạt",
            frontColor: "#10B981",
            labelTextStyle: { fontSize: 10, color: "#6B7280" },
        },
        {
            value: verifiedFail,
            label: "Không\nđạt",
            frontColor: "#EF4444",
            labelTextStyle: { fontSize: 10, color: "#6B7280" },
        },
    ];

    const maxValue = Math.max(...barData.map(d => d.value), 1);

    if (total === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có dữ liệu thống kê</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Summary Stats */}
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>{total}</Text>
                    <Text style={styles.summaryLabel}>Tổng KPI</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#10B981" }]}>
                        {verifiedSuccess}
                    </Text>
                    <Text style={styles.summaryLabel}>Đạt</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#F59E0B" }]}>
                        {pending + completed}
                    </Text>
                    <Text style={styles.summaryLabel}>Đang thực hiện</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: "#EF4444" }]}>
                        {verifiedFail}
                    </Text>
                    <Text style={styles.summaryLabel}>Không đạt</Text>
                </View>
            </View>

            {/* Charts Container */}
            <View style={styles.chartsContainer}>
                {/* Pie Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Phân bổ trạng thái</Text>
                    <View style={styles.pieChartContainer}>
                        <PieChart
                            data={pieData}
                            donut
                            radius={70}
                            innerRadius={45}
                            centerLabelComponent={() => (
                                <View style={styles.centerLabel}>
                                    <Text style={styles.centerLabelNumber}>{total}</Text>
                                    <Text style={styles.centerLabelText}>KPI</Text>
                                </View>
                            )}
                            showText
                            textColor="#FFF"
                            textSize={12}
                            fontWeight="bold"
                        />
                        <View style={styles.legend}>
                            {pieData.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText}>
                                        {item.label}: {item.value}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Bar Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Chi tiết theo trạng thái</Text>
                    <View style={styles.barChartContainer}>
                        <BarChart
                            data={barData}
                            width={screenWidth - 80}
                            height={180}
                            barWidth={40}
                            spacing={20}
                            roundedTop
                            roundedBottom
                            hideRules
                            xAxisThickness={1}
                            yAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            yAxisColor="#E5E7EB"
                            yAxisTextStyle={{ color: "#6B7280", fontSize: 10 }}
                            noOfSections={4}
                            maxValue={maxValue + Math.ceil(maxValue * 0.2)}
                            showGradient
                            gradientColor="rgba(59, 130, 246, 0.1)"
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    emptyContainer: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 32,
        alignItems: "center",
        marginBottom: 16,
    },
    emptyText: {
        color: "#9CA3AF",
        fontSize: 14,
    },

    // Summary Stats
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryNumber: {
        fontSize: 24,
        fontWeight: "700",
        color: "#3B82F6",
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: "#E5E7EB",
    },

    // Charts
    chartsContainer: {
        gap: 24,
    },
    chartSection: {
        alignItems: "center",
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 16,
    },

    // Pie Chart
    pieChartContainer: {
        alignItems: "center",
        gap: 16,
    },
    centerLabel: {
        alignItems: "center",
    },
    centerLabelNumber: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    centerLabelText: {
        fontSize: 12,
        color: "#6B7280",
    },
    legend: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 12,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 13,
        color: "#374151",
    },

    // Bar Chart
    barChartContainer: {
        alignItems: "center",
        paddingVertical: 8,
    },
});
