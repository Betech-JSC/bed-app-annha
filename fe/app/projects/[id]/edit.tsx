import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { projectApi, CreateProjectData, Project } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export default function EditProjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [customers, setCustomers] = useState<User[]>([]);
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");

  const [formData, setFormData] = useState<CreateProjectData>({
    name: "",
    code: "",
    description: "",
    customer_id: 0,
    project_manager_id: undefined,
    start_date: undefined,
    end_date: undefined,
    status: "planning",
  });

  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    loadProject();
    loadCustomers();
    loadProjectManagers();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProject(id!);
      if (response.success) {
        const project: Project = response.data;
        setFormData({
          name: project.name || "",
          code: project.code || "",
          description: project.description || "",
          customer_id: project.customer_id,
          project_manager_id: project.project_manager_id,
          start_date: project.start_date,
          end_date: project.end_date,
          status: project.status,
        });

        if (project.customer) {
          setSelectedCustomer(project.customer);
        }
        if (project.project_manager) {
          setSelectedManager(project.project_manager);
        }
        if (project.start_date) {
          setStartDate(new Date(project.start_date));
        }
        if (project.end_date) {
          setEndDate(new Date(project.end_date));
        }
      }
    } catch (error) {
      console.error("Error loading project:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin dự án.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await projectApi.getCustomers();
      if (response.success) {
        setCustomers(response.data || []);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadProjectManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await projectApi.getProjectManagers();
      if (response.success) {
        setProjectManagers(response.data || []);
      }
    } catch (error) {
      console.error("Error loading project managers:", error);
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleSelectCustomer = (customer: User) => {
    setSelectedCustomer(customer);
    setFormData({ ...formData, customer_id: customer.id });
    setShowCustomerModal(false);
    setCustomerSearch("");
  };

  const handleSelectManager = (manager: User) => {
    setSelectedManager(manager);
    setFormData({ ...formData, project_manager_id: manager.id });
    setShowManagerModal(false);
    setManagerSearch("");
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      setFormData({
        ...formData,
        start_date: selectedDate.toISOString().split("T")[0],
      });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setFormData({
        ...formData,
        end_date: selectedDate.toISOString().split("T")[0],
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên dự án.");
      return;
    }

    if (!formData.customer_id) {
      Alert.alert("Lỗi", "Vui lòng chọn khách hàng.");
      return;
    }

    try {
      setSaving(true);
      const response = await projectApi.updateProject(id!, formData);
      if (response.success) {
        Alert.alert("Thành công", "Dự án đã được cập nhật.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật dự án."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredManagers = projectManagers.filter(
    (manager) =>
      manager.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
      manager.email.toLowerCase().includes(managerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh Sửa Dự Án</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Tên dự án <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tên dự án"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mã dự án</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập mã dự án (tùy chọn)"
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhập mô tả dự án"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Khách hàng <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCustomerModal(true)}
          >
            <Text
              style={[
                styles.selectButtonText,
                !selectedCustomer && styles.placeholderText,
              ]}
            >
              {selectedCustomer
                ? `${selectedCustomer.name} (${selectedCustomer.email})`
                : "Chọn khách hàng"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quản lý dự án</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowManagerModal(true)}
          >
            <Text
              style={[
                styles.selectButtonText,
                !selectedManager && styles.placeholderText,
              ]}
            >
              {selectedManager
                ? `${selectedManager.name} (${selectedManager.email})`
                : "Chọn quản lý dự án (tùy chọn)"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày bắt đầu</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text
              style={[
                styles.selectButtonText,
                !formData.start_date && styles.placeholderText,
              ]}
            >
              {formData.start_date
                ? new Date(formData.start_date).toLocaleDateString("vi-VN")
                : "Chọn ngày bắt đầu"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày kết thúc</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text
              style={[
                styles.selectButtonText,
                !formData.end_date && styles.placeholderText,
              ]}
            >
              {formData.end_date
                ? new Date(formData.end_date).toLocaleDateString("vi-VN")
                : "Chọn ngày kết thúc"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={handleEndDateChange}
              minimumDate={formData.start_date ? new Date(formData.start_date) : undefined}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Trạng thái</Text>
          <View style={styles.statusButtons}>
            {[
              { value: "planning", label: "Lập kế hoạch" },
              { value: "in_progress", label: "Đang thi công" },
              { value: "completed", label: "Hoàn thành" },
              { value: "cancelled", label: "Đã hủy" },
            ].map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.statusButton,
                  formData.status === status.value && styles.statusButtonActive,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    status: status.value as any,
                  })
                }
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status === status.value &&
                      styles.statusButtonTextActive,
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Cập nhật dự án</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Customer Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn khách hàng</Text>
              <TouchableOpacity
                onPress={() => setShowCustomerModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm khách hàng..."
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />
            {loadingCustomers ? (
              <ActivityIndicator style={styles.modalLoading} />
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleSelectCustomer(item)}
                  >
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemEmail}>{item.email}</Text>
                      {item.phone && (
                        <Text style={styles.modalItemPhone}>{item.phone}</Text>
                      )}
                    </View>
                    {selectedCustomer?.id === item.id && (
                      <Ionicons name="checkmark" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalEmptyText}>
                    Không tìm thấy khách hàng
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Manager Modal */}
      <Modal
        visible={showManagerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManagerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn quản lý dự án</Text>
              <TouchableOpacity
                onPress={() => setShowManagerModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm quản lý dự án..."
              value={managerSearch}
              onChangeText={setManagerSearch}
            />
            {loadingManagers ? (
              <ActivityIndicator style={styles.modalLoading} />
            ) : (
              <FlatList
                data={filteredManagers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleSelectManager(item)}
                  >
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemEmail}>{item.email}</Text>
                      {item.phone && (
                        <Text style={styles.modalItemPhone}>{item.phone}</Text>
                      )}
                    </View>
                    {selectedManager?.id === item.id && (
                      <Ionicons name="checkmark" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalEmptyText}>
                    Không tìm thấy quản lý dự án
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  placeholder: {
    width: 32,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  selectButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#1F2937",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  statusButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  statusButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  statusButtonTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
    maxHeight: "80%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  searchInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
  },
  modalLoading: {
    padding: 32,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  modalItemEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  modalItemPhone: {
    fontSize: 14,
    color: "#6B7280",
  },
  modalEmptyText: {
    textAlign: "center",
    padding: 32,
    color: "#6B7280",
  },
});


