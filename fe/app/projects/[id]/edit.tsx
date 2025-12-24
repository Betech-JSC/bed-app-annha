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
import { useRouter, useLocalSearchParams } from "expo-router";
import { projectApi, CreateProjectData, Project } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import BackButton from "@/components/BackButton";

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
      // Không gửi code lên backend (không cho phép thay đổi mã dự án)
      const updateData = { ...formData };
      delete updateData.code;

      const response = await projectApi.updateProject(id!, updateData);
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

  const scrollViewRef = useRef<ScrollView>(null);

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
        <Text style={styles.headerTitle}>Chỉnh Sửa Dự Án</Text>
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
          <View style={styles.inputGroup}>
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

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Mã dự án</Text>
              <Text style={styles.autoLabel}>(Không thể thay đổi)</Text>
            </View>
            <View style={styles.codeContainer}>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.code}
                editable={false}
                placeholder="Mã dự án"
                placeholderTextColor="#9CA3AF"
              />
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={styles.lockIcon}
              />
            </View>
            <Text style={styles.helperText}>
              Mã dự án được tự động sinh và không thể thay đổi
            </Text>
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
              activeOpacity={0.7}
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
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quản lý dự án</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowManagerModal(true)}
              activeOpacity={0.7}
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
                      setSelectedManager(null);
                      setFormData({ ...formData, project_manager_id: undefined });
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
            <Text style={styles.helperText}>
              Chỉ hiển thị nhân sự nội bộ công ty
            </Text>
          </View>

          <View style={styles.inputGroup}>
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
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowStartDatePicker(false);
                  if (date && event.type !== "dismissed") {
                    setStartDate(date);
                    setFormData({
                      ...formData,
                      start_date: date.toISOString().split("T")[0],
                    });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
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
                value={endDate}
                mode="date"
                display="default"
                minimumDate={formData.start_date ? new Date(formData.start_date) : undefined}
                onChange={(event, date) => {
                  setShowEndDatePicker(false);
                  if (date && event.type !== "dismissed") {
                    setEndDate(date);
                    setFormData({
                      ...formData,
                      end_date: date.toISOString().split("T")[0],
                    });
                  }
                }}
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

        {/* Manager Modal */}
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
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: 100,
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
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "400",
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
    height: 120,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  selectButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    justifyContent: "center",
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
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
  },
  dateInputText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
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
    paddingRight: 40,
  },
  lockIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
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


