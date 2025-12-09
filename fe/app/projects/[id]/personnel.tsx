import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { personnelApi, ProjectPersonnel } from "@/api/personnelApi";
import { Ionicons } from "@expo/vector-icons";

export default function PersonnelScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [personnel, setPersonnel] = useState<ProjectPersonnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersonnel();
  }, [id]);

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const response = await personnelApi.getPersonnel(id!);
      if (response.success) {
        setPersonnel(response.data || []);
      }
    } catch (error) {
      console.error("Error loading personnel:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "project_manager":
        return "Quản lý dự án";
      case "supervisor":
        return "Giám sát";
      case "accountant":
        return "Kế toán";
      case "editor":
        return "Chỉnh sửa";
      case "viewer":
        return "Xem";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "project_manager":
        return "#3B82F6";
      case "supervisor":
        return "#10B981";
      case "accountant":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const renderPersonnelItem = ({ item }: { item: ProjectPersonnel }) => (
    <View style={styles.personnelCard}>
      <View style={styles.personnelHeader}>
        <View style={styles.personnelInfo}>
          <Text style={styles.personnelName}>
            {item.user?.name || `User #${item.user_id}`}
          </Text>
          <Text style={styles.personnelEmail}>
            {item.user?.email || "N/A"}
          </Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: getRoleColor(item.role) + "20" },
          ]}
        >
          <Text
            style={[styles.roleText, { color: getRoleColor(item.role) }]}
          >
            {getRoleText(item.role)}
          </Text>
        </View>
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
        <Text style={styles.headerTitle}>Nhân Sự Tham Gia</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Navigate to add personnel screen
          }}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={personnel}
        renderItem={renderPersonnelItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhân sự nào</Text>
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
  personnelCard: {
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
  personnelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  personnelInfo: {
    flex: 1,
    marginRight: 12,
  },
  personnelName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  personnelEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
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
