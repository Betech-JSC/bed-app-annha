import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { materialQuotaApi, MaterialWarning } from '../../../src/api/materialQuotaApi';
import { ScreenHeader } from '../../../src/components/ScreenHeader';

const TABS = [
  { key: 'inventory', label: '📦 Tồn kho' },
  { key: 'quotas', label: '📐 Định mức' },
  { key: 'warnings', label: '⚠️ Cảnh báo' },
  { key: 'history', label: '📋 Lịch sử' },
];

const fmtQty = (val: number | string | undefined) => {
  if (!val && val !== 0) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
};

export default function InventoryMonitorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inventory, setInventory] = useState<any>({});
  const [quotas, setQuotas] = useState<any>({});
  const [warnings, setWarnings] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [invRes, quotaRes, warnRes, histRes] = await Promise.all([
        materialQuotaApi.getInventory(id as string),
        materialQuotaApi.getQuotas(id as string),
        materialQuotaApi.getWarnings(id as string),
        materialQuotaApi.getHistory(id as string),
      ]);
      setInventory(invRes?.data || {});
      setQuotas(quotaRes?.data || {});
      setWarnings(warnRes?.data || {});
      setHistory(histRes?.data || []);
    } catch (e) { console.error('Material load error', e); }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    try {
      await materialQuotaApi.syncInventory(id as string);
      Alert.alert('Thành công', 'Đã đồng bộ tồn kho và định mức');
      loadData(true);
    } catch (e) { Alert.alert('Lỗi', 'Không thể đồng bộ'); }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="📊 Giám Sát Kho & Định Mức" showBackButton />
      <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[s.tabBtn, tab === t.key && s.tabBtnActive]}>
              <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={handleSync} style={[s.tabBtn, { borderColor: '#3B82F6' }]}>
            <Text style={[s.tabTxt, { color: '#3B82F6' }]}>🔄 Sync</Text>
          </TouchableOpacity>
        </ScrollView>

        {loading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} /> : (
          <>
            {tab === 'inventory' && (
              <View style={s.section}>
                <View style={s.row}>
                  <StatCard color="#3B82F6" label="Tổng loại" value={String(inventory.summary?.total_items || 0)} />
                  <StatCard color="#F59E0B" label="Sắp hết" value={String(inventory.summary?.low_stock_count || 0)} />
                  <StatCard color="#EF4444" label="Hết hàng" value={String(inventory.summary?.out_of_stock || 0)} />
                </View>
                {(inventory.inventory || []).map((item: any) => (
                  <View key={item.id} style={s.listItem}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.listTitle}>{item.material?.name || '—'}</Text>
                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{item.material?.code} — {item.material?.unit}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: item.stock_status === 'adequate' ? '#D1FAE5' : item.stock_status === 'low_stock' ? '#FEF3C7' : '#FEE2E2' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: item.stock_status === 'adequate' ? '#065F46' : item.stock_status === 'low_stock' ? '#92400E' : '#991B1B' }}>
                          {item.stock_status === 'adequate' ? '✓ Đủ' : item.stock_status === 'low_stock' ? '⚠️ Thấp' : '❌ Hết'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ fontSize: 12, color: '#374151' }}>Tồn: <Text style={{ fontWeight: '700' }}>{fmtQty(item.current_stock)}</Text></Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Min: {fmtQty(item.min_stock_level)}</Text>
                    </View>
                  </View>
                ))}
                {!inventory.inventory?.length && <Text style={s.empty}>Chưa có dữ liệu tồn kho</Text>}
              </View>
            )}

            {tab === 'quotas' && (
              <View style={s.section}>
                <View style={s.row}>
                  <StatCard color="#3B82F6" label="Tổng" value={String(quotas.summary?.total_items || 0)} />
                  <StatCard color="#EF4444" label="Vượt" value={String(quotas.summary?.exceeded_count || 0)} />
                  <StatCard color="#F59E0B" label="Cảnh báo" value={String(quotas.summary?.warning_count || 0)} />
                  <StatCard color="#10B981" label="Ổn" value={String(quotas.summary?.on_track_count || 0)} />
                </View>
                {(quotas.quotas || []).map((q: any) => (
                  <View key={q.id} style={s.listItem}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.listTitle}>{q.material?.name || '—'}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: q.is_exceeded ? '#EF4444' : q.usage_percentage >= 80 ? '#F59E0B' : '#10B981' }}>
                        {q.usage_percentage}%
                      </Text>
                    </View>
                    {q.task?.name && <Text style={{ fontSize: 10, color: '#9CA3AF' }}>📌 {q.task.name}</Text>}
                    <View style={s.progressBar}>
                      <View style={[s.progressFill, { width: `${Math.min(q.usage_percentage, 100)}%` as any, backgroundColor: q.is_exceeded ? '#EF4444' : q.usage_percentage >= 80 ? '#F59E0B' : '#10B981' }]} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>KH: {fmtQty(q.planned_quantity)} {q.unit}</Text>
                      <Text style={{ fontSize: 11, color: '#374151', fontWeight: '600' }}>TT: {fmtQty(q.actual_quantity)} {q.unit}</Text>
                    </View>
                  </View>
                ))}
                {!quotas.quotas?.length && <Text style={s.empty}>Chưa có định mức</Text>}
              </View>
            )}

            {tab === 'warnings' && (
              <View style={s.section}>
                <View style={s.row}>
                  <StatCard color="#EF4444" label="Nghiêm trọng" value={String(warnings.critical || 0)} />
                  <StatCard color="#F59E0B" label="Cao" value={String(warnings.high || 0)} />
                  <StatCard color="#3B82F6" label="Tổng" value={String(warnings.total_warnings || 0)} />
                </View>
                {(warnings.warnings || []).map((w: MaterialWarning, idx: number) => (
                  <View key={idx} style={[s.listItem, { borderLeftWidth: 3, borderLeftColor: w.severity === 'critical' ? '#EF4444' : w.severity === 'high' ? '#F59E0B' : '#3B82F6' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#111' }}>{w.message}</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                      {w.type === 'low_stock' ? 'Tồn kho' : 'Định mức'} • {w.severity === 'critical' ? '🔴' : w.severity === 'high' ? '🟠' : '🟡'} {w.severity}
                    </Text>
                  </View>
                ))}
                {!warnings.warnings?.length && <Text style={s.empty}>Không có cảnh báo 🎉</Text>}
              </View>
            )}

            {tab === 'history' && (
              <View style={s.section}>
                {history.length ? history.map((tx: any) => (
                  <View key={tx.id} style={s.listItem}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.listTitle}>{tx.material?.name || '—'}</Text>
                      <View style={[s.badge, { backgroundColor: tx.type === 'import' ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: tx.type === 'import' ? '#065F46' : '#991B1B' }}>
                          {tx.type === 'import' ? '↓ Nhập' : '↑ Xuất'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#374151' }}>SL: {fmtQty(tx.quantity)}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>{tx.transaction_date}</Text>
                    </View>
                    {tx.warehouse_location && <Text style={{ fontSize: 10, color: '#9CA3AF' }}>📍 {tx.warehouse_location}</Text>}
                  </View>
                )) : <Text style={s.empty}>Chưa có lịch sử</Text>}
              </View>
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const StatCard = ({ color, label, value }: { color: string; label: string; value: string }) => (
  <View style={[s.statCard, { borderColor: color + '40' }]}>
    <Text style={{ fontSize: 18, fontWeight: '700', color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: color + 'CC', marginTop: 2 }}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  tabBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  tabTxt: { fontSize: 12, color: '#374151', fontWeight: '500' },
  tabTxtActive: { color: '#FFF', fontWeight: '700' },
  section: { padding: 12, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1 },
  listItem: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  listTitle: { fontSize: 13, fontWeight: '600', color: '#111' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 6, overflow: 'hidden' as const },
  progressFill: { height: '100%' as any, borderRadius: 3 },
  empty: { textAlign: 'center' as const, color: '#9CA3AF', paddingVertical: 32, fontSize: 13 },
});
