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
import { useRouter } from "expo-router";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { projectApi, CreateProjectData } from "@/api/projectApi";
import { optionsApi, Option } from "@/api/optionsApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export default function CreateProjectScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(false);
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
  const [projectStatuses, setProjectStatuses] = useState<Option[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const [formData, setFormData] = useState<CreateProjectData>({
    name: "",
    code: "",
    description: "",
    customer_id: 0, // 0 means not selected
    project_manager_id: undefined,
    start_date: undefined,
    end_date: undefined,
    status: "planning",
  });

  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);

  useEffect(() => {
    loadCustomers();
    loadProjectManagers();
    loadProjectStatuses();
  }, []);

  const loadProjectStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const statuses = await optionsApi.getProjectStatuses();
      setProjectStatuses(statuses);
      // Set default status if formData.status is not in the list
      if (statuses.length > 0 && !statuses.find(s => s.value === formData.status)) {
        setFormData({ ...formData, status: statuses[0].value as any });
      }
    } catch (error) {
      console.error("Error loading project statuses:", error);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await projectApi.getCustomers();
      if (response.success) {
        const customersList = response.data || [];
        setCustomers(customersList);
        if (customersList.length === 0) {
          console.warn("Không tìm thấy khách hàng nào. Vui lòng kiểm tra lại dữ liệu.");
        }
      } else {
        console.error("Error loading customers:", response.message);
        Alert.alert("Lỗi", response.message || "Không thể tải danh sách khách hàng");
      }
    } catch (error: any) {
      console.error("Error loading customers:", error);
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách khách hàng");
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

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setFormData({ ...formData, customer_id: 0 });
  };

  const handleClearManager = () => {
    setSelectedManager(null);
    setFormData({ ...formData, project_manager_id: undefined });
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      !customerSearch ||
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (customer.phone &&
        customer.phone.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const filteredManagers = projectManagers.filter(
    (manager) =>
      !managerSearch ||
      manager.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
      manager.email.toLowerCase().includes(managerSearch.toLowerCase()) ||
      (manager.phone &&
        manager.phone.toLowerCase().includes(managerSearch.toLowerCase()))
  );

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên dự án");
      return;
    }

    if (!formData.customer_id || formData.customer_id === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn khách hàng");
      return;
    }

    // Validate required dates
    if (!formData.start_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày bắt đầu dự án");
      return;
    }

    if (!formData.end_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày kết thúc dự án");
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      Alert.alert("Lỗi", "Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    try {
      setLoading(true);
      // Prepare data for API
      const createData: CreateProjectData = {
        name: formData.name.trim(),
        customer_id: formData.customer_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status || "planning",
      };

      // Optional fields
      if (formData.code && formData.code.trim()) {
        createData.code = formData.code.trim();
      }
      if (formData.description && formData.description.trim()) {
        createData.description = formData.description.trim();
      }
      if (formData.project_manager_id) {
        createData.project_manager_id = formData.project_manager_id;
      }

      const response = await projectApi.createProject(createData);

      if (response.success) {
        Alert.alert("Thành công", "Đã tạo dự án mới", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert("Lỗi", response.message || "Không thể tạo dự án");
      }
    } catch (error: any) {
      console.error("Error creating project:", error);
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo dự án"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tạo Dự Án Mới" showBackButton />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: tabBarHeight }}>
        <View style={styles.form}>
          {/* Thông tin cơ bản */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Tên dự án <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="folder-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên dự án"
                  placeholderTextColor="#9CA3AF"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập mô tả dự án (tùy chọn)"
                  placeholderTextColor="#9CA3AF"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>

          {/* Thông tin liên hệ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Khách hàng <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCustomerModal(true)}
              >
                {selectedCustomer ? (
                  <View style={styles.selectedItem}>
                    <View style={styles.selectedItemInfo}>
                      <Text style={styles.selectedItemName}>
                        {selectedCustomer.name}
                      </Text>
                      <Text style={styles.selectedItemEmail}>
                        {selectedCustomer.email}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleClearCustomer();
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.selectPlaceholder}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                    <Text style={styles.selectPlaceholderText}>
                      Chọn khách hàng
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Quản lý dự án</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowManagerModal(true)}
              >
                {selectedManager ? (
                  <View style={styles.selectedItem}>
                    <View style={styles.selectedItemInfo}>
                      <Text style={styles.selectedItemName}>
                        {selectedManager.name}
                      </Text>
                      <Text style={styles.selectedItemEmail}>
                        {selectedManager.email}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleClearManager();
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.selectPlaceholder}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                    <Text style={styles.selectPlaceholderText}>
                      Chọn quản lý dự án (tùy chọn)
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Thời gian dự án */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Thời gian dự án</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Ngày bắt đầu <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {formData.start_date
                    ? new Date(formData.start_date).toLocaleDateString("vi-VN")
                    : "Chọn ngày bắt đầu"}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={formData.start_date ? new Date(formData.start_date) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) {
                      setFormData({
                        ...formData,
                        start_date: date.toISOString().split("T")[0],
                      });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Ngày kết thúc <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {formData.end_date
                    ? new Date(formData.end_date).toLocaleDateString("vi-VN")
                    : "Chọn ngày kết thúc"}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.end_date ? new Date(formData.end_date) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) {
                      setFormData({
                        ...formData,
                        end_date: date.toISOString().split("T")[0],
                      });
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Trạng thái */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag-outline" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Trạng thái dự án</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Trạng thái</Text>
              {loadingStatuses ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <View style={styles.statusContainer}>
                  {projectStatuses.map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.statusButton,
                        formData.status === status.value &&
                        styles.statusButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          status: status.value as CreateProjectData["status"],
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
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Tạo Dự Án</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCustomerModal(false);
          setCustomerSearch("");
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn Khách Hàng</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCustomerModal(false);
                setCustomerSearch("");
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm khách hàng..."
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholderTextColor="#9CA3AF"
            />
            {customerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCustomerSearch("")}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {loadingCustomers ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedCustomer?.id === item.id && styles.userItemSelected,
                  ]}
                  onPress={() => handleSelectCustomer(item)}
                >
                  <View style={styles.userItemContent}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                      {item.phone && (
                        <Text style={styles.userPhone}>{item.phone}</Text>
                      )}
                    </View>
                    {selectedCustomer?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.modalEmptyText}>
                    {customerSearch
                      ? "Không tìm thấy khách hàng"
                      : "Không có khách hàng nào"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Project Manager Selection Modal */}
      <Modal
        visible={showManagerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowManagerModal(false);
          setManagerSearch("");
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn Quản Lý Dự Án</Text>
            <TouchableOpacity
              onPress={() => {
                setShowManagerModal(false);
                setManagerSearch("");
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm quản lý dự án..."
              value={managerSearch}
              onChangeText={setManagerSearch}
              placeholderTextColor="#9CA3AF"
            />
            {managerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setManagerSearch("")}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {loadingManagers ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              data={filteredManagers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedManager?.id === item.id && styles.userItemSelected,
                  ]}
                  onPress={() => handleSelectManager(item)}
                >
                  <View style={styles.userItemContent}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                      {item.phone && (
                        <Text style={styles.userPhone}>{item.phone}</Text>
                      )}
                    </View>
                    {selectedManager?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.modalEmptyText}>
                    {managerSearch
                      ? "Không tìm thấy quản lý dự án"
                      : "Không có quản lý dự án nào"}
                  </Text>
                </View>
              }
            />
          )}
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
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
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
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontWeight: "600",
    fontSize: 16,
  },
  createButton: {
    backgroundColor: "#3B82F6",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectPlaceholderText: {
    flex: 1,
    fontSize: 16,
    color: "#9CA3AF",
  },
  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  selectedItemEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  clearButton: {
    padding: 4,
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
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userItem: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  userItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  userItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  modalEmptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
});
