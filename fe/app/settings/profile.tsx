import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/reducers/index";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Thông Tin Tài Khoản" showBackButton />

      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={48} color="#3B82F6" />
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
        </View>

        {/* User Details */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ và tên</Text>
            <Text style={styles.infoValue}>{user?.name || "N/A"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || "N/A"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại</Text>
            <Text style={styles.infoValue}>{user?.phone || "N/A"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vai trò</Text>
            <View style={styles.badgeContainer}>
              {user?.owner && (
                <View style={[styles.badge, styles.superAdminBadge]}>
                  <Text style={styles.superAdminBadgeText}>SUPER ADMIN</Text>
                </View>
              )}
              {user?.role && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {user.role.toUpperCase()}
                  </Text>
                </View>
              )}
              {user?.roles && user.roles.length > 0 && (
                <>
                  {user.roles.map((role) => (
                    <View key={role.id} style={[styles.badge, styles.roleBadge]}>
                      <Text style={styles.roleBadgeText}>{role.name}</Text>
                    </View>
                  ))}
                </>
              )}
              {(!user?.roles || user.roles.length === 0) && !user?.role && !user?.owner && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>USER</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert("Thông báo", "Tính năng đang phát triển")}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Đổi mật khẩu</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert("Thông báo", "Tính năng đang phát triển")}
          >
            <Ionicons name="notifications-outline" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Thông báo</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
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
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  superAdminBadge: {
    backgroundColor: "#FEF3C7",
  },
  superAdminBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D97706",
  },
  roleBadge: {
    backgroundColor: "#DBEAFE",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1E40AF",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
});
