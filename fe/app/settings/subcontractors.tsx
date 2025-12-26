import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { globalSubcontractorApi, GlobalSubcontractor } from "@/api/globalSubcontractorApi";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/components/BackButton";

export default function SubcontractorsScreen() {
  const router = useRouter();
  const [subcontractors, setSubcontractors] = useState<GlobalSubcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<GlobalSubcontractor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    description: "",
    tax_code: "",
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSubcontractors();
  }, []);

  const loadSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await globalSubcontractorApi.getGlobalSubcontractors({
        search: searchQuery || undefined,
      });
      if (response.success) {
        const data = response.data?.data || response.data || [];
        setSubcontractors(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      console.error("Error loading subcontractors:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách nhà thầu phụ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSubcontractors();
  };

  const handleCreate = () => {
    setEditingSubcontractor(null);
    setFormData({
      name: "",
      category: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      description: "",
      tax_code: "",
    });
    setModalVisible(true);
  };

  const handleEdit = (subcontractor: GlobalSubcontractor) => {
    setEditingSubcontractor(subcontractor);
    setFormData({
      name: subcontractor.name || "",
      category: subcontractor.category || "",
      contact_person: subcontractor.contact_person || "",
      phone: subcontractor.phone || "",
      email: subcontractor.email || "",
      address: subcontractor.address || "",
      description: subcontractor.description || "",
      tax_code: subcontractor.tax_code || "",
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa nhà thầu phụ này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await globalSubcontractorApi.deleteGlobalSubcontractor(id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa nhà thầu phụ");
                loadSubcontractors();
              } else {
                Alert.alert("Lỗi", response.message || "Không thể xóa nhà thầu phụ");
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa nhà thầu phụ");
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhà thầu phụ");
      return;
    }

    try {
      setSaving(true);
      const response = editingSubcontractor
        ? await globalSubcontractorApi.updateGlobalSubcontractor(editingSubcontractor.id, formData)
        : await globalSubcontractorApi.createGlobalSubcontractor(formData);

      if (response.success) {
        Alert.alert("Thành công", editingSubcontractor ? "Đã cập nhật nhà thầu phụ" : "Đã tạo nhà thầu phụ");
        setModalVisible(false);
        loadSubcontractors();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể lưu nhà thầu phụ");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể lưu nhà thầu phụ");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: GlobalSubcontractor }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.category && (
            <Text style={styles.itemCategory}>{item.category}</Text>
          )}
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="create-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      {(item.contact_person || item.phone || item.email) && (
        <View style={styles.itemDetails}>
          {item.contact_person && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text style={styles.detailText}>{item.contact_person}</Text>
            </View>
          )}
          {item.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color="#6B7280" />
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          )}
          {item.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={14} color="#6B7280" />
              <Text style={styles.detailText}>{item.email}</Text>
            </View>
          )}
        </View>
      )}
      {item.description && (
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Nhà Thầu Phụ</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm nhà thầu phụ..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
          }}
          onSubmitEditing={() => {
            loadSubcontractors();
          }}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => {
            setSearchQuery("");
            loadSubcontractors();
          }}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={subcontractors}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhà thầu phụ nào</Text>
            <Text style={styles.emptySubtext}>Nhấn nút + để thêm nhà thầu phụ mới</Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSubcontractor ? "Chỉnh Sửa Nhà Thầu Phụ" : "Thêm Nhà Thầu Phụ"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tên nhà thầu phụ <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên nhà thầu phụ"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Hạng mục</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Xây dựng, Điện, Nước..."
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
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả (tùy chọn)"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  itemCard: {
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
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: "#6B7280",
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  itemDetails: {
    marginTop: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: "#6B7280",
  },
  itemDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    padding: 20,
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
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

