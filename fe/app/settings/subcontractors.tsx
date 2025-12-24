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

export default function GlobalSubcontractorsScreen() {
  const router = useRouter();
  const [subcontractors, setSubcontractors] = useState<GlobalSubcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<GlobalSubcontractor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    tax_code: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    loadSubcontractors();
  }, []);

  const loadSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await globalSubcontractorApi.getGlobalSubcontractors({ active_only: false });
      if (response.success) {
        // Backend trả về paginated data khi active_only = false
        let data = [];
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        setSubcontractors(data);
      }
    } catch (error) {
      console.error("Error loading subcontractors:", error);
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
      code: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      tax_code: "",
      notes: "",
      is_active: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (subcontractor: GlobalSubcontractor) => {
    setEditingSubcontractor(subcontractor);
    setFormData({
      name: subcontractor.name,
      code: subcontractor.code || "",
      contact_person: subcontractor.contact_person || "",
      phone: subcontractor.phone || "",
      email: subcontractor.email || "",
      address: subcontractor.address || "",
      tax_code: subcontractor.tax_code || "",
      notes: subcontractor.notes || "",
      is_active: subcontractor.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhà thầu phụ");
      return;
    }

    try {
      if (editingSubcontractor) {
        await globalSubcontractorApi.updateGlobalSubcontractor(editingSubcontractor.id, formData);
        Alert.alert("Thành công", "Nhà thầu phụ đã được cập nhật");
      } else {
        await globalSubcontractorApi.createGlobalSubcontractor(formData);
        Alert.alert("Thành công", "Nhà thầu phụ đã được tạo");
      }
      setModalVisible(false);
      loadSubcontractors();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = (subcontractor: GlobalSubcontractor) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa nhà thầu phụ "${subcontractor.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await globalSubcontractorApi.deleteGlobalSubcontractor(subcontractor.id);
              Alert.alert("Thành công", "Nhà thầu phụ đã được xóa");
              loadSubcontractors();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
            }
          },
        },
      ]
    );
  };

  const renderSubcontractorItem = ({ item }: { item: GlobalSubcontractor }) => (
    <View style={styles.subcontractorCard}>
      <View style={styles.subcontractorContent}>
        <View style={styles.subcontractorHeader}>
          <Text style={styles.subcontractorName}>{item.name}</Text>
          <View
            style={[
              styles.badge,
              item.is_active ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                item.is_active ? styles.activeBadgeText : styles.inactiveBadgeText,
              ]}
            >
              {item.is_active ? "Hoạt động" : "Tạm dừng"}
            </Text>
          </View>
        </View>
        {item.code && (
          <Text style={styles.subcontractorCode}>Mã: {item.code}</Text>
        )}
        {item.contact_person && (
          <Text style={styles.subcontractorInfo}>
            <Ionicons name="person-outline" size={14} color="#6B7280" /> {item.contact_person}
          </Text>
        )}
        {item.phone && (
          <Text style={styles.subcontractorInfo}>
            <Ionicons name="call-outline" size={14} color="#6B7280" /> {item.phone}
          </Text>
        )}
      </View>
      <View style={styles.subcontractorActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="create-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhà Thầu Phụ</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreate}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={subcontractors}
        renderItem={renderSubcontractorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhà thầu phụ nào</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreate}
            >
              <Text style={styles.emptyButtonText}>Tạo nhà thầu phụ đầu tiên</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSubcontractor ? "Chỉnh Sửa Nhà Thầu Phụ" : "Tạo Nhà Thầu Phụ Mới"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Tên nhà thầu phụ <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Công ty ABC"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mã nhà thầu</Text>
              <TextInput
                style={styles.input}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text })}
                placeholder="ABC001"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Người liên hệ</Text>
              <TextInput
                style={styles.input}
                value={formData.contact_person}
                onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
                placeholder="Nguyễn Văn A"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="0901234567"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="contact@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Địa chỉ</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mã số thuế</Text>
              <TextInput
                style={styles.input}
                value={formData.tax_code}
                onChangeText={(text) => setFormData({ ...formData, tax_code: text })}
                placeholder="0123456789"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Ghi chú về nhà thầu phụ"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() =>
                  setFormData({ ...formData, is_active: !formData.is_active })
                }
              >
                <Text style={styles.label}>Trạng thái hoạt động</Text>
                <View
                  style={[
                    styles.switch,
                    formData.is_active && styles.switchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      formData.is_active && styles.switchThumbActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.saveButtonText}>
                  {editingSubcontractor ? "Cập Nhật" : "Tạo Mới"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  subcontractorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subcontractorContent: {
    flex: 1,
  },
  subcontractorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subcontractorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadge: {
    backgroundColor: "#D1FAE5",
  },
  inactiveBadge: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  activeBadgeText: {
    color: "#065F46",
  },
  inactiveBadgeText: {
    color: "#991B1B",
  },
  subcontractorCode: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  subcontractorInfo: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  subcontractorActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
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
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    padding: 2,
  },
  switchActive: {
    backgroundColor: "#3B82F6",
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    transform: [{ translateX: 0 }],
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

