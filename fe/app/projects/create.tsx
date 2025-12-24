import React, { useState, useEffect, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { projectApi, CreateProjectData } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/components/BackButton";
import DateTimePicker from "@react-native-community/datetimepicker";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export default function CreateProjectScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
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
  const [generatedCode, setGeneratedCode] = useState("");

  // Tự động sinh mã dự án khi component mount
  useEffect(() => {
    generateProjectCode();
  }, []);

  const generateProjectCode = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const dateStr = `${day}${month}${year}`;

    // Format: annha-DDMMYYYY-01
    // Số thứ tự sẽ được backend xử lý, frontend chỉ hiển thị format mẫu
    const code = `annha-${dateStr}-01`;
    setGeneratedCode(code);
  };

  useEffect(() => {
    loadCustomers();
    loadProjectManagers();
  }, []);

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

    if (!formData.customer_id) {
      Alert.alert("Lỗi", "Vui lòng chọn khách hàng");
      return;
    }

    try {
      setLoading(true);
      // Không gửi code, để backend tự động sinh
      const response = await projectApi.createProject({
        ...formData,
        code: undefined, // Backend sẽ tự động sinh
        description: formData.description || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });

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

  const handleInputFocus = (y: number = 0) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Tạo Dự Án Mới</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Tên dự án <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên dự án"
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              onFocus={() => handleInputFocus(0)}
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Mã dự án</Text>
              <Text style={styles.autoLabel}>(Tự động sinh)</Text>
            </View>
            <View style={styles.codeContainer}>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={generatedCode}
                editable={false}
                placeholder="Mã sẽ được tự động sinh khi tạo dự án"
                placeholderTextColor="#9CA3AF"
              />
              <Ionicons
                name="refresh-outline"
                size={20}
                color="#6B7280"
                style={styles.refreshIcon}
              />
            </View>
            <Text style={styles.helperText}>
              Định dạng: annha-DDMMYYYY-XX (tự động tăng số thứ tự)
            </Text>
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ngày bắt đầu</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateInputText,
                  !formData.start_date && styles.dateInputPlaceholder,
                ]}
              >
                {formData.start_date
                  ? new Date(formData.start_date).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                  : "Chọn ngày bắt đầu"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.start_date ? new Date(formData.start_date) : new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowStartDatePicker(false);
                  if (date && event.type !== "dismissed") {
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
            <Text style={styles.label}>Ngày kết thúc</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateInputText,
                  !formData.end_date && styles.dateInputPlaceholder,
                ]}
              >
                {formData.end_date
                  ? new Date(formData.end_date).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                  : "Chọn ngày kết thúc"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={
                  formData.end_date
                    ? new Date(formData.end_date)
                    : formData.start_date
                      ? new Date(formData.start_date)
                      : new Date()
                }
                mode="date"
                display="default"
                minimumDate={
                  formData.start_date ? new Date(formData.start_date) : undefined
                }
                onChange={(event, date) => {
                  setShowEndDatePicker(false);
                  if (date && event.type !== "dismissed") {
                    setFormData({
                      ...formData,
                      end_date: date.toISOString().split("T")[0],
                    });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mô tả</Text>
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
              onFocus={() => handleInputFocus(400)}
              returnKeyType="done"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Trạng thái</Text>
            <View style={styles.statusContainer}>
              {[
                { value: "planning", label: "Lập kế hoạch" },
                { value: "in_progress", label: "Đang thực hiện" },
                { value: "completed", label: "Hoàn thành" },
                { value: "cancelled", label: "Đã hủy" },
              ].map((status) => (
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
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Tạo Dự Án</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    minHeight: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  autoLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
    fontStyle: "italic",
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    lineHeight: 22,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 14,
    lineHeight: 22,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "400",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    gap: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
    lineHeight: 20,
  },
  dateInputPlaceholder: {
    color: "#9CA3AF",
  },
  codeContainer: {
    position: "relative",
  },
  inputDisabled: {
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
    paddingRight: 48,
  },
  refreshIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    minWidth: 100,
  },
  statusButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  statusButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
    paddingHorizontal: 0,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: "#3B82F6",
    borderWidth: 0,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    justifyContent: "center",
  },
  selectPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    width: "100%",
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
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 20,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userItem: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  userItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  userItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
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
