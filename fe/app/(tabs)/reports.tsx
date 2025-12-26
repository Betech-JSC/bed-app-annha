import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { projectApi, Project } from "@/api/projectApi";
import { revenueApi } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    const [companyCapital, setCompanyCapital] = useState<number>(0);
    const [showCapitalModal, setShowCapitalModal] = useState(false);
    const [capitalInput, setCapitalInput] = useState("");

    useEffect(() => {
        loadData();
        loadCompanyCapital();
    }, []);

    const loadCompanyCapital = async () => {
        try {
            const saved = await AsyncStorage.getItem("company_capital");
            if (saved) {
                setCompanyCapital(parseFloat(saved) || 0);
            }
        } catch (error) {
            console.error("Error loading company capital:", error);
        }
    };

    const saveCompanyCapital = async (value: number) => {
        try {
            await AsyncStorage.setItem("company_capital", value.toString());
            setCompanyCapital(value);
            setShowCapitalModal(false);
            setCapitalInput("");
            Alert.alert("Thành công", "Đã cập nhật vốn công ty");
        } catch (error) {
            console.error("Error saving company capital:", error);
            Alert.alert("Lỗi", "Không thể lưu vốn công ty");
        }
    };

    const handleUpdateCapital = () => {
        const value = parseFloat(capitalInput.replace(/[^0-9.]/g, ""));
        if (isNaN(value) || value < 0) {
            Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
            return;
        }
        saveCompanyCapital(value);
    };

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
    const averageProfitPerProject = summaries.length > 0 ? totalProfit / summaries.length : 0;

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
                    {/* Vốn Công Ty */}
                    <TouchableOpacity
                        style={styles.summaryCard}
                        onPress={() => {
                            setCapitalInput(companyCapital.toString());
                            setShowCapitalModal(true);
                        }}
                    >
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="wallet" size={24} color="#8B5CF6" />
                        </View>
                        <View style={styles.summaryCardHeader}>
                            <Text style={styles.summaryLabel}>Vốn Công Ty</Text>
                            <Ionicons name="create-outline" size={16} color="#6B7280" />
                        </View>
                        <Text style={styles.summaryValue}>{formatCurrency(companyCapital)}</Text>
                        <Text style={styles.summaryHint}>Nhấn để cập nhật</Text>
                    </TouchableOpacity>

                    {/* Tổng Lợi Nhuận */}
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

                    {/* Trung Bình Lợi Nhuận / Công Trình */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="analytics" size={24} color="#3B82F6" />
                        </View>
                        <Text style={styles.summaryLabel}>Trung Bình Lợi Nhuận / Công Trình</Text>
                        <Text
                            style={[
                                styles.summaryValue,
                                { color: averageProfitPerProject >= 0 ? "#10B981" : "#EF4444" },
                            ]}
                        >
                            {formatCurrency(averageProfitPerProject)}
                        </Text>
                        <Text style={styles.summarySubtext}>
                            {summaries.length} công trình
                        </Text>
                    </View>

                    {/* Tổng Doanh Thu */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="trending-up" size={24} color="#10B981" />
                        </View>
                        <Text style={styles.summaryLabel}>Tổng Doanh Thu</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
                    </View>

                    {/* Tổng Chi Phí */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="trending-down" size={24} color="#EF4444" />
                        </View>
                        <Text style={styles.summaryLabel}>Tổng Chi Phí</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(totalCosts)}</Text>
                    </View>

                    {/* Tỷ Suất Lợi Nhuận */}
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

            {/* Company Capital Modal */}
            <Modal
                visible={showCapitalModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCapitalModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cập Nhật Vốn Công Ty</Text>
                            <TouchableOpacity onPress={() => setShowCapitalModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.modalLabel}>Vốn công ty (VNĐ)</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Nhập số tiền vốn công ty"
                                value={capitalInput}
                                onChangeText={(text) => {
                                    // Chỉ cho phép số và dấu chấm
                                    const cleaned = text.replace(/[^0-9.]/g, "");
                                    setCapitalInput(cleaned);
                                }}
                                keyboardType="numeric"
                                autoFocus={true}
                            />
                            <Text style={styles.modalHint}>
                                Vốn ban đầu của doanh nghiệp để so sánh với dòng tiền & lợi nhuận
                            </Text>
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowCapitalModal(false);
                                    setCapitalInput("");
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleUpdateCapital}
                            >
                                <Text style={styles.saveButtonText}>Lưu</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    summaryCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    summaryHint: {
        fontSize: 10,
        color: "#9CA3AF",
        marginTop: 4,
        fontStyle: "italic",
    },
    summarySubtext: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        width: "90%",
        maxWidth: 400,
        padding: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalBody: {
        padding: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#1F2937",
        backgroundColor: "#FFFFFF",
    },
    modalHint: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 8,
        lineHeight: 18,
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#F3F4F6",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    saveButton: {
        backgroundColor: "#3B82F6",
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
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

