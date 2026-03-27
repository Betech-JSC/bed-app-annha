import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { laborProductivityApi } from "@/api/attendanceApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Ionicons } from "@expo/vector-icons";

interface ProductivityRecord {
  id: number;
  work_item: string;
  unit: string;
  planned_quantity: number;
  actual_quantity: number;
  workers_count: number;
  hours_spent: number;
  productivity_rate: number;
  efficiency_percent: number;
  record_date: string;
  user?: { id: number; name: string };
  task?: { id: number; name: string };
  note?: string;
}

interface Dashboard {
  summary: {
    total_records: number;
    total_workers: number;
    avg_efficiency: number;
    avg_productivity_rate: number;
    total_planned: number;
    total_actual: number;
    total_hours: number;
  };
  by_user: Array<{ user_name: string; avg_efficiency: number; total_actual: number; records_count: number }>;
  by_item: Array<{ work_item: string; unit: string; avg_efficiency: number; total_planned: number; total_actual: number }>;
  trend: Array<{ date: string; avg_efficiency: number; total_actual: number }>;
}

type ViewMode = "dashboard" | "records" | "add";

export default function LaborProductivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();

  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [records, setRecords] = useState<ProductivityRecord[]>([]);

  // Form
  const [form, setForm] = useState({
    work_item: "", unit: "m²", planned_quantity: "",
    actual_quantity: "", workers_count: "1", hours_spent: "8",
    record_date: new Date().toISOString().split("T")[0], note: "",
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [dashRes, recRes] = await Promise.all([
        laborProductivityApi.dashboard(id).catch(() => null),
        laborProductivityApi.getAll(id, { per_page: 30 }).catch(() => null),
      ]);
      if (dashRes?.data) setDashboard(dashRes.data);
      if (recRes?.data?.data) setRecords(recRes.data.data);
    } catch (e) {
      console.error("Load productivity error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async () => {
    if (!form.work_item || !form.planned_quantity || !form.actual_quantity) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    try {
      setSaving(true);
      await laborProductivityApi.create(id!, {
        ...form,
        planned_quantity: parseFloat(form.planned_quantity),
        actual_quantity: parseFloat(form.actual_quantity),
        workers_count: parseInt(form.workers_count),
        hours_spent: parseFloat(form.hours_spent),
      });
      Alert.alert("✅ Thành công", "Đã ghi nhận năng suất");
      setForm({
        work_item: "", unit: "m²", planned_quantity: "",
        actual_quantity: "", workers_count: "1", hours_spent: "8",
        record_date: new Date().toISOString().split("T")[0], note: "",
      });
      setViewMode("records");
      loadData();
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (recId: number) => {
    Alert.alert("Xác nhận", "Xóa bản ghi năng suất này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa", style: "destructive",
        onPress: async () => {
          try {
            await laborProductivityApi.delete(id!, recId);
            loadData();
          } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Không thể xóa");
          }
        },
      },
    ]);
  };

  const getEffColor = (eff: number) => {
    if (eff >= 100) return "#16A34A";
    if (eff >= 90) return "#2563EB";
    if (eff >= 70) return "#D97706";
    return "#DC2626";
  };

  const getEffLabel = (eff: number) => {
    if (eff >= 100) return "Vượt mức";
    if (eff >= 90) return "Đạt";
    if (eff >= 70) return "Trung bình";
    return "Thấp";
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  const unitOptions = ["m²", "m³", "m", "kg", "tấn", "cái", "bộ", "m.dài", "điểm"];

  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        <ScreenHeader title="Năng suất lao động" showBackButton />
        <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title="Năng suất lao động" showBackButton />

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {([
          { key: "dashboard" as ViewMode, label: "Tổng quan", icon: "pie-chart-outline" },
          { key: "records" as ViewMode, label: `Dữ liệu (${records.length})`, icon: "list-outline" },
          { key: "add" as ViewMode, label: "Thêm mới", icon: "add-circle-outline" },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, viewMode === tab.key && s.tabActive]}
            onPress={() => setViewMode(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={viewMode === tab.key ? "#FFF" : "#6B7280"} />
            <Text style={[s.tabText, viewMode === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#3B82F6" />}
      >
        {/* ===== DASHBOARD ===== */}
        {viewMode === "dashboard" && dashboard && (
          <View style={s.section}>
            {/* Summary cards */}
            <View style={s.summaryGrid}>
              <View style={[s.summaryCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                <Text style={[s.summaryNumber, { color: "#2563EB" }]}>{dashboard.summary.total_records}</Text>
                <Text style={s.summaryLabel}>Bản ghi</Text>
              </View>
              <View style={[s.summaryCard, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
                <Text style={[s.summaryNumber, { color: "#16A34A" }]}>{dashboard.summary.avg_efficiency}%</Text>
                <Text style={s.summaryLabel}>TB Hiệu suất</Text>
              </View>
              <View style={[s.summaryCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                <Text style={[s.summaryNumber, { color: "#D97706" }]}>{dashboard.summary.total_workers}</Text>
                <Text style={s.summaryLabel}>Nhân công</Text>
              </View>
              <View style={[s.summaryCard, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}>
                <Text style={[s.summaryNumber, { color: "#7C3AED" }]}>{dashboard.summary.total_hours.toFixed(0)}h</Text>
                <Text style={s.summaryLabel}>Tổng giờ</Text>
              </View>
            </View>

            {/* Efficiency gauge */}
            <View style={s.gaugeCard}>
              <Text style={s.gaugeLabel}>Hiệu suất tổng thể</Text>
              <View style={s.gaugeBar}>
                <View style={[s.gaugeFill, {
                  width: `${Math.min(dashboard.summary.avg_efficiency, 100)}%`,
                  backgroundColor: getEffColor(dashboard.summary.avg_efficiency),
                }]} />
              </View>
              <View style={s.gaugeRow}>
                <Text style={s.gaugeText}>
                  KH: {dashboard.summary.total_planned.toLocaleString()}
                </Text>
                <Text style={[s.gaugeText, { fontWeight: "700", color: getEffColor(dashboard.summary.avg_efficiency) }]}>
                  TT: {dashboard.summary.total_actual.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* By User Top */}
            {dashboard.by_user.length > 0 && (
              <>
                <Text style={s.sectionTitle}>🏆 Xếp hạng nhân công</Text>
                {dashboard.by_user.slice(0, 5).map((u, idx) => (
                  <View key={idx} style={s.rankCard}>
                    <View style={[s.rankBadge, idx === 0 ? { backgroundColor: "#F59E0B" } : idx === 1 ? { backgroundColor: "#9CA3AF" } : idx === 2 ? { backgroundColor: "#CD7F32" } : { backgroundColor: "#E5E7EB" }]}>
                      <Text style={[s.rankText, idx < 3 ? { color: "#FFF" } : { color: "#6B7280" }]}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rankName}>{u.user_name}</Text>
                      <Text style={s.rankMeta}>{u.records_count} lượt | {u.total_actual.toLocaleString()} đơn vị</Text>
                    </View>
                    <View style={[s.effBadge, { backgroundColor: getEffColor(u.avg_efficiency) + "20" }]}>
                      <Text style={[s.effText, { color: getEffColor(u.avg_efficiency) }]}>{u.avg_efficiency}%</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* By Item */}
            {dashboard.by_item.length > 0 && (
              <>
                <Text style={s.sectionTitle}>📦 Theo hạng mục</Text>
                {dashboard.by_item.map((item, idx) => (
                  <View key={idx} style={s.itemCard}>
                    <View style={s.itemHeader}>
                      <Text style={s.itemName}>{item.work_item}</Text>
                      <Text style={s.itemUnit}>{item.unit}</Text>
                    </View>
                    <View style={s.itemRow}>
                      <Text style={s.itemMeta}>KH: {item.total_planned.toLocaleString()}</Text>
                      <Text style={s.itemMeta}>TT: {item.total_actual.toLocaleString()}</Text>
                      <View style={[s.effBadge, { backgroundColor: getEffColor(item.avg_efficiency) + "20" }]}>
                        <Text style={[s.effText, { color: getEffColor(item.avg_efficiency) }]}>
                          {item.avg_efficiency}% {getEffLabel(item.avg_efficiency)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* ===== RECORDS ===== */}
        {viewMode === "records" && (
          <View style={s.section}>
            {records.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
                <Text style={s.emptyText}>Chưa có dữ liệu năng suất</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setViewMode("add")}>
                  <Text style={s.emptyBtnText}>+ Thêm mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              records.map((rec) => (
                <View key={rec.id} style={s.recordCard}>
                  <View style={s.recordHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recordItem}>{rec.work_item}</Text>
                      <Text style={s.recordDate}>{fmtDate(rec.record_date)} — {rec.user?.name || "—"}</Text>
                    </View>
                    <View style={[s.effBadge, { backgroundColor: getEffColor(rec.efficiency_percent) + "20" }]}>
                      <Text style={[s.effText, { color: getEffColor(rec.efficiency_percent) }]}>
                        {rec.efficiency_percent}%
                      </Text>
                    </View>
                  </View>
                  <View style={s.recordMeta}>
                    <View style={s.recordMetaItem}>
                      <Text style={s.recordMetaLabel}>KH</Text>
                      <Text style={s.recordMetaValue}>{rec.planned_quantity} {rec.unit}</Text>
                    </View>
                    <View style={s.recordMetaItem}>
                      <Text style={s.recordMetaLabel}>TT</Text>
                      <Text style={[s.recordMetaValue, { fontWeight: "700" }]}>{rec.actual_quantity} {rec.unit}</Text>
                    </View>
                    <View style={s.recordMetaItem}>
                      <Text style={s.recordMetaLabel}>NC</Text>
                      <Text style={s.recordMetaValue}>{rec.workers_count} người</Text>
                    </View>
                    <View style={s.recordMetaItem}>
                      <Text style={s.recordMetaLabel}>Giờ</Text>
                      <Text style={s.recordMetaValue}>{rec.hours_spent}h</Text>
                    </View>
                  </View>
                  <View style={s.recordActions}>
                    <Text style={s.prodRate}>NS: {rec.productivity_rate} {rec.unit}/người·giờ</Text>
                    <TouchableOpacity onPress={() => handleDelete(rec.id)}>
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ===== ADD FORM ===== */}
        {viewMode === "add" && (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={s.section}>
              <View style={s.formCard}>
                <Text style={s.formTitle}>Ghi nhận năng suất</Text>

                <Text style={s.formLabel}>Hạng mục công việc *</Text>
                <TextInput style={s.input} value={form.work_item}
                  onChangeText={(t) => setForm({ ...form, work_item: t })}
                  placeholder="VD: Đổ sàn tầng 3, Xây tường" />

                <Text style={s.formLabel}>Đơn vị *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={s.unitRow}>
                    {unitOptions.map((u) => (
                      <TouchableOpacity key={u}
                        style={[s.unitChip, form.unit === u && s.unitChipActive]}
                        onPress={() => setForm({ ...form, unit: u })}
                      >
                        <Text style={[s.unitChipText, form.unit === u && s.unitChipTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View style={s.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>KL Kế hoạch *</Text>
                    <TextInput style={s.input} value={form.planned_quantity}
                      onChangeText={(t) => setForm({ ...form, planned_quantity: t })}
                      keyboardType="numeric" placeholder="0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>KL Thực tế *</Text>
                    <TextInput style={s.input} value={form.actual_quantity}
                      onChangeText={(t) => setForm({ ...form, actual_quantity: t })}
                      keyboardType="numeric" placeholder="0" />
                  </View>
                </View>

                <View style={s.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>Số nhân công</Text>
                    <TextInput style={s.input} value={form.workers_count}
                      onChangeText={(t) => setForm({ ...form, workers_count: t })}
                      keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>Số giờ làm</Text>
                    <TextInput style={s.input} value={form.hours_spent}
                      onChangeText={(t) => setForm({ ...form, hours_spent: t })}
                      keyboardType="numeric" />
                  </View>
                </View>

                <Text style={s.formLabel}>Ghi chú</Text>
                <TextInput style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
                  value={form.note}
                  onChangeText={(t) => setForm({ ...form, note: t })}
                  placeholder="Ghi chú thêm..." multiline />

                {/* Preview */}
                {form.planned_quantity && form.actual_quantity && (
                  <View style={s.previewCard}>
                    <Text style={s.previewTitle}>Xem trước năng suất</Text>
                    <View style={s.previewRow}>
                      <View style={s.previewItem}>
                        <Text style={s.previewLabel}>Hiệu suất</Text>
                        <Text style={[s.previewValue, {
                          color: getEffColor(
                            parseFloat(form.planned_quantity) > 0
                              ? (parseFloat(form.actual_quantity) / parseFloat(form.planned_quantity)) * 100
                              : 0
                          )
                        }]}>
                          {parseFloat(form.planned_quantity) > 0
                            ? ((parseFloat(form.actual_quantity) / parseFloat(form.planned_quantity)) * 100).toFixed(1)
                            : 0}%
                        </Text>
                      </View>
                      <View style={s.previewItem}>
                        <Text style={s.previewLabel}>Năng suất</Text>
                        <Text style={s.previewValue}>
                          {(parseInt(form.workers_count) * parseFloat(form.hours_spent)) > 0
                            ? (parseFloat(form.actual_quantity) / (parseInt(form.workers_count) * parseFloat(form.hours_spent))).toFixed(2)
                            : 0} {form.unit}/người·giờ
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={s.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={s.saveBtnText}>💾 Lưu ghi nhận</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12, marginTop: 8 },
  tabBar: { flexDirection: "row", backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", padding: 8, gap: 8 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F9FAFB" },
  tabActive: { backgroundColor: "#3B82F6" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFF" },
  // Summary
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, minWidth: "45%", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  summaryNumber: { fontSize: 24, fontWeight: "800" },
  summaryLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  // Gauge
  gaugeCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  gaugeLabel: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 10 },
  gaugeBar: { height: 12, backgroundColor: "#E5E7EB", borderRadius: 6, overflow: "hidden", marginBottom: 8 },
  gaugeFill: { height: "100%", borderRadius: 6 },
  gaugeRow: { flexDirection: "row", justifyContent: "space-between" },
  gaugeText: { fontSize: 12, color: "#6B7280" },
  // Rank
  rankCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  rankBadge: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  rankText: { fontWeight: "800", fontSize: 12 },
  rankName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  rankMeta: { fontSize: 11, color: "#9CA3AF" },
  // Efficiency badge
  effBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  effText: { fontSize: 12, fontWeight: "700" },
  // Item
  itemCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  itemUnit: { fontSize: 12, color: "#9CA3AF" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemMeta: { fontSize: 12, color: "#6B7280" },
  // Records
  recordCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  recordHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  recordItem: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  recordDate: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  recordMeta: { flexDirection: "row", gap: 12, marginBottom: 8 },
  recordMetaItem: { alignItems: "center" },
  recordMetaLabel: { fontSize: 9, color: "#9CA3AF", fontWeight: "500" },
  recordMetaValue: { fontSize: 13, color: "#1F2937" },
  recordActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  prodRate: { fontSize: 12, color: "#3B82F6", fontWeight: "600" },
  // Form
  formCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  formTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#4B5563", marginBottom: 6 },
  formRow: { flexDirection: "row", gap: 12 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1F2937", marginBottom: 12 },
  unitRow: { flexDirection: "row", gap: 8 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  unitChipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  unitChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  unitChipTextActive: { color: "#FFF" },
  // Preview
  previewCard: { backgroundColor: "#F0F9FF", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#BAE6FD" },
  previewTitle: { fontSize: 13, fontWeight: "600", color: "#0369A1", marginBottom: 10 },
  previewRow: { flexDirection: "row", gap: 20 },
  previewItem: { alignItems: "center" },
  previewLabel: { fontSize: 10, color: "#6B7280" },
  previewValue: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  // Save
  saveBtn: { backgroundColor: "#3B82F6", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: "#9CA3AF", marginTop: 8, marginBottom: 12 },
  emptyBtn: { backgroundColor: "#3B82F6", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: "#FFF", fontWeight: "600" },
});
