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
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";

export default function CostGroupsScreen() {
  const router = useRouter();
  const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CostGroup | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadCostGroups();
  }, []);

  const loadCostGroups = async () => {
    try {
      setLoading(true);
      const response = await costGroupApi.getCostGroups();
      if (response.success) {
        setCostGroups(response.data || []);
      }
    } catch (error) {
      console.error("Error loading cost groups:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCostGroups();
  };

  const handleCreate = () => {
    setEditingGroup(null);
    setFormData({
      code: "",
      name: "",
      description: "",
      sort_order: costGroups.length,
      is_active: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (group: CostGroup) => {
    setEditingGroup(group);
    setFormData({
      code: group.code,
      name: group.name,
      description: group.description || "",
      sort_order: group.sort_order,
      is_active: group.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      if (editingGroup) {
        await costGroupApi.updateCostGroup(editingGroup.id, formData);
        Alert.alert("Thành công", "Nhóm chi phí đã được cập nhật");
      } else {
        await costGroupApi.createCostGroup(formData);
        Alert.alert("Thành công", "Nhóm chi phí đã được tạo");
      }
      setModalVisible(false);
      loadCostGroups();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = (group: CostGroup) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa nhóm chi phí "${group.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await costGroupApi.deleteCostGroup(group.id);
              Alert.alert("Thành công", "Nhóm chi phí đã được xóa");
              loadCostGroups();
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
            }
          },
        },
      ]
    );
  };

  const renderCostGroupItem = ({ item }: { item: CostGroup }) => (
    <View style={styles.costGroupCard}>
      <View style={styles.costGroupContent}>
        <View style={styles.costGroupHeader}>
          <Text style={styles.costGroupName}>{item.name}</Text>
          <View style={styles.costGroupBadges}>
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
        </View>
        <Text style={styles.costGroupCode}>Mã: {item.code}</Text>
        {item.description && (
          <Text style={styles.costGroupDescription}>{item.description}</Text>
        )}
      </View>
      <View style={styles.costGroupActions}>
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
        <Text style={styles.headerTitle}>Nhóm Chi Phí Dự Án</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreate}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={costGroups}
        renderItem={renderCostGroupItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhóm chi phí nào</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreate}
            >
              <Text style={styles.emptyButtonText}>Tạo nhóm chi phí đầu tiên</Text>
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
              {editingGroup ? "Chỉnh Sửa Nhóm Chi Phí" : "Tạo Nhóm Chi Phí Mới"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Mã nhóm <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.code}
                onChangeText={(text) =>
                  setFormData({ ...formData, code: text.toLowerCase().replace(/\s+/g, "_") })
                }
                placeholder="construction_materials"
                editable={!editingGroup}
              />
              <Text style={styles.helperText}>
                Mã nhóm dùng để định danh (không dấu, không khoảng trắng)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Tên nhóm <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Vật liệu xây dựng"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Mô tả về nhóm chi phí này"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Thứ tự hiển thị</Text>
              <TextInput
                style={styles.input}
                value={formData.sort_order.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, sort_order: parseInt(text) || 0 })
                }
                placeholder="0"
                keyboardType="numeric"
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
                  {editingGroup ? "Cập Nhật" : "Tạo Mới"}
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
  costGroupCard: {
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
  costGroupContent: {
    flex: 1,
  },
  costGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  costGroupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  costGroupBadges: {
    flexDirection: "row",
    gap: 8,
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
  costGroupCode: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  costGroupDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  costGroupActions: {
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
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
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

