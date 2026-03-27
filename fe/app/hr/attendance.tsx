import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { attendanceApi } from "@/api/attendanceApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

interface AttendanceRecord {
  id: number;
  user_id: number;
  user?: { id: number; name: string };
  project?: { id: number; name: string };
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number;
  overtime_hours: number;
  status: string;
  note?: string;
}

type ViewMode = "today" | "history" | "statistics";

export default function AttendanceScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Today's record
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  // History
  const [history, setHistory] = useState<AttendanceRecord[]>([]);

  // Statistics
  const [stats, setStats] = useState<any>(null);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [todayRes, historyRes] = await Promise.all([
        attendanceApi.getAll({ date: today }).catch(() => null),
        attendanceApi.getAll({ per_page: 30 }).catch(() => null),
      ]);

      if (todayRes?.data?.data) {
        const myRecord = todayRes.data.data.find((r: any) => true); // lấy record đầu tiên
        setTodayRecord(myRecord || null);
      }
      if (historyRes?.data?.data) setHistory(historyRes.data.data);

      // Stats cho tháng hiện tại
      const statsRes = await attendanceApi.getStatistics({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      }).catch(() => null);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (e) {
      console.error("Load attendance error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      let location: any = null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }

      const res = await attendanceApi.checkIn({
        ...location,
      });
      Alert.alert("✅ Thành công", res.data.message || "Check-in thành công!");
      loadData();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể check-in");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    Alert.alert("Xác nhận", "Bạn muốn check-out?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Check-out",
        onPress: async () => {
          try {
            setCheckingOut(true);
            const res = await attendanceApi.checkOut();
            Alert.alert("✅ Thành công", res.data.message || "Check-out thành công!");
            loadData();
          } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể check-out");
          } finally {
            setCheckingOut(false);
          }
        },
      },
    ]);
  };

  const fmtTime = (t?: string | null) => t ? t.substring(0, 5) : "—";
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const statusConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    present: { color: "#16A34A", bg: "#DCFCE7", label: "Có mặt", icon: "checkmark-circle" },
    absent: { color: "#DC2626", bg: "#FEE2E2", label: "Vắng", icon: "close-circle" },
    late: { color: "#D97706", bg: "#FEF3C7", label: "Trễ", icon: "alert-circle" },
    half_day: { color: "#2563EB", bg: "#DBEAFE", label: "Nửa ngày", icon: "remove-circle" },
    leave: { color: "#7C3AED", bg: "#EDE9FE", label: "Nghỉ phép", icon: "calendar" },
    holiday: { color: "#EC4899", bg: "#FCE7F3", label: "Nghỉ lễ", icon: "gift" },
  };

  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        <ScreenHeader title="Chấm công" showBackButton />
        <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title="Chấm công" showBackButton />

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {([
          { key: "today" as ViewMode, label: "Hôm nay", icon: "today-outline" },
          { key: "history" as ViewMode, label: "Lịch sử", icon: "time-outline" },
          { key: "statistics" as ViewMode, label: "Thống kê", icon: "stats-chart-outline" },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, viewMode === tab.key && s.tabActive]}
            onPress={() => setViewMode(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={18} color={viewMode === tab.key ? "#FFF" : "#6B7280"} />
            <Text style={[s.tabText, viewMode === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#3B82F6" />}
      >
        {/* ===== TODAY VIEW ===== */}
        {viewMode === "today" && (
          <View style={s.section}>
            {/* Clock */}
            <View style={s.clockCard}>
              <Text style={s.clockTime}>
                {now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </Text>
              <Text style={s.clockDate}>
                {now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </Text>
            </View>

            {/* Status Card */}
            <View style={s.statusCard}>
              {todayRecord ? (
                <>
                  <View style={s.statusRow}>
                    <View style={[s.statusBadge, { backgroundColor: statusConfig[todayRecord.status]?.bg || "#F3F4F6" }]}>
                      <Ionicons name={(statusConfig[todayRecord.status]?.icon || "ellipse") as any} size={16} color={statusConfig[todayRecord.status]?.color || "#6B7280"} />
                      <Text style={[s.statusLabel, { color: statusConfig[todayRecord.status]?.color }]}>
                        {statusConfig[todayRecord.status]?.label || todayRecord.status}
                      </Text>
                    </View>
                    <Text style={s.hoursText}>{todayRecord.hours_worked || 0}h làm</Text>
                  </View>

                  <View style={s.timeGrid}>
                    <View style={s.timeItem}>
                      <Ionicons name="log-in-outline" size={24} color="#16A34A" />
                      <Text style={s.timeItemLabel}>Vào ca</Text>
                      <Text style={s.timeItemValue}>{fmtTime(todayRecord.check_in)}</Text>
                    </View>
                    <View style={[s.timeItem, { borderLeftWidth: 1, borderLeftColor: "#E5E7EB" }]}>
                      <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                      <Text style={s.timeItemLabel}>Ra ca</Text>
                      <Text style={s.timeItemValue}>{fmtTime(todayRecord.check_out)}</Text>
                    </View>
                    <View style={[s.timeItem, { borderLeftWidth: 1, borderLeftColor: "#E5E7EB" }]}>
                      <Ionicons name="timer-outline" size={24} color="#F59E0B" />
                      <Text style={s.timeItemLabel}>OT</Text>
                      <Text style={s.timeItemValue}>{todayRecord.overtime_hours || 0}h</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={s.noRecord}>
                  <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
                  <Text style={s.noRecordText}>Chưa chấm công hôm nay</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={s.actionRow}>
              {(!todayRecord || !todayRecord.check_in) ? (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: "#16A34A" }]}
                  onPress={handleCheckIn}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="finger-print-outline" size={28} color="#FFF" />
                      <Text style={s.actionBtnText}>CHECK-IN</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : !todayRecord.check_out ? (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: "#EF4444" }]}
                  onPress={handleCheckOut}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="exit-outline" size={28} color="#FFF" />
                      <Text style={s.actionBtnText}>CHECK-OUT</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[s.actionBtn, { backgroundColor: "#E5E7EB" }]}>
                  <Ionicons name="checkmark-done-circle" size={28} color="#16A34A" />
                  <Text style={[s.actionBtnText, { color: "#16A34A" }]}>ĐÃ HOÀN TẤT</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ===== HISTORY VIEW ===== */}
        {viewMode === "history" && (
          <View style={s.section}>
            {history.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="document-outline" size={48} color="#D1D5DB" />
                <Text style={s.emptyText}>Chưa có lịch sử chấm công</Text>
              </View>
            ) : (
              history.map((rec) => {
                const cfg = statusConfig[rec.status] || statusConfig.present;
                return (
                  <View key={rec.id} style={s.historyCard}>
                    <View style={s.historyHeader}>
                      <Text style={s.historyDate}>{fmtDate(rec.work_date)}</Text>
                      <View style={[s.historyBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[s.historyBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <View style={s.historyMeta}>
                      <View style={s.historyMetaItem}>
                        <Ionicons name="log-in-outline" size={14} color="#16A34A" />
                        <Text style={s.historyMetaText}>{fmtTime(rec.check_in)}</Text>
                      </View>
                      <View style={s.historyMetaItem}>
                        <Ionicons name="log-out-outline" size={14} color="#EF4444" />
                        <Text style={s.historyMetaText}>{fmtTime(rec.check_out)}</Text>
                      </View>
                      <View style={s.historyMetaItem}>
                        <Ionicons name="time-outline" size={14} color="#3B82F6" />
                        <Text style={s.historyMetaText}>{rec.hours_worked}h</Text>
                      </View>
                      {rec.overtime_hours > 0 && (
                        <View style={s.historyMetaItem}>
                          <Ionicons name="timer-outline" size={14} color="#F59E0B" />
                          <Text style={[s.historyMetaText, { color: "#F59E0B" }]}>OT {rec.overtime_hours}h</Text>
                        </View>
                      )}
                    </View>
                    {rec.project && (
                      <Text style={s.historyProject}>📍 {rec.project.name}</Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ===== STATISTICS VIEW ===== */}
        {viewMode === "statistics" && stats && (
          <View style={s.section}>
            {/* Summary */}
            <View style={s.statsGrid}>
              <View style={[s.statsCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                <Text style={[s.statsNumber, { color: "#2563EB" }]}>{stats.summary?.total_records || 0}</Text>
                <Text style={s.statsLabel}>Tổng ngày</Text>
              </View>
              <View style={[s.statsCard, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
                <Text style={[s.statsNumber, { color: "#16A34A" }]}>{stats.summary?.total_present || 0}</Text>
                <Text style={s.statsLabel}>Có mặt</Text>
              </View>
              <View style={[s.statsCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                <Text style={[s.statsNumber, { color: "#D97706" }]}>{stats.summary?.total_late || 0}</Text>
                <Text style={s.statsLabel}>Trễ</Text>
              </View>
              <View style={[s.statsCard, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
                <Text style={[s.statsNumber, { color: "#DC2626" }]}>{stats.summary?.total_absent || 0}</Text>
                <Text style={s.statsLabel}>Vắng</Text>
              </View>
            </View>

            <View style={s.totalHoursCard}>
              <View style={s.totalHoursRow}>
                <View>
                  <Text style={s.totalHoursLabel}>Tổng giờ làm</Text>
                  <Text style={s.totalHoursValue}>{stats.summary?.total_hours || 0}h</Text>
                </View>
                <View>
                  <Text style={s.totalHoursLabel}>Tổng OT</Text>
                  <Text style={[s.totalHoursValue, { color: "#F59E0B" }]}>{stats.summary?.total_overtime || 0}h</Text>
                </View>
              </View>
            </View>

            {/* By User */}
            {stats.by_user?.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Chi tiết theo nhân viên</Text>
                {stats.by_user.map((u: any, idx: number) => (
                  <View key={idx} style={s.userStatCard}>
                    <View style={s.userStatHeader}>
                      <View style={s.userAvatar}>
                        <Text style={s.userAvatarText}>{(u.user?.name || "?")[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.userName}>{u.user?.name || "—"}</Text>
                        <Text style={s.userDays}>{u.total_days} ngày | {u.total_hours}h</Text>
                      </View>
                    </View>
                    <View style={s.userStatMeta}>
                      <View style={[s.userStatBadge, { backgroundColor: "#DCFCE7" }]}>
                        <Text style={{ color: "#16A34A", fontSize: 11, fontWeight: "600" }}>✓ {u.present}</Text>
                      </View>
                      <View style={[s.userStatBadge, { backgroundColor: "#FEF3C7" }]}>
                        <Text style={{ color: "#D97706", fontSize: 11, fontWeight: "600" }}>⏰ {u.late}</Text>
                      </View>
                      <View style={[s.userStatBadge, { backgroundColor: "#FEE2E2" }]}>
                        <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "600" }}>✗ {u.absent}</Text>
                      </View>
                      {u.total_overtime > 0 && (
                        <View style={[s.userStatBadge, { backgroundColor: "#FEF3C7" }]}>
                          <Text style={{ color: "#F59E0B", fontSize: 11, fontWeight: "600" }}>OT {u.total_overtime}h</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12, marginTop: 4 },
  tabBar: { flexDirection: "row", backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 8, gap: 8 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F9FAFB" },
  tabActive: { backgroundColor: "#3B82F6" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFF" },
  // Clock
  clockCard: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  clockTime: { fontSize: 48, fontWeight: "800", color: "#1F2937", letterSpacing: 2 },
  clockDate: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  // Status
  statusCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusLabel: { fontSize: 13, fontWeight: "600" },
  hoursText: { fontSize: 14, fontWeight: "700", color: "#3B82F6" },
  timeGrid: { flexDirection: "row" },
  timeItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 8 },
  timeItemLabel: { fontSize: 11, color: "#9CA3AF" },
  timeItemValue: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  noRecord: { alignItems: "center", paddingVertical: 24 },
  noRecordText: { fontSize: 14, color: "#9CA3AF", marginTop: 8 },
  // Actions
  actionRow: { marginBottom: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 18, borderRadius: 16 },
  actionBtnText: { fontSize: 18, fontWeight: "800", color: "#FFF", letterSpacing: 1 },
  // History
  historyCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  historyDate: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  historyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  historyBadgeText: { fontSize: 11, fontWeight: "600" },
  historyMeta: { flexDirection: "row", gap: 16 },
  historyMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  historyMetaText: { fontSize: 12, color: "#4B5563" },
  historyProject: { fontSize: 11, color: "#6B7280", marginTop: 6 },
  // Statistics
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statsCard: { flex: 1, minWidth: "45%", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  statsNumber: { fontSize: 28, fontWeight: "800" },
  statsLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  totalHoursCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  totalHoursRow: { flexDirection: "row", justifyContent: "space-around" },
  totalHoursLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 4 },
  totalHoursValue: { fontSize: 24, fontWeight: "800", color: "#1F2937" },
  // User stat card
  userStatCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  userStatHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center" },
  userAvatarText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  userName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  userDays: { fontSize: 11, color: "#9CA3AF" },
  userStatMeta: { flexDirection: "row", gap: 8 },
  userStatBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: "#9CA3AF", marginTop: 8 },
});
