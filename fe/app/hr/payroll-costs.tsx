import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { payrollApi, Payroll } from "@/api/payrollApi";
import { costApi, Cost } from "@/api/revenueApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { formatVNDWithoutSymbol } from "@/utils/format";
import { ScreenHeader } from "@/components";

export default function PayrollCostsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"payroll" | "costs">("payroll");

  // Payroll stats
  const [payrollStats, setPayrollStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    paid: 0,
    totalAmount: 0,
  });

  // Labor costs stats
  const [laborCostStats, setLaborCostStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalAmount: 0,
    byProject: [] as Array<{ project_id: number; project_name: string; total: number }>,
  });

  // Data
  const [recentPayrolls, setRecentPayrolls] = useState<Payroll[]>([]);
  const [recentLaborCosts, setRecentLaborCosts] = useState<Cost[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPayrollStats(),
        loadLaborCostStats(),
        loadProjects(),
      ]);
      if (activeTab === "payroll") {
        await loadRecentPayrolls();
      } else {
        await loadRecentLaborCosts();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPayrollStats = async () => {
    try {
      const [allRes, pendingRes, approvedRes, paidRes] = await Promise.all([
        payrollApi.getPayroll({ page: 1, per_page: 1 }),
        payrollApi.getPayroll({ status: "calculated", page: 1, per_page: 1 }),
        payrollApi.getPayroll({ status: "approved", page: 1, per_page: 1 }),
        payrollApi.getPayroll({ status: "paid", page: 1, per_page: 1 }),
      ]);

      const allPayrolls = await payrollApi.getPayroll({ page: 1 });
      const totalAmount = (allPayrolls.data?.data || []).reduce(
        (sum: number, p: Payroll) => sum + (p.net_salary || 0),
        0
      );

      setPayrollStats({
        total: allRes.data?.total || 0,
        pending: pendingRes.data?.total || 0,
        approved: approvedRes.data?.total || 0,
        paid: paidRes.data?.total || 0,
        totalAmount,
      });
    } catch (error) {
      console.error("Error loading payroll stats:", error);
    }
  };

  const loadLaborCostStats = async () => {
    try {
      // Load all projects
      const projectsRes = await projectApi.getProjects();
      const allProjects = projectsRes.data?.data || [];

      let totalCosts = 0;
      let pendingCosts = 0;
      let approvedCosts = 0;
      const costsByProject: { [key: number]: { name: string; total: number } } = {};

      // Load costs for each project
      for (const project of allProjects) {
        try {
          const costsRes = await costApi.getCosts(project.id, {
            category: "labor",
          });
          const projectCosts = costsRes.data?.data || [];
          const projectTotal = projectCosts.reduce(
            (sum: number, c: Cost) => sum + (c.amount || 0),
            0
          );

          if (projectTotal > 0) {
            costsByProject[project.id] = {
              name: project.name,
              total: projectTotal,
            };
            totalCosts += projectTotal;

            projectCosts.forEach((cost: Cost) => {
              if (cost.status === "pending_management_approval" || cost.status === "pending_accountant_approval") {
                pendingCosts += cost.amount || 0;
              } else if (cost.status === "approved") {
                approvedCosts += cost.amount || 0;
              }
            });
          }
        } catch (error) {
          console.error(`Error loading costs for project ${project.id}:`, error);
        }
      }

      setLaborCostStats({
        total: Object.keys(costsByProject).length,
        pending: pendingCosts,
        approved: approvedCosts,
        totalAmount: totalCosts,
        byProject: Object.entries(costsByProject).map(([id, data]) => ({
          project_id: parseInt(id),
          project_name: data.name,
          total: data.total,
        })),
      });
    } catch (error) {
      console.error("Error loading labor cost stats:", error);
    }
  };

  const loadRecentPayrolls = async () => {
    try {
      const response = await payrollApi.getPayroll({ page: 1 });
      if (response.success) {
        setRecentPayrolls((response.data.data || []).slice(0, 10));
      }
    } catch (error) {
      console.error("Error loading recent payrolls:", error);
    }
  };

  const loadRecentLaborCosts = async () => {
    try {
      const projectsRes = await projectApi.getProjects({ page: 1 });
      const allProjects = (projectsRes.data?.data || []).slice(0, 10);

      const allCosts: Cost[] = [];
      for (const project of allProjects) {
        try {
          const costsRes = await costApi.getCosts(project.id, {
            category: "labor",
          });
          const projectCosts = (costsRes.data?.data || []).slice(0, 5).map((cost: Cost) => ({
            ...cost,
            project_name: project.name,
          }));
          allCosts.push(...projectCosts);
        } catch (error) {
          console.error(`Error loading costs for project ${project.id}:`, error);
        }
      }

      // Sort by date descending
      allCosts.sort((a, b) => {
        const dateA = new Date(a.cost_date || a.created_at).getTime();
        const dateB = new Date(b.cost_date || b.created_at).getTime();
        return dateB - dateA;
      });

      setRecentLaborCosts(allCosts.slice(0, 20));
    } catch (error) {
      console.error("Error loading recent labor costs:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectApi.getProjects({ page: 1 });
      if (response.success) {
        setProjects(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "approved":
        return "#10B981";
      case "calculated":
      case "pending_management_approval":
      case "pending_accountant_approval":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "calculated":
        return "Đã tính";
      case "approved":
        return "Đã duyệt";
      case "paid":
        return "Đã thanh toán";
      case "pending_management_approval":
        return "Chờ duyệt";
      case "pending_accountant_approval":
        return "Chờ kế toán";
      case "rejected":
        return "Từ chối";
      default:
        return status;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "labor":
        return "Nhân công";
      default:
        return category;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tiền Lương & Chi Phí Nhân Công" />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "payroll" && styles.tabActive]}
          onPress={() => setActiveTab("payroll")}
        >
          <Ionicons
            name="cash-outline"
            size={20}
            color={activeTab === "payroll" ? "#3B82F6" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "payroll" && styles.tabTextActive,
            ]}
          >
            Tiền Lương
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "costs" && styles.tabActive]}
          onPress={() => setActiveTab("costs")}
        >
          <Ionicons
            name="calculator-outline"
            size={20}
            color={activeTab === "costs" ? "#3B82F6" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "costs" && styles.tabTextActive,
            ]}
          >
            Chi Phí Nhân Công
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "payroll" ? (
          <>
            {/* Payroll Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="cash" size={24} color="#3B82F6" />
                <Text style={styles.statValue}>
                  {formatVNDWithoutSymbol(payrollStats.totalAmount)}
                </Text>
                <Text style={styles.statLabel}>Tổng tiền lương</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color="#F59E0B" />
                <Text style={styles.statValue}>{payrollStats.pending}</Text>
                <Text style={styles.statLabel}>Chờ duyệt</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.statValue}>{payrollStats.approved}</Text>
                <Text style={styles.statLabel}>Đã duyệt</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-done" size={24} color="#22C55E" />
                <Text style={styles.statValue}>{payrollStats.paid}</Text>
                <Text style={styles.statLabel}>Đã thanh toán</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push("/hr/payroll")}
                >
                  <Ionicons name="list" size={32} color="#3B82F6" />
                  <Text style={styles.actionText}>Danh sách bảng lương</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push("/hr/employees")}
                >
                  <Ionicons name="people" size={32} color="#8B5CF6" />
                  <Text style={styles.actionText}>Quản lý nhân viên</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Payrolls */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bảng lương gần đây</Text>
                <TouchableOpacity onPress={() => router.push("/hr/payroll")}>
                  <Text style={styles.seeAllText}>Xem tất cả →</Text>
                </TouchableOpacity>
              </View>
              {recentPayrolls.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có bảng lương</Text>
                </View>
              ) : (
                <FlatList
                  data={recentPayrolls}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle}>
                            {item.user?.name || "N/A"}
                          </Text>
                          <Text style={styles.itemSubtitle}>
                            {item.period_start &&
                              new Date(item.period_start).toLocaleDateString(
                                "vi-VN"
                              )}{" "}
                            -{" "}
                            {item.period_end &&
                              new Date(item.period_end).toLocaleDateString(
                                "vi-VN"
                              )}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(item.status) + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(item.status) },
                            ]}
                          >
                            {getStatusText(item.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.itemFooter}>
                        <Text style={styles.itemAmount}>
                          {formatVNDWithoutSymbol(item.net_salary)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </>
        ) : (
          <>
            {/* Labor Cost Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="calculator" size={24} color="#8B5CF6" />
                <Text style={styles.statValue}>
                  {formatVNDWithoutSymbol(laborCostStats.totalAmount)}
                </Text>
                <Text style={styles.statLabel}>Tổng chi phí nhân công</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color="#F59E0B" />
                <Text style={styles.statValue}>
                  {formatVNDWithoutSymbol(laborCostStats.pending)}
                </Text>
                <Text style={styles.statLabel}>Chờ duyệt</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.statValue}>
                  {formatVNDWithoutSymbol(laborCostStats.approved)}
                </Text>
                <Text style={styles.statLabel}>Đã duyệt</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="folder" size={24} color="#6366F1" />
                <Text style={styles.statValue}>
                  {laborCostStats.byProject.length}
                </Text>
                <Text style={styles.statLabel}>Dự án có chi phí</Text>
              </View>
            </View>

            {/* Costs by Project */}
            {laborCostStats.byProject.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chi phí theo dự án</Text>
                {laborCostStats.byProject.map((project) => (
                  <TouchableOpacity
                    key={project.project_id}
                    style={styles.itemCard}
                    onPress={() =>
                      router.push(`/projects/${project.project_id}/costs`)
                    }
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>
                          {project.project_name}
                        </Text>
                      </View>
                      <Text style={styles.itemAmount}>
                        {formatVNDWithoutSymbol(project.total)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Labor Costs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chi phí nhân công gần đây</Text>
              {recentLaborCosts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Chưa có chi phí nhân công
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={recentLaborCosts}
                  scrollEnabled={false}
                  keyExtractor={(item, index) =>
                    `${item.id}-${index}` || index.toString()
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.itemCard}
                      onPress={() =>
                        router.push(`/projects/${item.project_id}/costs`)
                      }
                    >
                      <View style={styles.itemHeader}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle}>{item.name}</Text>
                          <Text style={styles.itemSubtitle}>
                            {(item as any).project_name || "N/A"} •{" "}
                            {item.cost_date &&
                              new Date(item.cost_date).toLocaleDateString(
                                "vi-VN"
                              )}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                getStatusColor(item.status) + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(item.status) },
                            ]}
                          >
                            {getStatusText(item.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.itemFooter}>
                        <Text style={styles.itemAmount}>
                          {formatVNDWithoutSymbol(item.amount)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </>
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#3B82F6",
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "47%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 8,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
    textAlign: "center",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
});

