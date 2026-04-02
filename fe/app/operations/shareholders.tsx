import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components';
import { operationsApi, Shareholder } from '@/api/operationsApi';
import { formatVND } from '@/utils/format';

export default function ShareholdersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [totalCapital, setTotalCapital] = useState(0);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    contributed_amount: '',
    share_percentage: '',
    phone: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const response = await operationsApi.getShareholders();
      if (response.success) {
        setShareholders(response.data);
        setTotalCapital(response.total_capital);
      }
    } catch (error) {
      console.error('Error fetching shareholders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({ name: '', contributed_amount: '', share_percentage: '', phone: '', notes: '' });
    setModalVisible(true);
  };

  const handleOpenEdit = (item: Shareholder) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      contributed_amount: item.contributed_amount.toString(),
      share_percentage: item.share_percentage.toString(),
      phone: item.phone || '',
      notes: item.notes || '',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.contributed_amount || !form.share_percentage) {
      Alert.alert('Lỗi', 'Vui lòng điền đủ Tên, Số tiền và Tỷ lệ');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...form,
        contributed_amount: parseFloat(form.contributed_amount),
        share_percentage: parseFloat(form.share_percentage),
      };

      let response;
      if (editingId) {
        response = await operationsApi.updateShareholder(editingId, data);
      } else {
        response = await operationsApi.createShareholder(data);
      }

      if (response.success) {
        setModalVisible(false);
        fetchData();
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa cổ đông này?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Xóa', 
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await operationsApi.deleteShareholder(id);
            if (res.success) fetchData();
          } catch (e) { Alert.alert('Lỗi', 'Không thể xóa'); }
        }
      }
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Quản Lý Cổ Đông" showBackButton onBack={() => router.back()} />
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Tổng vốn điều lệ</Text>
        <Text style={styles.summaryValue}>{formatVND(totalCapital)}</Text>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        <View style={styles.list}>
          {shareholders.map((item) => (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity style={styles.cardMain} onPress={() => handleOpenEdit(item)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.percentageBadge}>
                    <Text style={styles.percentageText}>{item.share_percentage}%</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vốn góp:</Text>
                    <Text style={styles.value}>{formatVND(item.contributed_amount)}</Text>
                  </View>
                  {item.phone && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Số điện thoại:</Text>
                      <Text style={styles.value}>{item.phone}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* MODAL FORM */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Sửa Cổ Đông' : 'Thêm Cổ Đông'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <Text style={styles.inputLabel}>Tên Cổ Đông</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({...form, name: t})} placeholder="Nhập tên..." />

              <Text style={styles.inputLabel}>Số tiền góp vốn (VNĐ)</Text>
              <TextInput style={styles.input} value={form.contributed_amount} onChangeText={(t) => setForm({...form, contributed_amount: t})} placeholder="Ví dụ: 1000000000" keyboardType="numeric" />

              <Text style={styles.inputLabel}>Tỷ lệ cổ phần (%)</Text>
              <TextInput style={styles.input} value={form.share_percentage} onChangeText={(t) => setForm({...form, share_percentage: t})} placeholder="Ví dụ: 10" keyboardType="numeric" />

              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} placeholder="Nhập SĐT..." keyboardType="phone-pad" />

              <Text style={styles.inputLabel}>Ghi chú</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={form.notes} onChangeText={(t) => setForm({...form, notes: t})} placeholder="Ghi chú thêm..." multiline />
            </ScrollView>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{editingId ? 'Cập Nhật' : 'Lưu'}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    backgroundColor: '#FFFFFF', padding: 20, margin: 16, borderRadius: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  summaryLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#10B981' },
  scroll: { flex: 1 },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardMain: { flex: 1, padding: 16 },
  deleteBtn: { padding: 16, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  percentageBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  percentageText: { color: '#1E40AF', fontWeight: '700', fontSize: 12 },
  cardBody: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13, color: '#6B7280' },
  value: { fontSize: 13, fontWeight: '600', color: '#374151' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 4 },
  },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  form: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  submitBtn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  scrollContent: { paddingBottom: 100 },
});
