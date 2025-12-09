import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { subcontractorApi, Subcontractor } from "@/api/subcontractorApi";
import { Ionicons } from "@expo/vector-icons";

export default function SubcontractorsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    total_quote: "",
    advance_payment: "",
  });

  useEffect(() => {
    loadSubcontractors();
  }, [id]);

  const loadSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await subcontractorApi.getSubcontractors(id!);
      if (response.success) {
        setSubcontractors(response.data || []);
      }
    } catch (error) {
      console.error("Error loading subcontractors:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const renderSubcontractorItem = ({ item }: { item: Subcontractor }) => (
    <View style={styles.subcontractorCard}>
      <View style={styles.subcontractorHeader}>
        <View style={styles.subcontractorInfo}>
          <Text style={styles.subcontractorName}>{item.name}</Text>
          {item.category && (
            <Text style={styles.subcontractorCategory}>{item.category}</Text>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.progress_status === "completed"
                  ? "#10B98120"
                  : item.progress_status === "in_progress"
                    ? "#3B82F620"
                    : "#6B728020",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.progress_status === "completed"
                    ? "#10B981"
                    : item.progress_status === "in_progress"
                      ? "#3B82F6"
                      : "#6B7280",
              },
            ]}
          >
            {item.progress_status === "completed"
              ? "Hoàn thành"
              : item.progress_status === "in_progress"
                ? "Đang thi công"
                : "Chưa bắt đầu"}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Tổng báo giá</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(item.total_quote)}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Đã thanh toán</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(item.total_paid)}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${item.total_quote > 0 ? (item.total_paid / item.total_quote) * 100 : 0}%`,
            },
          ]}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhà Thầu Phụ</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={subcontractors}
        renderItem={renderSubcontractorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhà thầu phụ</Text>
          </View>
        }
      />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  subcontractorCard: {
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
  subcontractorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  subcontractorInfo: {
    flex: 1,
    marginRight: 12,
  },
  subcontractorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  subcontractorCategory: {
    fontSize: 14,
    color: "#6B7280",
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
  amountRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
});
