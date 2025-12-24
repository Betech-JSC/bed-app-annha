import React, { useState, useEffect, useMemo } from "react";
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
  const [globalSubcontractors, setGlobalSubcontractors] = useState<GlobalSubcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [showSubcontractorPicker, setShowSubcontractorPicker] = useState(false);
  const [selectedGlobalSubcontractor, setSelectedGlobalSubcontractor] = useState<GlobalSubcontractor | null>(null);
  const [subcontractorSearch, setSubcontractorSearch] = useState("");
  const [formData, setFormData] = useState({
    global_subcontractor_id: "",
    category: "",
    total_quote: "",
    advance_payment: "",
  });

  useEffect(() => {
    loadSubcontractors();
    loadGlobalSubcontractors();
  }, [id]);

  const loadGlobalSubcontractors = async () => {
    try {
      console.log("Loading global subcontractors...");
      const response = await globalSubcontractorApi.getGlobalSubcontractors({ active_only: true });
      console.log("Full API Response:", JSON.stringify(response, null, 2));

      if (!response) {
        console.error("Response is null or undefined");
        Alert.alert("Lỗi", "Không nhận được phản hồi từ server");
        return;
      }

      if (response.success === false) {
        console.error("Response not successful:", response);
        Alert.alert("Lỗi", response.message || "Không thể tải danh sách nhà thầu phụ");
        return;
      }

      // Backend trả về array trực tiếp khi có active_only và không có search
      // Hoặc paginated data khi có search
      let data = [];

      if (Array.isArray(response.data)) {
        // Trường hợp 1: response.data là array trực tiếp
        data = response.data;
        console.log("Case 1: Direct array, count:", data.length);
      } else if (response.data && typeof response.data === 'object') {
        // Trường hợp 2: response.data là object (có thể là paginated hoặc có nested data)
        if (Array.isArray(response.data.data)) {
          // Paginated response
          data = response.data.data;
          console.log("Case 2: Paginated data, count:", data.length);
        } else if (Array.isArray(response.data)) {
          // Nested array
          data = response.data;
          console.log("Case 3: Nested array, count:", data.length);
        } else {
          console.warn("Case 4: Unexpected data structure:", response.data);
        }
      }

      console.log("Final loaded global subcontractors:", data.length, data);

      if (data.length === 0) {
        console.warn("No subcontractors found. Check if any are created in settings.");
      }

      setGlobalSubcontractors(data);
    } catch (error: any) {
      console.error("Error loading global subcontractors:", error);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response?.data);
      console.error("Error stack:", error.stack);
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || error.message || "Không thể tải danh sách nhà thầu phụ"
      );
    }
  };

  const filteredGlobalSubcontractors = useMemo(() => {
    console.log("Filtering subcontractors. Total:", globalSubcontractors.length, "Search:", subcontractorSearch);
    if (!subcontractorSearch.trim()) {
      console.log("No search, returning all:", globalSubcontractors.length);
      return globalSubcontractors;
    }
    const searchLower = subcontractorSearch.toLowerCase();
    const filtered = globalSubcontractors.filter((sub) => {
      return (
        sub.name?.toLowerCase().includes(searchLower) ||
        sub.code?.toLowerCase().includes(searchLower) ||
        sub.contact_person?.toLowerCase().includes(searchLower) ||
        sub.phone?.toLowerCase().includes(searchLower) ||
        sub.email?.toLowerCase().includes(searchLower)
      );
    });
    console.log("Filtered result:", filtered.length);
    return filtered;
  }, [globalSubcontractors, subcontractorSearch]);

  const loadSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await subcontractorApi.getSubcontractors(id!);
      if (response.success) {
        setSubcontractors(response.data || []);
      }
    } catch (error) {
      console.error("Error loading subcontractors:", error);
    } finally {
      setLoading(false);
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
                <Text style={styles.inputLabel}>Chọn nhà thầu phụ *</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={async () => {
                    // Load lại danh sách khi mở picker
                    console.log("Opening subcontractor picker, current count:", globalSubcontractors.length);
                    try {
                      await loadGlobalSubcontractors();
                      setShowSubcontractorPicker(true);
                    } catch (error) {
                      console.error("Error loading before opening picker:", error);
                      // Vẫn mở picker để user thấy được thông báo lỗi hoặc dữ liệu cũ
                      setShowSubcontractorPicker(true);
                    }
                  }}
                >
                  <View style={styles.selectButtonContent}>
                    {selectedGlobalSubcontractor ? (
                      <View style={styles.selectedSubcontractorPreview}>
                        <Text style={styles.selectButtonText}>
                          {selectedGlobalSubcontractor.name}
                        </Text>
                        {selectedGlobalSubcontractor.code && (
                          <Text style={styles.selectedSubcontractorCode}>
                            Mã: {selectedGlobalSubcontractor.code}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.selectButtonText,
                          styles.selectButtonPlaceholder,
                        ]}
                      >
                        Chọn nhà thầu phụ
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {selectedGlobalSubcontractor && (
                  <View style={styles.selectedSubcontractorInfo}>
                    {selectedGlobalSubcontractor.phone && (
                      <Text style={styles.infoText}>
                        <Ionicons name="call-outline" size={14} color="#6B7280" /> {selectedGlobalSubcontractor.phone}
                      </Text>
                    )}
                    {selectedGlobalSubcontractor.contact_person && (
                      <Text style={styles.infoText}>
                        <Ionicons name="person-outline" size={14} color="#6B7280" /> {selectedGlobalSubcontractor.contact_person}
                      </Text>
                    )}
                  </View>
                )}
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
                    if (!selectedGlobalSubcontractor || !formData.total_quote) {
                      Alert.alert("Lỗi", "Vui lòng chọn nhà thầu phụ và nhập tổng báo giá");
                      return;
                    }
                    try {
                      await subcontractorApi.createSubcontractor(id!, {
                        global_subcontractor_id: selectedGlobalSubcontractor.id,
                        category: formData.category || undefined,
                        total_quote: parseFloat(formData.total_quote),
                        advance_payment: formData.advance_payment
                          ? parseFloat(formData.advance_payment)
                          : undefined,
                      });
                      setModalVisible(false);
                      setFormData({
                        global_subcontractor_id: "",
                        category: "",
                        total_quote: "",
                        advance_payment: "",
                      });
                      setSelectedGlobalSubcontractor(null);
                      setModalVisible(false);
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

      {/* Global Subcontractor Picker Modal */}
      <Modal
        visible={showSubcontractorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubcontractorPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn Nhà Thầu Phụ</Text>
              <TouchableOpacity onPress={() => {
                setShowSubcontractorPicker(false);
                setSubcontractorSearch("");
              }}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            {/* Debug Info */}
            {__DEV__ && (
              <View style={{ padding: 8, backgroundColor: "#FEF3C7", marginHorizontal: 16, marginTop: 8, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, color: "#92400E" }}>
                  Debug: Total={globalSubcontractors.length}, Filtered={filteredGlobalSubcontractors.length}
                </Text>
              </View>
            )}
            <View style={styles.pickerSearchContainer}>
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Tìm kiếm nhà thầu phụ..."
                placeholderTextColor="#9CA3AF"
                value={subcontractorSearch}
                onChangeText={setSubcontractorSearch}
              />
              {subcontractorSearch.length > 0 && (
                <TouchableOpacity onPress={() => setSubcontractorSearch("")}>
                  <Ionicons name="close-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={filteredGlobalSubcontractors}
              keyExtractor={(item) => item.id.toString()}
              extraData={filteredGlobalSubcontractors.length}
              ListHeaderComponent={
                <View style={{ padding: 16, backgroundColor: "#F9FAFB" }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    {filteredGlobalSubcontractors.length > 0
                      ? subcontractorSearch
                        ? `Tìm thấy ${filteredGlobalSubcontractors.length} nhà thầu phụ`
                        : `Tổng cộng ${filteredGlobalSubcontractors.length} nhà thầu phụ`
                      : subcontractorSearch
                        ? "Không tìm thấy nhà thầu phụ nào"
                        : "Chưa có nhà thầu phụ nào"}
                  </Text>
                  {globalSubcontractors.length === 0 && (
                    <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                      Vui lòng tạo nhà thầu phụ trong phần Cấu hình
                    </Text>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.subcontractorOption,
                    selectedGlobalSubcontractor?.id === item.id && styles.subcontractorOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedGlobalSubcontractor(item);
                    setFormData({ ...formData, global_subcontractor_id: item.id.toString() });
                    setShowSubcontractorPicker(false);
                    setSubcontractorSearch("");
                  }}
                >
                  <View style={styles.subcontractorOptionContent}>
                    <Text
                      style={[
                        styles.subcontractorOptionName,
                        selectedGlobalSubcontractor?.id === item.id && styles.subcontractorOptionNameActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.code && (
                      <Text style={styles.subcontractorOptionCode}>Mã: {item.code}</Text>
                    )}
                    {item.phone && (
                      <Text style={styles.subcontractorOptionInfo}>
                        <Ionicons name="call-outline" size={14} color="#6B7280" /> {item.phone}
                      </Text>
                    )}
                  </View>
                  {selectedGlobalSubcontractor?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.pickerEmptyContainer}>
                  <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.pickerEmptyText}>Chưa có nhà thầu phụ nào</Text>
                  <Text style={styles.pickerEmptySubtext}>
                    Vui lòng tạo nhà thầu phụ trong phần Cấu hình
                  </Text>
                </View>
              }
            />
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
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    gap: 12,
  },
  selectButtonContent: {
    flex: 1,
  },
  selectedSubcontractorPreview: {
    flex: 1,
  },
  selectedSubcontractorCode: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  selectButtonText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  selectButtonPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  selectedSubcontractorInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  pickerSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    minHeight: 48,
  },
  pickerSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 20,
  },
  subcontractorOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  subcontractorOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  subcontractorOptionContent: {
    flex: 1,
  },
  subcontractorOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  subcontractorOptionNameActive: {
    color: "#3B82F6",
  },
  subcontractorOptionCode: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  subcontractorOptionInfo: {
    fontSize: 12,
    color: "#6B7280",
  },
  pickerEmptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  pickerEmptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  pickerEmptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
