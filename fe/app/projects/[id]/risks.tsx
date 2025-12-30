import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { projectRiskApi, ProjectRisk, CreateProjectRiskData } from "@/api/projectRiskApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function ProjectRisksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<ProjectRisk | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await projectRiskApi.getRisks(id!, { active_only: true });
      if (response.success) {
        setRisks(response.data);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách rủi ro");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case "critical":
        return "#DC2626";
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "closed":
        return "#10B981";
      case "mitigated":
        return "#3B82F6";
      case "monitored":
        return "#F59E0B";
      case "analyzed":
        return "#8B5CF6";
      case "identified":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "schedule":
        return "time-outline";
      case "cost":
        return "cash-outline";
      case "quality":
        return "checkmark-circle-outline";
      case "scope":
        return "document-text-outline";
      case "resource":
        return "people-outline";
      case "technical":
        return "construct-outline";
      case "external":
        return "globe-outline";
      default:
        return "alert-circle-outline";
    }
  };

  if (loading && risks.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Quản lý Rủi ro" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  // Group risks by level
  const criticalRisks = risks.filter((r) => r.risk_level === "critical");
  const highRisks = risks.filter((r) => r.risk_level === "high");
  const mediumRisks = risks.filter((r) => r.risk_level === "medium");
  const lowRisks = risks.filter((r) => r.risk_level === "low");

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="Quản lý Rủi ro"
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push(`/projects/${id}/risks/create`)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={[styles.scrollView, { marginBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#DC2626" }]}>{criticalRisks.length}</Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#EF4444" }]}>{highRisks.length}</Text>
            <Text style={styles.summaryLabel}>High</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#F59E0B" }]}>{mediumRisks.length}</Text>
            <Text style={styles.summaryLabel}>Medium</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#10B981" }]}>{lowRisks.length}</Text>
            <Text style={styles.summaryLabel}>Low</Text>
          </View>
        </View>

        {/* Critical Risks */}
        {criticalRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rủi ro Critical ({criticalRisks.length})</Text>
            {criticalRisks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} onPress={() => router.push(`/projects/${id}/risks/${risk.id}`)} />
            ))}
          </View>
        )}

        {/* High Risks */}
        {highRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rủi ro High ({highRisks.length})</Text>
            {highRisks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} onPress={() => router.push(`/projects/${id}/risks/${risk.id}`)} />
            ))}
          </View>
        )}

        {/* Medium Risks */}
        {mediumRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rủi ro Medium ({mediumRisks.length})</Text>
            {mediumRisks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} onPress={() => router.push(`/projects/${id}/risks/${risk.id}`)} />
            ))}
          </View>
        )}

        {/* Low Risks */}
        {lowRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rủi ro Low ({lowRisks.length})</Text>
            {lowRisks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} onPress={() => router.push(`/projects/${id}/risks/${risk.id}`)} />
            ))}
          </View>
        )}

        {risks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không có rủi ro nào</Text>
            <Text style={styles.emptySubtext}>Tất cả rủi ro đã được xử lý</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RiskCard({ risk, onPress }: { risk: ProjectRisk; onPress: () => void }) {
  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case "critical":
        return "#DC2626";
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "closed":
        return "#10B981";
      case "mitigated":
        return "#3B82F6";
      case "monitored":
        return "#F59E0B";
      case "analyzed":
        return "#8B5CF6";
      case "identified":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "schedule":
        return "time-outline";
      case "cost":
        return "cash-outline";
      case "quality":
        return "checkmark-circle-outline";
      case "scope":
        return "document-text-outline";
      case "resource":
        return "people-outline";
      case "technical":
        return "construct-outline";
      case "external":
        return "globe-outline";
      default:
        return "alert-circle-outline";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.riskCard, { borderLeftColor: getRiskLevelColor(risk.risk_level) }]}
      onPress={onPress}
    >
      <View style={styles.riskHeader}>
        <View style={[styles.riskIconContainer, { backgroundColor: getRiskLevelColor(risk.risk_level) + "20" }]}>
          <Ionicons
            name={getCategoryIcon(risk.category) as any}
            size={20}
            color={getRiskLevelColor(risk.risk_level)}
          />
        </View>
        <View style={styles.riskContent}>
          <Text style={styles.riskTitle}>{risk.title}</Text>
          <View style={styles.riskMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(risk.status) + "20" }]}>
              <Text style={[styles.statusText, { color: getStatusColor(risk.status) }]}>
                {risk.status}
              </Text>
            </View>
            <Text style={styles.riskCategory}>{risk.category}</Text>
          </View>
        </View>
        <View style={[styles.riskScoreBadge, { backgroundColor: getRiskLevelColor(risk.risk_level) + "20" }]}>
          <Text style={[styles.riskScoreText, { color: getRiskLevelColor(risk.risk_level) }]}>
            {risk.risk_score || 0}
          </Text>
        </View>
      </View>
      {risk.description && (
        <Text style={styles.riskDescription} numberOfLines={2}>
          {risk.description}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  riskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  riskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  riskContent: {
    flex: 1,
  },
  riskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  riskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  riskCategory: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  riskScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  riskScoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  riskDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
});

