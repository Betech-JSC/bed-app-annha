import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supplierApi, Supplier, CreateSupplierData } from "@/api/supplierApi";
import { ScreenHeader } from "@/components";

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: "",
    code: "",
    category: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    tax_code: "",
    bank_name: "",
    bank_account: "",
    bank_account_holder: "",
    description: "",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, [searchQuery]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierApi.getSuppliers({
        search: searchQuery || undefined,
      });
      if (response.success) {
        setSuppliers(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
  };

  const handleCreate = async () => {
    if (!formData.name) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhà cung cấp");
      return;
    }

    try {
      setSubmitting(true);
      const response = editingSupplier
        ? await supplierApi.updateSupplier(editingSupplier.id, formData)
        : await supplierApi.createSupplier(formData);

      if (response.success) {
        Alert.alert("Thành công", editingSupplier ? "Đã cập nhật nhà cung cấp" : "Đã tạo nhà cung cấp thành công");
        setShowCreateModal(false);
        resetForm();
        loadSuppliers();
      }
    } catch (error: any) {
      const errorMessage = error.userMessage || error.response?.data?.message || "Không thể thực hiện thao tác";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      code: supplier.code || "",
      category: supplier.category || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      tax_code: supplier.tax_code || "",
      bank_name: supplier.bank_name || "",
      bank_account: supplier.bank_account || "",
      bank_account_holder: supplier.bank_account_holder || "",
      description: supplier.description || "",
      status: supplier.status,
    });
    setShowCreateModal(true);
  };

  const handleDelete = (supplier: Supplier) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa nhà cung cấp "${supplier.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await supplierApi.deleteSupplier(supplier.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa nhà cung cấp");
                loadSuppliers();
              }
            } catch (error: any) {
              const errorMessage = error.userMessage || error.response?.data?.message || "Không thể xóa nhà cung cấp";
              Alert.alert("Lỗi", errorMessage);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      code: "",
      category: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      tax_code: "",
      bank_name: "",
      bank_account: "",
      bank_account_holder: "",
      description: "",
      status: "active",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const renderItem = ({ item }: { item: Supplier }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.code && <Text style={styles.cardCode}>Mã: {item.code}</Text>}
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "active"
                  ? "#10B98120"
                  : item.status === "blacklisted"
                  ? "#EF444420"
                  : "#6B728020",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === "active"
                    ? "#10B981"
                    : item.status === "blacklisted"
                    ? "#EF4444"
                    : "#6B7280",
              },
            ]}
          >
            {item.status === "active"
              ? "Hoạt động"
              : item.status === "blacklisted"
              ? "Đen"
              : "Ngừng hoạt động"}
          </Text>
        </View>
      </View>
      {item.category && (
        <Text style={styles.categoryText}>Loại: {item.category}</Text>
      )}
      {item.contact_person && (
        <Text style={styles.contactText}>Liên hệ: {item.contact_person}</Text>
      )}
      {item.phone && <Text style={styles.contactText}>ĐT: {item.phone}</Text>}
      <View style={styles.debtRow}>
        <Text style={styles.debtLabel}>Công nợ:</Text>
        <Text style={styles.debtValue}>
          {formatCurrency(item.remaining_debt || 0)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/settings/suppliers/${item.id}`)}
        >
          <Ionicons name="stats-chart" size={20} color="#10B981" />
          <Text style={[styles.actionText, { color: "#10B981" }]}>
            Công nợ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={20} color="#3B82F6" />
          <Text style={styles.actionText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={20} color="#EF4444" />
          <Text style={[styles.actionText, styles.deleteText]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Nhà Cung Cấp"
        showBackButton
        rightComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm nhà cung cấp..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={suppliers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>Chưa có nhà cung cấp</Text>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSupplier ? "Sửa Nhà Cung Cấp" : "Tạo Nhà Cung Cấp"}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên nhà cung cấp *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên nhà cung cấp"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mã nhà cung cấp</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mã (tùy chọn)"
                  value={formData.code}
                  onChangeText={(text) => setFormData({ ...formData, code: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Loại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Vật liệu, Thiết bị, Dịch vụ..."
                  value={formData.category}
                  onChangeText={(text) => setFormData({ ...formData, category: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Người liên hệ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tên người liên hệ"
                  value={formData.contact_person}
                  onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Số điện thoại"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Địa chỉ</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Địa chỉ"
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mã số thuế</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mã số thuế"
                  value={formData.tax_code}
                  onChangeText={(text) => setFormData({ ...formData, tax_code: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên ngân hàng</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tên ngân hàng"
                  value={formData.bank_name}
                  onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Số tài khoản</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Số tài khoản"
                  value={formData.bank_account}
                  onChangeText={(text) => setFormData({ ...formData, bank_account: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Chủ tài khoản</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tên chủ tài khoản"
                  value={formData.bank_account_holder}
                  onChangeText={(text) => setFormData({ ...formData, bank_account_holder: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingSupplier ? "Cập Nhật" : "Tạo Mới"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardCode: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoryText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  contactText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  debtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  debtLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  debtValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
  },
  actionText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  deleteText: {
    color: "#EF4444",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
    paddingHorizontal: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

