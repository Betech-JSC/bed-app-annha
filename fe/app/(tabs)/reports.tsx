import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { projectApi, Project } from "@/api/projectApi";
import { revenueApi } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

interface ProjectSummary {
    project: Project;
    revenue: number;
    costs: number;
    profit: number;
    profit_margin: number;
}

export default function ReportsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalCosts, setTotalCosts] = useState(0);
    const [totalProfit, setTotalProfit] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const loadedProjects = await loadProjects();
            if (loadedProjects && loadedProjects.length > 0) {
                await loadSummaries(loadedProjects);
            } else {
                setSummaries([]);
                setTotalRevenue(0);
                setTotalCosts(0);
                setTotalProfit(0);
            }
        } catch (error) {
            console.error("Error loading reports:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadProjects = async (): Promise<Project[]> => {
        try {
            const response = await projectApi.getProjects({ my_projects: true });
            if (response.success) {
                const projectsList = response.data?.data || response.data || [];
                setProjects(projectsList);
                return projectsList;
            }
            return [];
        } catch (error) {
            console.error("Error loading projects:", error);
            return [];
        }
    };

    const loadSummaries = async (projectsList: Project[]) => {
        try {
            const projectSummaries: ProjectSummary[] = [];
            let revenue = 0;
            let costs = 0;
            let profit = 0;

            for (const project of projectsList) {
                try {
                    const summaryResponse = await revenueApi.getProjectSummary(project.id);
                    if (summaryResponse.success && summaryResponse.data) {
                        const data = summaryResponse.data;
                        const projectRevenue = data.revenue.total_revenue || 0;
                        const projectCosts = data.costs.total_costs || 0;
                        const projectProfit = data.profit.amount || 0;
                        const projectMargin = data.profit.margin || 0;

                        projectSummaries.push({
                            project,
                            revenue: projectRevenue,
                            costs: projectCosts,
                            profit: projectProfit,
                            profit_margin: projectMargin,
                        });

                        revenue += projectRevenue;
                        costs += projectCosts;
                        profit += projectProfit;
                    }
                } catch (error) {
                    console.error(`Error loading summary for project ${project.id}:`, error);
                }
            }

            setSummaries(projectSummaries);
            setTotalRevenue(revenue);
            setTotalCosts(costs);
            setTotalProfit(profit);
        } catch (error) {
            console.error("Error loading summaries:", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    };

    const chartConfig = {
        backgroundColor: "#FFFFFF",
        backgroundGradientFrom: "#FFFFFF",
        backgroundGradientTo: "#FFFFFF",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#3B82F6",
        },
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Báo Cáo Tổng</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Prepare chart data
    const projectNames = summaries.slice(0, 5).map((s) => s.project.name);
    const projectRevenues = summaries.slice(0, 5).map((s) => s.revenue / 1000000); // Convert to millions
    const projectCosts = summaries.slice(0, 5).map((s) => s.costs / 1000000);
    const projectProfits = summaries.slice(0, 5).map((s) => s.profit / 1000000);

    const statusData = [
        {
            name: "Đang thi công",
            count: projects.filter((p) => p.status === "in_progress").length,
            color: "#3B82F6",
            legendFontColor: "#1F2937",
            legendFontSize: 12,
        },
        {
            name: "Hoàn thành",
            count: projects.filter((p) => p.status === "completed").length,
            color: "#10B981",
            legendFontColor: "#1F2937",
            legendFontSize: 12,
        },
        {
            name: "Lập kế hoạch",
            count: projects.filter((p) => p.status === "planning").length,
            color: "#F59E0B",
            legendFontColor: "#1F2937",
            legendFontSize: 12,
        },
        {
            name: "Đã hủy",
            count: projects.filter((p) => p.status === "cancelled").length,
            color: "#EF4444",
            legendFontColor: "#1F2937",
            legendFontSize: 12,
        },
    ].filter((item) => item.count > 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Báo Cáo Tổng</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Summary Cards */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="trending-up" size={24} color="#10B981" />
                        </View>
                        <Text style={styles.summaryLabel}>Tổng Doanh Thu</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="trending-down" size={24} color="#EF4444" />
                        </View>
                        <Text style={styles.summaryLabel}>Tổng Chi Phí</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(totalCosts)}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View
                            style={[
                                styles.summaryIconContainer,
                                { backgroundColor: totalProfit >= 0 ? "#D1FAE5" : "#FEE2E2" },
                            ]}
                        >
                            <Ionicons
                                name={totalProfit >= 0 ? "arrow-up" : "arrow-down"}
                                size={24}
                                color={totalProfit >= 0 ? "#10B981" : "#EF4444"}
                            />
                        </View>
                        <Text style={styles.summaryLabel}>Tổng Lợi Nhuận</Text>
                        <Text
                            style={[
                                styles.summaryValue,
                                { color: totalProfit >= 0 ? "#10B981" : "#EF4444" },
                            ]}
                        >
                            {formatCurrency(totalProfit)}
                        </Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="pie-chart" size={24} color="#3B82F6" />
                        </View>
                        <Text style={styles.summaryLabel}>Tỷ Suất Lợi Nhuận</Text>
                        <Text
                            style={[
                                styles.summaryValue,
                                { color: profitMargin >= 0 ? "#10B981" : "#EF4444" },
                            ]}
                        >
                            {profitMargin.toFixed(2)}%
                        </Text>
                    </View>
                </View>

                {/* Charts Section */}
                {summaries.length > 0 && (
                    <>
                        {/* Project Status Chart */}
                        {statusData.length > 0 && (
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionTitle}>Trạng Thái Dự Án</Text>
                                <PieChart
                                    data={statusData}
                                    width={screenWidth - 40}
                                    height={220}
                                    chartConfig={chartConfig}
                                    accessor="count"
                                    backgroundColor="transparent"
                                    paddingLeft="15"
                                    absolute
                                />
                            </View>
                        )}

                        {/* Top Projects Revenue */}
                        {projectNames.length > 0 && (
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionTitle}>Top 5 Dự Án - Doanh Thu</Text>
                                <BarChart
                                    data={{
                                        labels: projectNames,
                                        datasets: [
                                            {
                                                data: projectRevenues,
                                            },
                                        ],
                                    }}
                                    width={screenWidth - 40}
                                    height={220}
                                    chartConfig={chartConfig}
                                    verticalLabelRotation={30}
                                    fromZero
                                    yAxisLabel=""
                                    yAxisSuffix="M"
                                />
                            </View>
                        )}

                        {/* Revenue vs Costs */}
                        {projectNames.length > 0 && (
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionTitle}>Top 5 Dự Án - Doanh Thu vs Chi Phí</Text>
                                <LineChart
                                    data={{
                                        labels: projectNames,
                                        datasets: [
                                            {
                                                data: projectRevenues,
                                                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                                                strokeWidth: 2,
                                            },
                                            {
                                                data: projectCosts,
                                                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                                                strokeWidth: 2,
                                            },
                                        ],
                                    }}
                                    width={screenWidth - 40}
                                    height={220}
                                    chartConfig={chartConfig}
                                    bezier
                                    verticalLabelRotation={30}
                                    fromZero
                                    yAxisLabel=""
                                    yAxisSuffix="M"
                                />
                            </View>
                        )}
                    </>
                )}

                {/* Projects List */}
                <View style={styles.projectsSection}>
                    <Text style={styles.sectionTitle}>Chi Tiết Theo Dự Án</Text>
                    {summaries.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Chưa có dữ liệu báo cáo</Text>
                        </View>
                    ) : (
                        summaries.map((summary) => (
                            <TouchableOpacity
                                key={summary.project.id}
                                style={styles.projectCard}
                                onPress={() => router.push(`/projects/${summary.project.id}/revenue`)}
                            >
                                <View style={styles.projectHeader}>
                                    <Text style={styles.projectName}>{summary.project.name}</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                </View>
                                <View style={styles.projectStats}>
                                    <View style={styles.projectStatItem}>
                                        <Text style={styles.projectStatLabel}>Doanh thu</Text>
                                        <Text style={styles.projectStatValue}>
                                            {formatCurrency(summary.revenue)}
                                        </Text>
                                    </View>
                                    <View style={styles.projectStatItem}>
                                        <Text style={styles.projectStatLabel}>Chi phí</Text>
                                        <Text style={styles.projectStatValue}>
                                            {formatCurrency(summary.costs)}
                                        </Text>
                                    </View>
                                    <View style={styles.projectStatItem}>
                                        <Text style={styles.projectStatLabel}>Lợi nhuận</Text>
                                        <Text
                                            style={[
                                                styles.projectStatValue,
                                                {
                                                    color: summary.profit >= 0 ? "#10B981" : "#EF4444",
                                                },
                                            ]}
                                        >
                                            {formatCurrency(summary.profit)}
                                        </Text>
                                    </View>
                                    <View style={styles.projectStatItem}>
                                        <Text style={styles.projectStatLabel}>Tỷ suất</Text>
                                        <Text
                                            style={[
                                                styles.projectStatValue,
                                                {
                                                    color: summary.profit_margin >= 0 ? "#10B981" : "#EF4444",
                                                },
                                            ]}
                                        >
                                            {summary.profit_margin.toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        backgroundColor: "#FFFFFF",
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    summarySection: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: 16,
        gap: 12,
    },
    summaryCard: {
        width: "47%",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    chartSection: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    projectsSection: {
        padding: 16,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        color: "#9CA3AF",
        marginTop: 16,
    },
    projectCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    projectHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    projectName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
    },
    projectStats: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    projectStatItem: {
        width: "47%",
    },
    projectStatLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 4,
    },
    projectStatValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
});

