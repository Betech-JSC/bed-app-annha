import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { financeApi } from '../../../src/api/financeApi';
import { ScreenHeader } from '../../../src/components/ScreenHeader';

const TABS = [
  { key: 'cashflow', label: 'Dòng tiền' },
  { key: 'pnl', label: 'Lãi / Lỗ' },
  { key: 'bva', label: 'NS vs TT' },
  { key: 'debt', label: 'Công nợ NTP' },
  { key: 'warranty', label: 'Bảo hành' },
];

const fmtMoney = (val: number | string | undefined) => {
  if (!val && val !== 0) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
};

const costCatLabels: Record<string, string> = {
  material: 'Vật tư', labor: 'Nhân công', equipment: 'Thiết bị',
  subcontractor: 'NTP', transportation: 'Vận chuyển', other: 'Khác',
};

export default function FinanceDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState('cashflow');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cashFlow, setCashFlow] = useState<any>({});
  const [pnl, setPnl] = useState<any>({});
  const [bva, setBva] = useState<any>({});
  const [debt, setDebt] = useState<any>({});
  const [warranty, setWarranty] = useState<any>({});

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [cfRes, plRes, bvaRes, debtRes, warRes] = await Promise.all([
        financeApi.getCashFlow(id as string),
        financeApi.getProfitLoss(id as string),
        financeApi.getBudgetVsActual(id as string),
        financeApi.getSubcontractorDebt(id as string),
        financeApi.getWarrantyRetentions(id as string),
      ]);
      setCashFlow(cfRes?.data || {});
      setPnl(plRes?.data || {});
      setBva(bvaRes?.data || {});
      setDebt(debtRes?.data || {});
      setWarranty(warRes?.data || {});
    } catch (e) { console.error('Finance load error', e); }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="💰 Tài Chính (Dòng tiền / P&L)" showBackButton />
      <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}>
        {/* Sub-tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[s.tabBtn, tab === t.key && s.tabBtnActive]}>
              <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} /> : (
          <>
            {/* CASH FLOW */}
            {tab === 'cashflow' && (
              <View style={s.section}>
                <View style={s.row}>
                  <Card color="#10B981" label="Tổng thu" value={fmtMoney(cashFlow.totals?.total_inflow)} />
                  <Card color="#EF4444" label="Tổng chi" value={fmtMoney(cashFlow.totals?.total_outflow)} />
                  <Card color={((cashFlow.totals?.net_cash_flow || 0) >= 0) ? '#3B82F6' : '#F59E0B'} label="Ròng" value={fmtMoney(cashFlow.totals?.net_cash_flow)} />
                </View>
                {(cashFlow.months || []).map((m: any) => (
                  <View key={m.month} style={s.listItem}>
                    <Text style={s.listTitle}>{m.label}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#10B981', fontSize: 11 }}>Thu: {fmtMoney(m.actual_inflow)}</Text>
                      <Text style={{ color: '#EF4444', fontSize: 11 }}>Chi: {fmtMoney(m.actual_outflow)}</Text>
                      <Text style={{ color: m.cumulative_actual_net >= 0 ? '#3B82F6' : '#F59E0B', fontSize: 11, fontWeight: '700' }}>Lũy kế: {fmtMoney(m.cumulative_actual_net)}</Text>
                    </View>
                  </View>
                ))}
                {!cashFlow.months?.length && <Text style={s.empty}>Chưa có dữ liệu dòng tiền</Text>}
              </View>
            )}

            {/* P/L */}
            {tab === 'pnl' && (
              <View style={s.section}>
                {pnl.revenue ? (
                  <>
                    <View style={[s.card, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                      <Text style={[s.cardHeader, { color: '#166534' }]}>📈 DOANH THU</Text>
                      <View style={s.row}>
                        <MiniStat label="Giá trị HĐ" value={fmtMoney(pnl.revenue.contract_value)} />
                        <MiniStat label="Phát sinh" value={fmtMoney(pnl.revenue.additional_value)} />
                      </View>
                      <View style={s.row}>
                        <MiniStat label="Tổng DT" value={fmtMoney(pnl.revenue.total_revenue)} bold />
                        <MiniStat label="Còn thu" value={fmtMoney(pnl.revenue.receivable)} color="#F59E0B" />
                      </View>
                    </View>

                    <View style={[s.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <Text style={[s.cardHeader, { color: '#991B1B' }]}>📉 CHI PHÍ</Text>
                      {pnl.costs?.by_category && Object.entries(pnl.costs.by_category).map(([cat, val]) => (
                        <View key={cat} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>{costCatLabels[cat] || cat}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '600' }}>{fmtMoney(val as number)}</Text>
                        </View>
                      ))}
                      <View style={{ borderTopWidth: 1, borderTopColor: '#FECACA', marginTop: 6, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '700', color: '#991B1B' }}>Tổng chi phí</Text>
                        <Text style={{ fontWeight: '700', color: '#991B1B' }}>{fmtMoney(pnl.costs.total_costs)}</Text>
                      </View>
                    </View>

                    <View style={[s.card, { backgroundColor: pnl.profit_loss?.net_profit >= 0 ? '#EFF6FF' : '#FFFBEB', borderColor: pnl.profit_loss?.net_profit >= 0 ? '#93C5FD' : '#FDE68A', borderWidth: 2 }]}>
                      <Text style={[s.cardHeader, { color: pnl.profit_loss?.net_profit >= 0 ? '#1D4ED8' : '#92400E' }]}>
                        {pnl.profit_loss?.net_profit >= 0 ? '✅ LÃI' : '⚠️ LỖ'}
                      </Text>
                      <View style={s.row}>
                        <MiniStat label="Lãi gộp" value={fmtMoney(pnl.profit_loss?.gross_profit)} bold />
                        <MiniStat label="Biên gộp" value={`${pnl.profit_loss?.gross_margin}%`} />
                      </View>
                      <View style={s.row}>
                        <MiniStat label="Lãi ròng" value={fmtMoney(pnl.profit_loss?.net_profit)} bold />
                        <MiniStat label="Biên ròng" value={`${pnl.profit_loss?.net_margin}%`} />
                      </View>
                    </View>
                  </>
                ) : <Text style={s.empty}>Chưa có dữ liệu P/L</Text>}
              </View>
            )}

            {/* Budget vs Actual */}
            {tab === 'bva' && (
              <View style={s.section}>
                {bva.items?.length ? (
                  <>
                    <View style={s.row}>
                      <Card color="#3B82F6" label="Ngân sách" value={fmtMoney(bva.summary?.total_budget)} />
                      <Card color="#8B5CF6" label="Thực chi" value={fmtMoney(bva.summary?.total_actual)} />
                      <Card color={(bva.summary?.variance || 0) >= 0 ? '#10B981' : '#EF4444'} label="Chênh lệch" value={`${bva.summary?.variance_pct}%`} />
                    </View>
                    {bva.items.map((item: any) => (
                      <View key={item.id} style={s.listItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={s.listTitle}>{item.name}</Text>
                          <View style={[s.badge, { backgroundColor: item.status === 'under_budget' ? '#D1FAE5' : '#FEE2E2' }]}>
                            <Text style={{ fontSize: 10, color: item.status === 'under_budget' ? '#065F46' : '#991B1B' }}>{item.status === 'under_budget' ? 'Trong NS' : 'Vượt NS'}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: '#3B82F6' }}>NS: {fmtMoney(item.budget_amount)}</Text>
                          <Text style={{ fontSize: 11, color: '#8B5CF6' }}>TT: {fmtMoney(item.actual_amount)}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: item.variance >= 0 ? '#10B981' : '#EF4444' }}>{fmtMoney(item.variance)}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                ) : <Text style={s.empty}>Chưa có dữ liệu ngân sách</Text>}
              </View>
            )}

            {/* Subcontractor Debt */}
            {tab === 'debt' && (
              <View style={s.section}>
                {debt.subcontractors?.length ? (
                  <>
                    <View style={s.row}>
                      <Card color="#3B82F6" label="Tổng HĐ" value={fmtMoney(debt.summary?.total_contract)} />
                      <Card color="#10B981" label="Đã TT" value={fmtMoney(debt.summary?.total_paid)} />
                      <Card color="#F59E0B" label="Còn lại" value={fmtMoney(debt.summary?.total_remaining)} />
                    </View>
                    {debt.subcontractors.map((sub: any) => (
                      <View key={sub.id} style={s.listItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={s.listTitle}>{sub.name}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: sub.paid_pct >= 100 ? '#10B981' : '#3B82F6' }}>{sub.paid_pct}%</Text>
                        </View>
                        <View style={[s.progressBar]}>
                          <View style={[s.progressFill, { width: `${Math.min(sub.paid_pct, 100)}%`, backgroundColor: sub.paid_pct >= 100 ? '#10B981' : '#3B82F6' }]} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>Đã TT: {fmtMoney(sub.total_paid)}</Text>
                          <Text style={{ fontSize: 11, color: '#F59E0B' }}>Còn: {fmtMoney(sub.remaining)}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                ) : <Text style={s.empty}>Chưa có nhà thầu phụ</Text>}
              </View>
            )}

            {/* Warranty */}
            {tab === 'warranty' && (
              <View style={s.section}>
                {warranty.retentions?.length ? (
                  warranty.retentions.map((ret: any) => (
                    <View key={ret.id} style={s.listItem}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.listTitle}>{ret.subcontractor?.name || '—'}</Text>
                        <View style={[s.badge, { backgroundColor: ret.release_status === 'released' ? '#D1FAE5' : '#E5E7EB' }]}>
                          <Text style={{ fontSize: 10 }}>{ret.release_status === 'released' ? 'Đã giải phóng' : ret.release_status === 'partial_release' ? 'Một phần' : 'Đang giữ'}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        Giữ: {fmtMoney(ret.retention_amount)} ({ret.retention_percentage}%)
                      </Text>
                    </View>
                  ))
                ) : <Text style={s.empty}>Chưa có bảo hành</Text>}
              </View>
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const Card = ({ color, label, value }: { color: string; label: string; value: string }) => (
  <View style={[s.statCard, { borderColor: color + '40' }]}>
    <Text style={{ fontSize: 16, fontWeight: '700', color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: color + 'CC', marginTop: 2 }}>{label}</Text>
  </View>
);

const MiniStat = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
  <View style={{ flex: 1, paddingVertical: 4 }}>
    <Text style={{ fontSize: 10, color: '#6B7280' }}>{label}</Text>
    <Text style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? '700' : '600', color: color || '#111' }}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 8 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  tabBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  tabTxt: { fontSize: 12, color: '#374151', fontWeight: '500' },
  tabTxtActive: { color: '#FFF', fontWeight: '700' },
  section: { padding: 12, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 0 },
  cardHeader: { fontSize: 13, fontWeight: '800', marginBottom: 10 },
  listItem: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  listTitle: { fontSize: 13, fontWeight: '600', color: '#111' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  empty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 32, fontSize: 13 },
});
