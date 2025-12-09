import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { bonusApi, Bonus } from "@/api/bonusApi";
import { Ionicons } from "@expo/vector-icons";

export default function BonusesScreen() {
  const router = useRouter();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBonuses();
  }, []);

  const loadBonuses = async () => {
    try {
      setLoading(true);
      const response = await bonusApi.getBonuses({ page: 1 });
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
        <View>
          <Text style={styles.employeeName}>{item.user?.name || "N/A"}</Text>
          <Text style={styles.projectName}>{item.project?.name || "Không có dự án"}</Text>
        </View>
        <Text style={styles.amount}>{item.amount.toLocaleString()} VND</Text>
      </View>
      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}
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
            <Text style={styles.emptyText}>Không có dữ liệu</Text>
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
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  projectName: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
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
