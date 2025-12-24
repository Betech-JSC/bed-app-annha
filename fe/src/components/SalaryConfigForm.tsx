import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { CreateSalaryConfigData } from "@/api/salaryConfigApi";
import { employeesApi } from "@/api/employeesApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface SalaryConfigFormProps {
  onSubmit: (data: CreateSalaryConfigData) => void;
  onCancel: () => void;
  initialData?: Partial<CreateSalaryConfigData>;
}

export default function SalaryConfigForm({
  onSubmit,
  onCancel,
  initialData,
}: SalaryConfigFormProps) {
  const [formData, setFormData] = useState<CreateSalaryConfigData>({
    user_id: initialData?.user_id || 0,
    salary_type: initialData?.salary_type || "hourly",
    hourly_rate: initialData?.hourly_rate,
    daily_rate: initialData?.daily_rate,
    monthly_salary: initialData?.monthly_salary,
    project_rate: initialData?.project_rate,
    overtime_rate: initialData?.overtime_rate,
    effective_from: initialData?.effective_from || new Date().toISOString().split("T")[0],
    effective_to: initialData?.effective_to,
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(
    initialData?.effective_from
      ? new Date(initialData.effective_from)
      : new Date()
  );
  const [toDate, setToDate] = useState<Date | null>(
    initialData?.effective_to ? new Date(initialData.effective_to) : null
  );

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      // Load tất cả nhân viên (không paginate để có đầy đủ danh sách)
      const response = await employeesApi.getEmployees({ page: 1, per_page: 1000 });
      if (response.success) {
        // Lấy data từ response (có thể là array hoặc paginated)
        let data = [];
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        setEmployees(data);
        console.log("Loaded employees:", data.length);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách nhân viên");
    }
  };

  const selectedEmployee = employees.find((e) => e.id === formData.user_id);

  const handleSubmit = () => {
    // Validation
    if (!formData.user_id) {
      Alert.alert("Lỗi", "Vui lòng chọn nhân viên");
      return;
    }

    if (!formData.effective_from) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày có hiệu lực");
      return;
    }

    // Validate salary amount based on type
    if (formData.salary_type === "hourly" && !formData.hourly_rate) {
      Alert.alert("Lỗi", "Vui lòng nhập lương theo giờ");
      return;
    }
    if (formData.salary_type === "daily" && !formData.daily_rate) {
      Alert.alert("Lỗi", "Vui lòng nhập lương theo ngày");
      return;
    }
    if (formData.salary_type === "monthly" && !formData.monthly_salary) {
      Alert.alert("Lỗi", "Vui lòng nhập lương theo tháng");
      return;
    }
    if (formData.salary_type === "project_based" && !formData.project_rate) {
      Alert.alert("Lỗi", "Vui lòng nhập lương theo dự án");
      return;
    }

    // Validate date range
    if (formData.effective_to && formData.effective_from > formData.effective_to) {
      Alert.alert("Lỗi", "Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    onSubmit(formData);
  };

  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
      setFormData({
        ...formData,
        effective_from: selectedDate.toISOString().split("T")[0],
      });
    }
  };

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      setToDate(selectedDate);
      setFormData({
        ...formData,
        effective_to: selectedDate.toISOString().split("T")[0],
      });
    } else {
      setToDate(null);
      setFormData({
        ...formData,
        effective_to: undefined,
      });
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nhân viên *</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                initialData?.user_id && styles.selectButtonDisabled
              ]}
              onPress={() => {
                // Load lại danh sách khi mở modal
                loadEmployees();
                setShowEmployeeModal(true);
              }}
              disabled={!!initialData?.user_id}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  !formData.user_id && styles.selectButtonPlaceholder,
                ]}
              >
                {selectedEmployee
                  ? selectedEmployee.name
                  : "Chọn nhân viên"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loại lương</Text>
            <View style={styles.radioGroup}>
              {["hourly", "daily", "monthly", "project_based"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioButton,
                    formData.salary_type === type && styles.radioButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, salary_type: type as any })
                  }
                >
                  <Text
                    style={[
                      styles.radioText,
                      formData.salary_type === type && styles.radioTextActive,
                    ]}
                  >
                    {type === "hourly"
                      ? "Theo giờ"
                      : type === "daily"
                        ? "Theo ngày"
                        : type === "monthly"
                          ? "Theo tháng"
                          : "Theo dự án"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {formData.salary_type === "hourly" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lương theo giờ *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lương theo giờ"
                placeholderTextColor="#9CA3AF"
                value={formData.hourly_rate?.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    hourly_rate: parseFloat(text) || undefined,
                  })
                }
                keyboardType="numeric"
                onFocus={() => handleInputFocus(200)}
                returnKeyType="next"
              />
            </View>
          )}

          {formData.salary_type === "daily" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lương theo ngày *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lương theo ngày"
                placeholderTextColor="#9CA3AF"
                value={formData.daily_rate?.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    daily_rate: parseFloat(text) || undefined,
                  })
                }
                keyboardType="numeric"
                onFocus={() => handleInputFocus(250)}
                returnKeyType="next"
              />
            </View>
          )}

          {formData.salary_type === "monthly" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lương theo tháng *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lương theo tháng"
                placeholderTextColor="#9CA3AF"
                value={formData.monthly_salary?.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    monthly_salary: parseFloat(text) || undefined,
                  })
                }
                keyboardType="numeric"
                onFocus={() => handleInputFocus(300)}
                returnKeyType="next"
              />
            </View>
          )}

          {formData.salary_type === "project_based" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lương theo dự án *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lương theo dự án"
                placeholderTextColor="#9CA3AF"
                value={formData.project_rate?.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    project_rate: parseFloat(text) || undefined,
                  })
                }
                keyboardType="numeric"
                onFocus={() => handleInputFocus(350)}
                returnKeyType="next"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lương tăng ca (tùy chọn)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lương tăng ca theo giờ"
              placeholderTextColor="#9CA3AF"
              value={formData.overtime_rate?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  overtime_rate: parseFloat(text) || undefined,
                })
              }
              keyboardType="numeric"
              onFocus={() => handleInputFocus(400)}
              returnKeyType="next"
            />
            <Text style={styles.helperText}>
              Nếu không nhập, hệ thống sẽ dùng lương theo giờ hoặc lương theo ngày/8
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Có hiệu lực từ <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowFromDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text
                style={[
                  styles.dateButtonText,
                  !formData.effective_from && styles.dateButtonPlaceholder,
                ]}
              >
                {formData.effective_from
                  ? new Date(formData.effective_from).toLocaleDateString("vi-VN")
                  : "Chọn ngày"}
              </Text>
            </TouchableOpacity>
            {showFromDatePicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="default"
                onChange={handleFromDateChange}
                maximumDate={toDate || undefined}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Có hiệu lực đến (tùy chọn)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowToDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text
                style={[
                  styles.dateButtonText,
                  !formData.effective_to && styles.dateButtonPlaceholder,
                ]}
              >
                {formData.effective_to
                  ? new Date(formData.effective_to).toLocaleDateString("vi-VN")
                  : "Chọn ngày (tùy chọn)"}
              </Text>
              {formData.effective_to && (
                <TouchableOpacity
                  onPress={() => {
                    setToDate(null);
                    setFormData({ ...formData, effective_to: undefined });
                  }}
                  style={styles.clearDateButton}
                >
                  <Ionicons name="close-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {showToDatePicker && (
              <DateTimePicker
                value={toDate || new Date()}
                mode="date"
                display="default"
                onChange={handleToDateChange}
                minimumDate={fromDate}
              />
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Lưu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Employee Selection Modal */}
        <Modal
          visible={showEmployeeModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEmployeeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn nhân viên</Text>
                <TouchableOpacity
                  onPress={() => setShowEmployeeModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm nhân viên..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <FlatList
                data={filteredEmployees}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.employeeItem}
                    onPress={() => {
                      setFormData({ ...formData, user_id: item.id });
                      setShowEmployeeModal(false);
                      setSearchQuery("");
                    }}
                  >
                    <Text style={styles.employeeName}>{item.name}</Text>
                    <Text style={styles.employeeEmail}>{item.email}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không tìm thấy nhân viên</Text>
                  </View>
                }
              />
            </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  form: {
    padding: 20,
    paddingBottom: 32,
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
  radioGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  radioButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  radioText: {
    fontSize: 14,
    color: "#6B7280",
  },
  radioTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
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
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#1F2937",
  },
  selectButtonPlaceholder: {
    color: "#9CA3AF",
  },
  selectButtonDisabled: {
    opacity: 0.5,
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
  closeButton: {
    padding: 4,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  employeeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  dateButtonPlaceholder: {
    color: "#9CA3AF",
  },
  clearDateButton: {
    padding: 4,
  },
});
