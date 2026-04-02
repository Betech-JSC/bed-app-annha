import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components';
import { operationsApi, CompanyAsset } from '@/api/operationsApi';
import { formatVND } from '@/utils/format';

export default function AssetsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [search, setSearch] = useState('');

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    asset_code: '',
    category: 'other',
    purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    useful_life_months: '36',
    status: 'in_stock',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const response = await operationsApi.getAssets({ search });
      if (response.success) {
        setAssets(response.data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      name: '',
      asset_code: '',
      category: 'other',
      purchase_price: '',
      purchase_date: new Date().toISOString().split('T')[0],
      useful_life_months: '36',
      status: 'in_stock',
    });
    setModalVisible(true);
  };

  const handleOpenEdit = (item: CompanyAsset) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      asset_code: item.asset_code,
      category: item.category,
      purchase_price: item.purchase_price.toString(),
      purchase_date: item.purchase_date,
      useful_life_months: item.useful_life_months.toString(),
      status: item.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.purchase_price) {
        Alert.alert('Lỗi', 'Vui lòng điền đủ Tên và Giá mua');
        return;
    }

    setSubmitting(true);
    try {
        const data = {
            ...form,
            category: form.category as any, // Cast to any to bypass union type strictness if necessary or cast to the specific Union type
            purchase_price: parseFloat(form.purchase_price),
            useful_life_months: parseInt(form.useful_life_months),
        };

        let response;
        if (editingId) {
            response = await operationsApi.updateAsset(editingId, data as any);
        } else {
            response = await operationsApi.createAsset(data as any);
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
    Alert.alert('Xác nhận', 'Xóa tài sản này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await operationsApi.deleteAsset(id);
            fetchData();
          } catch (e) { Alert.alert('Lỗi', 'Không thể xóa'); }
        }
      }
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_use': return '#10B981';
      case 'in_stock': return '#3B82F6';
      case 'under_repair': return '#F59E0B';
      case 'disposed': return '#EF4444';
      default: return '#6B7280';
    }
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
      <ScreenHeader title="Quản Lý Tài Sản" showBackButton onBack={() => router.back()} />
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên, mã tài sản..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        <View style={styles.list}>
          {assets.map((item) => (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity style={styles.cardMain} onPress={() => handleOpenEdit(item)}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.assetCode}>{item.asset_code}</Text>
                    <Text style={styles.name}>{item.name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Giá hiện tại:</Text>
                    <Text style={styles.value}>{formatVND(item.current_value)}</Text>
                  </View>
                  {item.assigned_user && (
                      <View style={styles.row}>
                          <Text style={styles.label}>Đang giữ:</Text>
                          <Text style={styles.value}>{item.assigned_user.name}</Text>
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

      {/* FORM MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Sửa Tài Sản' : 'Thêm Tài Sản'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <Text style={styles.inputLabel}>Tên Tài Sản</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({...form, name: t})} placeholder="Ví dụ: Máy tính Dell XPS..." />

              <Text style={styles.inputLabel}>Giá Mua (VNĐ)</Text>
              <TextInput style={styles.input} value={form.purchase_price} onChangeText={(t) => setForm({...form, purchase_price: t})} placeholder="Ví dụ: 25000000" keyboardType="numeric" />

              <Text style={styles.inputLabel}>Thời gian khấu hao (Tháng)</Text>
              <TextInput style={styles.input} value={form.useful_life_months} onChangeText={(t) => setForm({...form, useful_life_months: t})} placeholder="Ví dụ: 36" keyboardType="numeric" />

              <Text style={styles.inputLabel}>Loại tài sản</Text>
              <View style={styles.categoryPicker}>
                {['computer', 'machinery', 'vehicle', 'office', 'other'].map((cat) => (
                    <TouchableOpacity 
                        key={cat} 
                        style={[styles.catItem, form.category === cat && styles.catItemActive]}
                        onPress={() => setForm({...form, category: cat as any})}
                    >
                        <Text style={[styles.catText, form.category === cat && styles.catTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Lưu Tài Sản</Text>}
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', margin: 16, paddingHorizontal: 12, height: 48, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1F2937' },
  scroll: { flex: 1 },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardMain: { flex: 1, padding: 12 },
  deleteBtn: { padding: 16, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  assetCode: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  cardBody: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, color: '#6B7280' },
  value: { fontSize: 12, fontWeight: '600', color: '#374151' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 4 },
  },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  form: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 15 },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  catItemActive: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
  catText: { fontSize: 12, color: '#4B5563' },
  catTextActive: { color: '#2563EB', fontWeight: '700' },
  submitBtn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  scrollContent: { paddingBottom: 100 },
});
