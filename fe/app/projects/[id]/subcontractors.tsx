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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { subcontractorApi, Subcontractor } from "@/api/subcontractorApi";
import { globalSubcontractorApi, GlobalSubcontractor } from "@/api/globalSubcontractorApi";
import { Ionicons } from "@expo/vector-icons";

export default function SubcontractorsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [globalSubcontractors, setGlobalSubcontractors] = useState<GlobalSubcontractor[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [showGlobalList, setShowGlobalList] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [formData, setFormData] = useState({
    global_subcontractor_id: null as number | null,
    name: "",
    category: "",
    total_quote: "",
    advance_payment: "",
  });
  const [paymentFormData, setPaymentFormData] = useState({
    payment_stage: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "bank_transfer" as "cash" | "bank_transfer" | "check" | "other",
    reference_number: "",
    description: "",
  });

  useEffect(() => {
    loadSubcontractors();
  }, [id]);

  const loadGlobalSubcontractors = async () => {
    try {
      setLoadingGlobal(true);
      const response = await globalSubcontractorApi.getGlobalSubcontractors();
      if (response.success) {
        setGlobalSubcontractors(response.data.data || response.data || []);
      }
    } catch (error) {
      console.error("Error loading global subcontractors:", error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const handleSelectGlobalSubcontractor = (globalSub: GlobalSubcontractor) => {
    setFormData({
      ...formData,
      global_subcontractor_id: globalSub.id,
      name: globalSub.name,
      category: globalSub.category || "",
    });
    setShowGlobalList(false);
  };

  const loadSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await subcontractorApi.getSubcontractors(id!);
      if (response.success) {
        const data = response.data || [];
        // Load payments for each subcontractor
        const subcontractorsWithPayments = await Promise.all(
          data.map(async (sub: Subcontractor) => {
            try {
              const paymentsResponse = await subcontractorApi.getPayments(id!, {
                subcontractor_id: sub.id,
              });
              if (paymentsResponse.success) {
                sub.payments = paymentsResponse.data || [];
              }
            } catch (error) {
              console.error("Error loading payments for subcontractor:", error);
            }
            return sub;
          })
        );
        setSubcontractors(subcontractorsWithPayments);
      }
    } catch (error) {
      console.error("Error loading subcontractors:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (subcontractorId: number) => {
    try {
      setLoadingPayments(true);
      const response = await subcontractorApi.getPayments(id!, {
        subcontractor_id: subcontractorId,
      });
      if (response.success) {
        setPayments(response.data || []);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách thanh toán");
    } finally {
      setLoadingPayments(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getProgressStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Hoàn thành";
      case "in_progress":
        return "Đang thi công";
      case "delayed":
        return "Chậm tiến độ";
      case "not_started":
      default:
        return "Chưa bắt đầu";
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Đã thanh toán";
      case "partial":
        return "Thanh toán một phần";
      case "pending":
      default:
        return "Chưa thanh toán";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "partial":
        return "#F59E0B";
      case "pending":
      default:
        return "#EF4444";
    }
  };

  const renderSubcontractorItem = ({ item }: { item: Subcontractor }) => (
    <View style={styles.subcontractorCard}>
      <View style={styles.subcontractorHeader}>
        <View style={styles.subcontractorInfo}>
          <Text style={styles.subcontractorName}>{item.name}</Text>
          {item.category && (
            <Text style={styles.subcontractorCategory}>Hạng mục: {item.category}</Text>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.progress_status === "completed"
                  ? "#10B98120"
                  : item.progress_status === "in_progress"
                    ? "#3B82F620"
                    : item.progress_status === "delayed"
                      ? "#EF444420"
                      : "#6B728020",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.progress_status === "completed"
                    ? "#10B981"
                    : item.progress_status === "in_progress"
                      ? "#3B82F6"
                      : item.progress_status === "delayed"
                        ? "#EF4444"
                        : "#6B7280",
              },
            ]}
          >
            {getProgressStatusText(item.progress_status)}
          </Text>
        </View>
      </View>

      {/* Financial Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin tài chính</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Tổng báo giá</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(item.total_quote)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Tạm ứng</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(item.advance_payment || 0)}
            </Text>
          </View>
        </View>
        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Tổng thanh toán</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(item.total_paid)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Trạng thái thanh toán</Text>
            <View
              style={[
                styles.paymentStatusBadge,
                {
                  backgroundColor: getPaymentStatusColor(item.payment_status) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.paymentStatusText,
                  { color: getPaymentStatusColor(item.payment_status) },
                ]}
              >
                {getPaymentStatusText(item.payment_status)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${item.total_quote > 0 ? (item.total_paid / item.total_quote) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Construction Progress */}
      {(item.progress_start_date || item.progress_end_date) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến độ thi công</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.dateLabel}>Từ ngày:</Text>
              <Text style={styles.dateValue}>
                {formatDate(item.progress_start_date)}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.dateLabel}>Đến ngày:</Text>
              <Text style={styles.dateValue}>
                {formatDate(item.progress_end_date)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Attachments */}
      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chứng từ lưu trữ</Text>
          <View style={styles.attachmentsRow}>
            <Ionicons name="document-outline" size={16} color="#3B82F6" />
            <Text style={styles.attachmentsText}>
              {item.attachments.length} chứng từ đã tải lên
            </Text>
          </View>
        </View>
      )}
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
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={subcontractors}
        renderItem={renderSubcontractorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhà thầu phụ</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm nhà thầu phụ</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chọn nhà thầu phụ</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    loadGlobalSubcontractors();
                    setShowGlobalList(true);
                  }}
                >
                  <Text style={[
                    styles.selectButtonText,
                    !formData.global_subcontractor_id && styles.selectButtonTextPlaceholder
                  ]}>
                    {formData.global_subcontractor_id
                      ? formData.name
                      : "Chọn từ danh sách nhà thầu phụ"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {formData.global_subcontractor_id && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        global_subcontractor_id: null,
                        name: "",
                        category: "",
                      });
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={styles.clearButtonText}>Xóa lựa chọn</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên nhà thầu *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên nhà thầu phụ"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text, global_subcontractor_id: null })
                  }
                  editable={!formData.global_subcontractor_id}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hạng mục</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập hạng mục"
                  value={formData.category}
                  onChangeText={(text) =>
                    setFormData({ ...formData, category: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tổng báo giá *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tổng báo giá"
                  value={formData.total_quote}
                  onChangeText={(text) =>
                    setFormData({ ...formData, total_quote: text })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tạm ứng</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số tiền tạm ứng"
                  value={formData.advance_payment}
                  onChangeText={(text) =>
                    setFormData({ ...formData, advance_payment: text })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={async () => {
                    if (!formData.name || !formData.total_quote) {
                      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
                      return;
                    }
                    try {
                      await subcontractorApi.createSubcontractor(id!, {
                        global_subcontractor_id: formData.global_subcontractor_id || undefined,
                        name: formData.name,
                        category: formData.category || undefined,
                        total_quote: parseFloat(formData.total_quote),
                        advance_payment: formData.advance_payment
                          ? parseFloat(formData.advance_payment)
                          : undefined,
                      });
                      setModalVisible(false);
                      setFormData({
                        global_subcontractor_id: null,
                        name: "",
                        category: "",
                        total_quote: "",
                        advance_payment: "",
                      });
                      loadSubcontractors();
                    } catch (error: any) {
                      Alert.alert(
                        "Lỗi",
                        error.response?.data?.message || "Không thể thêm nhà thầu phụ"
                      );
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Thêm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Subcontractors List Modal */}
      <Modal
        visible={showGlobalList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGlobalList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn nhà thầu phụ</Text>
              <TouchableOpacity
                onPress={() => setShowGlobalList(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {loadingGlobal ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : globalSubcontractors.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="business-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Chưa có nhà thầu phụ</Text>
                </View>
              ) : (
                <FlatList
                  data={globalSubcontractors}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.globalSubcontractorItem}
                      onPress={() => handleSelectGlobalSubcontractor(item)}
                    >
                      <View style={styles.globalSubcontractorInfo}>
                        <Text style={styles.globalSubcontractorName}>{item.name}</Text>
                        {item.category && (
                          <Text style={styles.globalSubcontractorCategory}>
                            {item.category}
                          </Text>
                        )}
                        {item.phone && (
                          <Text style={styles.globalSubcontractorDetail}>
                            📞 {item.phone}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Payments Management Modal */}
      <Modal
        visible={showPaymentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPaymentsModal(false);
          setSelectedSubcontractor(null);
          setPayments([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>
                  Chi phí: {selectedSubcontractor?.name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Tổng: {formatCurrency(selectedSubcontractor?.total_quote || 0)} | Đã trả:{" "}
                  {formatCurrency(selectedSubcontractor?.total_paid || 0)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentsModal(false);
                  setSelectedSubcontractor(null);
                  setPayments([]);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {showPaymentForm ? (
                <ScrollView>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Đợt thanh toán</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VD: Đợt 1, Nghiệm thu lần 1..."
                      value={paymentFormData.payment_stage}
                      onChangeText={(text) =>
                        setPaymentFormData({ ...paymentFormData, payment_stage: text })
                      }
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Số tiền <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập số tiền"
                      value={paymentFormData.amount}
                      onChangeText={(text) =>
                        setPaymentFormData({ ...paymentFormData, amount: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ngày thanh toán</Text>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => {
                        // TODO: Add date picker
                      }}
                    >
                      <Text style={styles.selectButtonText}>
                        {paymentFormData.payment_date
                          ? new Date(paymentFormData.payment_date).toLocaleDateString("vi-VN")
                          : "Chọn ngày"}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phương thức thanh toán</Text>
                    <View style={styles.paymentMethodRow}>
                      {[
                        { value: "bank_transfer", label: "Chuyển khoản" },
                        { value: "cash", label: "Tiền mặt" },
                        { value: "check", label: "Séc" },
                        { value: "other", label: "Khác" },
                      ].map((method) => (
                        <TouchableOpacity
                          key={method.value}
                          style={[
                            styles.paymentMethodButton,
                            paymentFormData.payment_method === method.value &&
                              styles.paymentMethodButtonActive,
                          ]}
                          onPress={() =>
                            setPaymentFormData({
                              ...paymentFormData,
                              payment_method: method.value as any,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.paymentMethodText,
                              paymentFormData.payment_method === method.value &&
                                styles.paymentMethodTextActive,
                            ]}
                          >
                            {method.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Số tham chiếu</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Số chứng từ, số phiếu..."
                      value={paymentFormData.reference_number}
                      onChangeText={(text) =>
                        setPaymentFormData({ ...paymentFormData, reference_number: text })
                      }
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ghi chú</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Nhập ghi chú..."
                      value={paymentFormData.description}
                      onChangeText={(text) =>
                        setPaymentFormData({ ...paymentFormData, description: text })
                      }
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setShowPaymentForm(false);
                        setPaymentFormData({
                          payment_stage: "",
                          amount: "",
                          payment_date: new Date().toISOString().split("T")[0],
                          payment_method: "bank_transfer",
                          reference_number: "",
                          description: "",
                        });
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={async () => {
                        if (!paymentFormData.amount || !selectedSubcontractor) {
                          Alert.alert("Lỗi", "Vui lòng nhập số tiền");
                          return;
                        }
                        try {
                          await subcontractorApi.createPayment(id!, {
                            subcontractor_id: selectedSubcontractor.id,
                            payment_stage: paymentFormData.payment_stage || undefined,
                            amount: parseFloat(paymentFormData.amount),
                            payment_date: paymentFormData.payment_date || undefined,
                            payment_method: paymentFormData.payment_method,
                            reference_number: paymentFormData.reference_number || undefined,
                            description: paymentFormData.description || undefined,
                          });
                          Alert.alert("Thành công", "Đã tạo phiếu chi");
                          setShowPaymentForm(false);
                          setPaymentFormData({
                            payment_stage: "",
                            amount: "",
                            payment_date: new Date().toISOString().split("T")[0],
                            payment_method: "bank_transfer",
                            reference_number: "",
                            description: "",
                          });
                          loadPayments(selectedSubcontractor.id);
                          loadSubcontractors();
                        } catch (error: any) {
                          Alert.alert(
                            "Lỗi",
                            error.response?.data?.message || "Không thể tạo phiếu chi"
                          );
                        }
                      }}
                    >
                      <Text style={styles.submitButtonText}>Tạo phiếu chi</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                <>
                  <View style={styles.paymentsHeader}>
                    <Text style={styles.paymentsTitle}>
                      Danh sách thanh toán ({payments.length})
                    </Text>
                    <TouchableOpacity
                      style={styles.addPaymentButton}
                      onPress={() => setShowPaymentForm(true)}
                    >
                      <Ionicons name="add-circle" size={20} color="#3B82F6" />
                      <Text style={styles.addPaymentButtonText}>Tạo phiếu chi</Text>
                    </TouchableOpacity>
                  </View>

                  {loadingPayments ? (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                  ) : payments.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.emptyText}>Chưa có phiếu chi nào</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={payments}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <View style={styles.paymentItem}>
                          <View style={styles.paymentItemHeader}>
                            <View style={styles.paymentItemLeft}>
                              <Text style={styles.paymentNumber}>
                                {item.payment_number || `#${item.id}`}
                              </Text>
                              {item.payment_stage && (
                                <Text style={styles.paymentStage}>{item.payment_stage}</Text>
                              )}
                            </View>
                            <View
                              style={[
                                styles.paymentStatusBadge,
                                {
                                  backgroundColor:
                                    item.status === "paid"
                                      ? "#10B98120"
                                      : item.status === "pending_accountant_confirmation"
                                        ? "#3B82F620"
                                        : item.status === "pending_management_approval"
                                          ? "#F59E0B20"
                                          : item.status === "rejected"
                                            ? "#EF444420"
                                            : "#9CA3AF20",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.paymentStatusText,
                                  {
                                    color:
                                      item.status === "paid"
                                        ? "#10B981"
                                        : item.status === "pending_accountant_confirmation"
                                          ? "#3B82F6"
                                          : item.status === "pending_management_approval"
                                            ? "#F59E0B"
                                            : item.status === "rejected"
                                              ? "#EF4444"
                                              : "#6B7280",
                                  },
                                ]}
                              >
                                {item.status_label || item.status}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.paymentItemBody}>
                            <Text style={styles.paymentAmount}>
                              {formatCurrency(item.amount)}
                            </Text>
                            {item.description && (
                              <Text style={styles.paymentDescription} numberOfLines={2}>
                                {item.description}
                              </Text>
                            )}
                            <View style={styles.paymentInfoRow}>
                              <Text style={styles.paymentInfo}>
                                {item.payment_method_label || item.payment_method}
                              </Text>
                              {item.payment_date && (
                                <Text style={styles.paymentInfo}>
                                  {formatDate(item.payment_date)}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.paymentActions}>
                            {item.status === "draft" && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.submitButton]}
                                onPress={async () => {
                                  try {
                                    await subcontractorApi.submitPayment(id!, item.id);
                                    Alert.alert("Thành công", "Đã gửi phiếu chi để duyệt");
                                    loadPayments(selectedSubcontractor!.id);
                                    loadSubcontractors();
                                  } catch (error: any) {
                                    Alert.alert(
                                      "Lỗi",
                                      error.response?.data?.message || "Không thể gửi phiếu chi"
                                    );
                                  }
                                }}
                              >
                                <Text style={styles.actionButtonText}>Gửi duyệt</Text>
                              </TouchableOpacity>
                            )}
                            {item.status === "pending_management_approval" && (
                              <>
                                <TouchableOpacity
                                  style={[styles.actionButton, styles.approveButton]}
                                  onPress={async () => {
                                    try {
                                      await subcontractorApi.approvePayment(id!, item.id);
                                      Alert.alert("Thành công", "Đã duyệt phiếu chi");
                                      loadPayments(selectedSubcontractor!.id);
                                      loadSubcontractors();
                                    } catch (error: any) {
                                      Alert.alert(
                                        "Lỗi",
                                        error.response?.data?.message || "Không thể duyệt phiếu chi"
                                      );
                                    }
                                  }}
                                >
                                  <Text style={styles.actionButtonText}>Duyệt</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.actionButton, styles.rejectButton]}
                                  onPress={() => {
                                    Alert.prompt(
                                      "Từ chối phiếu chi",
                                      "Nhập lý do từ chối (tùy chọn):",
                                      async (reason) => {
                                        try {
                                          await subcontractorApi.rejectPayment(
                                            id!,
                                            item.id,
                                            reason || undefined
                                          );
                                          Alert.alert("Thành công", "Đã từ chối phiếu chi");
                                          loadPayments(selectedSubcontractor!.id);
                                          loadSubcontractors();
                                        } catch (error: any) {
                                          Alert.alert(
                                            "Lỗi",
                                            error.response?.data?.message ||
                                              "Không thể từ chối phiếu chi"
                                          );
                                        }
                                      }
                                    );
                                  }}
                                >
                                  <Text style={[styles.actionButtonText, { color: "#EF4444" }]}>
                                    Từ chối
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                            {item.status === "pending_accountant_confirmation" && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.paidButton]}
                                onPress={async () => {
                                  try {
                                    await subcontractorApi.markPaymentAsPaid(id!, item.id);
                                    Alert.alert("Thành công", "Đã xác nhận thanh toán");
                                    loadPayments(selectedSubcontractor!.id);
                                    loadSubcontractors();
                                  } catch (error: any) {
                                    Alert.alert(
                                      "Lỗi",
                                      error.response?.data?.message ||
                                        "Không thể xác nhận thanh toán"
                                    );
                                  }
                                }}
                              >
                                <Text style={styles.actionButtonText}>Xác nhận đã trả</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    />
                  )}
                </>
              )}
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
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  subcontractorCard: {
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
  subcontractorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  subcontractorInfo: {
    flex: 1,
    marginRight: 12,
  },
  subcontractorName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  subcontractorCategory: {
    fontSize: 14,
    color: "#6B7280",
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
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  dateRow: {
    flexDirection: "row",
    gap: 16,
  },
  dateItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  dateValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
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
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
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
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
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
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
  selectButtonTextPlaceholder: {
    color: "#6B7280",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearButtonText: {
    fontSize: 12,
    color: "#EF4444",
  },
  globalSubcontractorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  globalSubcontractorInfo: {
    flex: 1,
  },
  globalSubcontractorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  globalSubcontractorCategory: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  globalSubcontractorDetail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
