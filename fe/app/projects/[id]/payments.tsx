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
import { useRouter, useLocalSearchParams } from "expo-router";
import { paymentApi, ProjectPayment, CreatePaymentData } from "@/api/paymentApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function PaymentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasPermission } = useProjectPermissions(id);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ProjectPayment | null>(null);
  const [confirmPaidDate, setConfirmPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [showConfirmDatePicker, setShowConfirmDatePicker] = useState(false);
  const [project, setProject] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePaymentData>({
    payment_number: 1,
    amount: 0,
    due_date: new Date().toISOString().split("T")[0],
    contract_id: undefined,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadPayments();
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await projectApi.getProject(id!);
      if (response.success) {
        setProject(response.data);
        // Set contract_id if available
        if (response.data.contract?.id) {
          setFormData(prev => ({ ...prev, contract_id: response.data.contract.id }));
        }
        // Set next payment number
        const existingPayments = payments.length;
        setFormData(prev => ({ ...prev, payment_number: existingPayments + 1 }));
      }
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getPayments(id!);
      if (response.success) {
        setPayments(response.data || []);
        // Update next payment number
        const maxPaymentNumber = response.data.length > 0
          ? Math.max(...response.data.map((p: ProjectPayment) => p.payment_number))
          : 0;
        setFormData(prev => ({ ...prev, payment_number: maxPaymentNumber + 1 }));
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const handleCreatePayment = async () => {
    if (!formData.amount || formData.amount <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return;
    }

    if (!formData.due_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày đến hạn");
      return;
    }

    try {
      const response = await paymentApi.createPayment(id!, formData);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo đợt thanh toán mới");
        setShowCreateModal(false);
        resetForm();
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo đợt thanh toán"
      );
    }
  };

  const resetForm = () => {
    const maxPaymentNumber = payments.length > 0
      ? Math.max(...payments.map((p) => p.payment_number))
      : 0;
    setFormData({
      payment_number: maxPaymentNumber + 1,
      amount: 0,
      due_date: new Date().toISOString().split("T")[0],
      contract_id: project?.contract?.id,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status: string, dueDate: string) => {
    if (status === "paid") return "#10B981";
    if (status === "overdue") return "#EF4444";
    const due = new Date(dueDate);
    const today = new Date();
    if (due < today) return "#EF4444";
    return "#F59E0B";
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";
      case "paid":
        return "Đã thanh toán";
      case "overdue":
        return "Quá hạn";
      default:
        return status;
    }
  };

  const renderPaymentItem = ({ item }: { item: ProjectPayment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.paymentNumber}>
            Đợt {item.payment_number}
          </Text>
          <Text style={styles.paymentAmount}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                getStatusColor(item.due_date, item.due_date) + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.due_date, item.due_date) },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.detailLabel}>Hạn thanh toán:</Text>
          <Text style={styles.detailValue}>{formatDate(item.due_date)}</Text>
        </View>
        {item.paid_date && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={styles.detailLabel}>Đã thanh toán:</Text>
            <Text style={styles.detailValue}>{formatDate(item.paid_date)}</Text>
          </View>
        )}
      </View>

      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentsRow}>
          <Ionicons name="document-outline" size={16} color="#3B82F6" />
          <Text style={styles.attachmentsText}>
            {item.attachments.length} chứng từ
          </Text>
        </View>
      )}

      {item.status === "pending" && hasPermission("payments.confirm") && (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => handleConfirmPayment(item)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Xác nhận thanh toán</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleConfirmPayment = (payment: ProjectPayment) => {
    setSelectedPayment(payment);
    setConfirmPaidDate(new Date().toISOString().split("T")[0]);
    setShowConfirmModal(true);
  };

  const submitConfirmPayment = async () => {
    if (!selectedPayment || !confirmPaidDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày thanh toán");
      return;
    }

    try {
      const response = await paymentApi.confirmPayment(
        id!,
        selectedPayment.id,
        confirmPaidDate
      );
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận thanh toán");
        setShowConfirmModal(false);
        setSelectedPayment(null);
        loadPayments();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể xác nhận thanh toán"
      );
    }
  };

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
        <Text style={styles.headerTitle}>Đã Thanh Toán</Text>
        <PermissionGuard permission="payments.create" projectId={id}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </PermissionGuard>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có đợt thanh toán nào</Text>
            {hasPermission("payments.create") && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
              >
                <Text style={styles.emptyButtonText}>Thêm đợt thanh toán</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Create Payment Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm Đợt Thanh Toán</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {project?.contract && (
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoText}>
                    Giá trị hợp đồng: {formatCurrency(project.contract.contract_value)}
                  </Text>
                  {payments.length > 0 && (
                    <Text style={styles.infoSubtext}>
                      Tổng đã tạo: {formatCurrency(
                        payments.reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Số đợt thanh toán <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số đợt"
                value={formData.payment_number.toString()}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    payment_number: parseInt(text) || 1,
                  })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Số tiền <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số tiền (VND)"
                value={formData.amount > 0 ? formData.amount.toString() : ""}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(text) || 0,
                  })
                }
                keyboardType="numeric"
              />
              {formData.amount > 0 && (
                <Text style={styles.helperText}>
                  {formatCurrency(formData.amount)}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Ngày đến hạn <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {formData.due_date
                    ? new Date(formData.due_date).toLocaleDateString("vi-VN")
                    : "Chọn ngày đến hạn"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.due_date ? new Date(formData.due_date) : new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setFormData({
                        ...formData,
                        due_date: date.toISOString().split("T")[0],
                      });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreatePayment}
              >
                <Text style={styles.saveButtonText}>Tạo Đợt Thanh Toán</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Confirm Payment Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowConfirmModal(false);
          setSelectedPayment(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmModalHeader}>
              <Text style={styles.confirmModalTitle}>Xác Nhận Thanh Toán</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowConfirmModal(false);
                  setSelectedPayment(null);
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <View style={styles.confirmModalContent}>
                <View style={styles.confirmInfoCard}>
                  <Text style={styles.confirmInfoLabel}>Đợt thanh toán</Text>
                  <Text style={styles.confirmInfoValue}>
                    Đợt {selectedPayment.payment_number}
                  </Text>
                </View>

                <View style={styles.confirmInfoCard}>
                  <Text style={styles.confirmInfoLabel}>Số tiền</Text>
                  <Text style={styles.confirmInfoValue}>
                    {formatCurrency(selectedPayment.amount)}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Ngày thanh toán <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowConfirmDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                    <Text style={styles.dateButtonText}>
                      {confirmPaidDate
                        ? new Date(confirmPaidDate).toLocaleDateString("vi-VN")
                        : "Chọn ngày thanh toán"}
                    </Text>
                  </TouchableOpacity>
                  {showConfirmDatePicker && (
                    <DateTimePicker
                      value={confirmPaidDate ? new Date(confirmPaidDate) : new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(event, date) => {
                        setShowConfirmDatePicker(false);
                        if (date) {
                          setConfirmPaidDate(date.toISOString().split("T")[0]);
                        }
                      }}
                    />
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowConfirmModal(false);
                      setSelectedPayment(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={submitConfirmPayment}
                  >
                    <Text style={styles.saveButtonText}>Xác Nhận</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  paymentNumber: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paymentDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#10B981",
    borderRadius: 8,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
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
  },
  emptyButton: {
    marginTop: 24,
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: "#6B7280",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  confirmModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  confirmModalContent: {
    padding: 16,
  },
  confirmInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  confirmInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  confirmInfoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
});
