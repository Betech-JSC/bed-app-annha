import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/components/BackButton";

export default function ReportsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const reportItems = [
    {
      title: "Báo Cáo Tiến Độ Thi Công",
      icon: "trending-up-outline",
      route: `/projects/${id}/reports/construction-progress`,
      color: "#3B82F6",
      description: "Theo dõi tiến độ thi công theo tuần, tháng",
    },
    {
      title: "Báo Cáo Tiến Độ Mua Vật Liệu",
      icon: "cart-outline",
      route: `/projects/${id}/reports/material-procurement`,
      color: "#10B981",
      description: "Theo dõi nhập nguyên vật liệu theo thời gian",
    },
    {
      title: "Báo Cáo Thu Chi",
      icon: "cash-outline",
      route: `/projects/${id}/reports/revenue-expense`,
      color: "#8B5CF6",
      description: "Tổng hợp thu chi toàn dự án theo tháng, quý",
    },
    {
      title: "Báo Cáo Vật Liệu Sử Dụng",
      icon: "cube-outline",
      route: `/projects/${id}/reports/material-usage`,
      color: "#EF4444",
      description: "Thống kê vật liệu đã sử dụng trong dự án",
    },
    {
      title: "Báo Cáo Nhật Ký Thi Công",
      icon: "document-text-outline",
      route: `/projects/${id}/reports/construction-logs`,
      color: "#06B6D4",
      description: "Xem chi tiết nhật ký thi công hàng ngày",
    },
    {
      title: "Báo Cáo Công Nợ & Thanh Toán",
      icon: "wallet-outline",
      route: `/projects/${id}/reports/debt-payment`,
      color: "#EC4899",
      description: "Theo dõi công nợ thầu phụ, NCC và thanh toán",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Báo Cáo Dự Án</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {reportItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.reportCard}
            onPress={() => router.push(item.route)}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}
            >
              <Ionicons name={item.icon as any} size={32} color={item.color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
});

