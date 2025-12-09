import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { bonusApi, Bonus } from "@/api/bonusApi";

export default function MyBonusesScreen() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBonuses();
  }, []);

  const loadBonuses = async () => {
    try {
      setLoading(true);
      const response = await bonusApi.getMyBonuses({ page: 1 });
      if (response.success) {
        setBonuses(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading bonuses:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBonuses();
  };

  const renderItem = ({ item }: { item: Bonus }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.projectName}>{item.project?.name || "Không có dự án"}</Text>
        <Text style={styles.amount}>{item.amount.toLocaleString()} VND</Text>
      </View>
      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              item.status === "paid"
                ? "#10B98120"
                : item.status === "approved"
                  ? "#3B82F620"
                  : "#F59E0B20",
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            {
              color:
                item.status === "paid"
                  ? "#10B981"
                  : item.status === "approved"
                    ? "#3B82F6"
                    : "#F59E0B",
            },
          ]}
        >
          {item.status === "paid"
            ? "Đã thanh toán"
            : item.status === "approved"
              ? "Đã duyệt"
              : "Chờ duyệt"}
        </Text>
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
      <FlatList
        data={bonuses}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có thưởng</Text>
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
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F59E0B",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
});
