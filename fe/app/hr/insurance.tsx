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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  insuranceApi,
  EmployeeInsurance,
  EmployeeBenefit,
  CreateBenefitData,
} from "@/api/insuranceApi";
import { employeesApi } from "@/api/employeesApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import BackButton from "@/components/BackButton";

const BENEFIT_TYPE_LABELS: Record<string, string> = {
  meal: "Phụ cấp ăn trưa",
  travel: "Phụ cấp đi lại",
  phone: "Phụ cấp điện thoại",
  housing: "Phụ cấp nhà ở",
  other: "Khác",
};

export default function InsuranceScreen() {
  const router = useRouter();
  const [insurance, setInsurance] = useState<EmployeeInsurance | null>(null);
  const [benefits, setBenefits] = useState<EmployeeBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<EmployeeBenefit | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"insurance" | "benefits">("insurance");
  const [formData, setFormData] = useState<Partial<CreateBenefitData>>({
    user_id: undefined,
    benefit_type: "meal",
    name: "",
    description: "",
    amount: 0,
    calculation_type: "fixed",
    start_date: new Date().toISOString().split("T")[0],
    end_date: undefined,
    notes: "",
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [selectedEmployee]);

  const loadData = async () => {
    if (!selectedEmployee) return;
    try {
      setLoading(true);
      const [insuranceRes, benefitsRes] = await Promise.all([
        insuranceApi.getInsurance({ user_id: selectedEmployee.id }),
        insuranceApi.getBenefits({ user_id: selectedEmployee.id }),
      ]);
      if (insuranceRes.success) {
        setInsurance(insuranceRes.data || null);
      }
      if (benefitsRes.success) {
        setBenefits(benefitsRes.data.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeesApi.getEmployees({ page: 1, per_page: 1000 });
      if (response.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateBenefit = async () => {
    if (!formData.user_id || !formData.name || !formData.amount) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);
      const response = editingBenefit
        ? await insuranceApi.updateBenefit(editingBenefit.id, formData as any)
        : await insuranceApi.createBenefit(formData as CreateBenefitData);
      
      if (response.success) {
        Alert.alert("Thành công", editingBenefit ? "Đã cập nhật phúc lợi" : "Đã tạo phúc lợi thành công");
        setShowBenefitModal(false);
        resetBenefitForm();
        loadData();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể thực hiện thao tác");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBenefit = (benefit: EmployeeBenefit) => {
    setEditingBenefit(benefit);
    setFormData({
      user_id: benefit.user_id,
      benefit_type: benefit.benefit_type,
      name: benefit.name,
      description: benefit.description || "",
      amount: benefit.amount,
      calculation_type: benefit.calculation_type,
      start_date: benefit.start_date.split("T")[0],
      end_date: benefit.end_date ? benefit.end_date.split("T")[0] : undefined,
      notes: benefit.notes || "",
    });
    setShowBenefitModal(true);
  };

  const handleDeleteBenefit = (benefit: EmployeeBenefit) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa phúc lợi "${benefit.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await insuranceApi.deleteBenefit(benefit.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa phúc lợi");
                loadData();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa phúc lợi");
            }
          },
        },
      ]
    );
  };

  const resetBenefitForm = () => {
    setEditingBenefit(null);
    setFormData({
      user_id: selectedEmployee?.id,
      benefit_type: "meal",
      name: "",
      description: "",
      amount: 0,
      calculation_type: "fixed",
      start_date: new Date().toISOString().split("T")[0],
      end_date: undefined,
      notes: "",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
  };

  const renderBenefitItem = ({ item }: { item: EmployeeBenefit }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardType}>
            {BENEFIT_TYPE_LABELS[item.benefit_type] || item.benefit_type}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "active"
                  ? "#10B98120"
                  : item.status === "expired"
                    ? "#F59E0B20"
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
                    : item.status === "expired"
                      ? "#F59E0B"
                      : "#6B7280",
              },
            ]}
          >
            {item.status === "active"
              ? "Đang hiệu lực"
              : item.status === "expired"
                ? "Hết hạn"
                : "Ngừng"}
          </Text>
        </View>
      </View>
      <Text style={styles.amountText}>
        {formatCurrency(item.amount)}
        {item.calculation_type === "percentage" && " (%)"}
      </Text>
      <Text style={styles.dateText}>
        Từ {new Date(item.start_date).toLocaleDateString("vi-VN")}
        {item.end_date && ` đến ${new Date(item.end_date).toLocaleDateString("vi-VN")}`}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditBenefit(item)}
        >
          <Ionicons name="pencil" size={18} color="#3B82F6" />
          <Text style={styles.actionText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteBenefit(item)}
        >
          <Ionicons name="trash" size={18} color="#EF4444" />
          <Text style={[styles.actionText, styles.deleteText]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Bảo Hiểm & Phúc Lợi</Text>
      </View>

      <View style={styles.employeeSelector}>
        <TouchableOpacity
          style={styles.selectInput}
          onPress={() => setShowEmployeePicker(true)}
        >
          <Text style={selectedEmployee ? {} : styles.placeholderText}>
            {selectedEmployee ? selectedEmployee.name : "Chọn nhân viên"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {selectedEmployee && (
        <>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "insurance" && styles.tabActive]}
              onPress={() => setActiveTab("insurance")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "insurance" && styles.tabTextActive,
                ]}
              >
                Bảo Hiểm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "benefits" && styles.tabActive]}
              onPress={() => setActiveTab("benefits")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "benefits" && styles.tabTextActive,
                ]}
              >
                Phúc Lợi
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <>
              {activeTab === "insurance" && (
                <ScrollView style={styles.content}>
                  {insurance ? (
                    <View style={styles.insuranceCard}>
                      <Text style={styles.sectionTitle}>Thông Tin Bảo Hiểm</Text>
                      {insurance.social_insurance_number && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Số BHXH:</Text>
                          <Text style={styles.infoValue}>
                            {insurance.social_insurance_number}
                          </Text>
                        </View>
                      )}
                      {insurance.health_insurance_number && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Số BHYT:</Text>
                          <Text style={styles.infoValue}>
                            {insurance.health_insurance_number}
                          </Text>
                        </View>
                      )}
                      {insurance.unemployment_insurance_number && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Số BHTN:</Text>
                          <Text style={styles.infoValue}>
                            {insurance.unemployment_insurance_number}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="shield-outline" size={64} color="#9CA3AF" />
                      <Text style={styles.emptyText}>Chưa có thông tin bảo hiểm</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {activeTab === "benefits" && (
                <>
                  <View style={styles.addButtonContainer}>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => {
                        resetBenefitForm();
                        setShowBenefitModal(true);
                      }}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.addButtonText}>Thêm Phúc Lợi</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={benefits}
                    renderItem={renderBenefitItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Ionicons name="gift-outline" size={64} color="#9CA3AF" />
                        <Text style={styles.emptyText}>Chưa có phúc lợi</Text>
                      </View>
                    }
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Employee Picker Modal */}
      {showEmployeePicker && (
        <Modal
          visible={showEmployeePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEmployeePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn nhân viên</Text>
                <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={employees}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedEmployee(item);
                      setShowEmployeePicker(false);
                    }}
                  >
                    <Text>{item.name}</Text>
                    {selectedEmployee?.id === item.id && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Benefit Modal */}
      <Modal
        visible={showBenefitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBenefitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBenefit ? "Sửa Phúc Lợi" : "Tạo Phúc Lợi"}
              </Text>
              <TouchableOpacity onPress={() => setShowBenefitModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên phúc lợi *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên phúc lợi"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Loại phúc lợi</Text>
                <View style={styles.typeContainer}>
                  {Object.entries(BENEFIT_TYPE_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.typeButton,
                        formData.benefit_type === key && styles.typeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, benefit_type: key })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.benefit_type === key && styles.typeButtonTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Số tiền *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.amount?.toString()}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: parseFloat(text) || 0 })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cách tính</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.calculation_type === "fixed" && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, calculation_type: "fixed" })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.calculation_type === "fixed" && styles.typeButtonTextActive,
                      ]}
                    >
                      Cố định
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      formData.calculation_type === "percentage" && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, calculation_type: "percentage" })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.calculation_type === "percentage" && styles.typeButtonTextActive,
                      ]}
                    >
                      Phần trăm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ngày bắt đầu *</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text>{formData.start_date}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={new Date(formData.start_date || new Date())}
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
                <Text style={styles.label}>Ngày kết thúc</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text>{formData.end_date || "Chọn ngày"}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={
                      formData.end_date
                        ? new Date(formData.end_date)
                        : new Date(formData.start_date || new Date())
                    }
                    mode="date"
                    display="default"
                    minimumDate={new Date(formData.start_date || new Date())}
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

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreateBenefit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingBenefit ? "Cập Nhật" : "Tạo Mới"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  employeeSelector: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  selectInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  insuranceCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  addButtonContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
  cardType: {
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
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B82F6",
    marginTop: 8,
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    padding: 16,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    flex: 1,
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
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  typeButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  typeButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
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

