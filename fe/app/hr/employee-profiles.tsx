import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  employeeProfileApi,
  EmployeeProfile,
  CreateEmployeeProfileData,
} from "@/api/employeeProfileApi";
import { employeesApi } from "@/api/employeesApi";
import { subcontractorApi } from "@/api/subcontractorApi";
import FileUploader from "@/components/FileUploader";

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  official: "Nhân sự chính thức",
  temporary: "Nhân sự thời vụ / khoán",
  contracted: "Nhân sự thuê ngoài / thầu phụ",
  engineer: "Kỹ sư – chỉ huy trưởng – giám sát",
  worker: "Công nhân theo đội / tổ / nhà thầu",
};

export default function EmployeeProfilesScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<EmployeeProfile | null>(null);
  const [formData, setFormData] = useState<Partial<CreateEmployeeProfileData>>({
    user_id: 0,
    employee_type: "official",
  });
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    loadProfiles();
    loadUsers();
    loadSubcontractors();
  }, []);

  const loadProfiles = async (pageNum: number = 1, search: string = "", type: string = "") => {
    try {
      setLoading(pageNum === 1);
      const response = await employeeProfileApi.getProfiles({
        page: pageNum,
        search: search || undefined,
        employee_type: type || undefined,
        per_page: 20,
      });
      if (response.success) {
        if (pageNum === 1) {
          setProfiles(response.data || []);
        } else {
          setProfiles((prev) => [...prev, ...(response.data || [])]);
        }
        setHasMore(
          response.pagination?.current_page < response.pagination?.last_page
        );
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách hồ sơ nhân sự");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await employeesApi.getEmployees({ per_page: 1000 });
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSubcontractors = async () => {
    try {
      // Load subcontractors if needed
      // const response = await subcontractorApi.getSubcontractors();
      // setSubcontractors(response.data || []);
    } catch (error) {
      console.error("Error loading subcontractors:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadProfiles(1, searchQuery, selectedType);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    loadProfiles(1, text, selectedType);
  };

  const handleTypeFilter = (type: string) => {
    const newType = selectedType === type ? "" : type;
    setSelectedType(newType);
    setPage(1);
    loadProfiles(1, searchQuery, newType);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadProfiles(nextPage, searchQuery, selectedType);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProfile(null);
    setFormData({
      user_id: 0,
      employee_type: "official",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (profile: EmployeeProfile) => {
    setEditingProfile(profile);
    setFormData({
      user_id: profile.user_id,
      employee_code: profile.employee_code,
      full_name: profile.full_name,
      cccd: profile.cccd,
      date_of_birth: profile.date_of_birth,
      place_of_birth: profile.place_of_birth,
      phone: profile.phone,
      emergency_contact_name: profile.emergency_contact_name,
      emergency_contact_phone: profile.emergency_contact_phone,
      education_level: profile.education_level,
      skills: profile.skills,
      profile_photo: profile.profile_photo,
      legal_documents: profile.legal_documents,
      employee_type: profile.employee_type,
      team_name: profile.team_name,
      subcontractor_id: profile.subcontractor_id,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.user_id || formData.user_id === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn nhân viên");
      return;
    }

    if (!formData.employee_type) {
      Alert.alert("Lỗi", "Vui lòng chọn loại nhân sự");
      return;
    }

    try {
      setSubmitting(true);
      let response;
      if (editingProfile) {
        response = await employeeProfileApi.updateProfile(editingProfile.id, formData);
      } else {
        response = await employeeProfileApi.createProfile(formData as CreateEmployeeProfileData);
      }

      if (response.success) {
        Alert.alert("Thành công", editingProfile ? "Đã cập nhật hồ sơ" : "Đã tạo hồ sơ");
        setShowModal(false);
        loadProfiles();
      } else {
        Alert.alert("Lỗi", response.message || "Có lỗi xảy ra");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu hồ sơ"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn xóa hồ sơ này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await employeeProfileApi.deleteProfile(id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa hồ sơ");
                loadProfiles();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa hồ sơ");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: EmployeeProfile }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => handleOpenEditModal(item)}
      >
        <View style={styles.avatarContainer}>
          {item.profile_photo ? (
            <Ionicons name="person-circle" size={48} color="#3B82F6" />
          ) : (
            <Ionicons name="person-circle-outline" size={48} color="#9CA3AF" />
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.employeeName}>
            {item.full_name || item.user?.name || "N/A"}
          </Text>
          {item.employee_code && (
            <Text style={styles.employeeCode}>Mã: {item.employee_code}</Text>
          )}
          {item.phone && <Text style={styles.employeePhone}>{item.phone}</Text>}
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {EMPLOYEE_TYPE_LABELS[item.employee_type] || item.employee_type}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash" size={18} color="#EF4444" />
          <Text style={[styles.actionButtonText, { color: "#EF4444" }]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && profiles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm hồ sơ..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearch("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {Object.entries(EMPLOYEE_TYPE_LABELS).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterChip,
              selectedType === key && styles.filterChipActive,
            ]}
            onPress={() => handleTypeFilter(key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === key && styles.filterChipTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={profiles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedType
                ? "Không tìm thấy hồ sơ"
                : "Không có dữ liệu"}
            </Text>
          </View>
        }
      />

      {/* FAB Button */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenCreateModal}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProfile ? "Chỉnh sửa hồ sơ" : "Tạo hồ sơ mới"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* User Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nhân viên *</Text>
                <View style={styles.selectContainer}>
                  {users.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.selectOption,
                        formData.user_id === user.id && styles.selectOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, user_id: user.id })}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          formData.user_id === user.id && styles.selectOptionTextActive,
                        ]}
                      >
                        {user.name} ({user.email})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Employee Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Loại nhân sự *</Text>
                <View style={styles.selectContainer}>
                  {Object.entries(EMPLOYEE_TYPE_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.selectOption,
                        formData.employee_type === key && styles.selectOptionActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, employee_type: key as any })
                      }
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          formData.employee_type === key && styles.selectOptionTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Employee Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mã nhân sự</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Để trống để tự động tạo"
                  value={formData.employee_code}
                  onChangeText={(text) =>
                    setFormData({ ...formData, employee_code: text })
                  }
                />
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ tên</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ tên"
                  value={formData.full_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, full_name: text })
                  }
                />
              </View>

              {/* CCCD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CCCD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số CCCD"
                  value={formData.cccd}
                  onChangeText={(text) =>
                    setFormData({ ...formData, cccd: text })
                  }
                  keyboardType="numeric"
                />
              </View>

              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ngày sinh</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.date_of_birth}
                  onChangeText={(text) =>
                    setFormData({ ...formData, date_of_birth: text })
                  }
                />
              </View>

              {/* Place of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quê quán</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập quê quán"
                  value={formData.place_of_birth}
                  onChangeText={(text) =>
                    setFormData({ ...formData, place_of_birth: text })
                  }
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại"
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              {/* Emergency Contact */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Người liên hệ khẩn cấp</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tên người liên hệ"
                  value={formData.emergency_contact_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, emergency_contact_name: text })
                  }
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Số điện thoại"
                  value={formData.emergency_contact_phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, emergency_contact_phone: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              {/* Education Level */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Trình độ học vấn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Đại học, Cao đẳng..."
                  value={formData.education_level}
                  onChangeText={(text) =>
                    setFormData({ ...formData, education_level: text })
                  }
                />
              </View>

              {/* Skills */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tay nghề</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả tay nghề, kỹ năng..."
                  value={formData.skills}
                  onChangeText={(text) =>
                    setFormData({ ...formData, skills: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Team Name (for workers) */}
              {(formData.employee_type === "worker" ||
                formData.employee_type === "contracted") && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tên đội/tổ/nhà thầu</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập tên đội/tổ/nhà thầu"
                    value={formData.team_name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, team_name: text })
                    }
                  />
                </View>
              )}

              {/* File Uploads */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hồ sơ pháp lý</Text>
                <FileUploader
                  onUploadComplete={(attachmentIds) => {
                    setFormData({
                      ...formData,
                      legal_documents: attachmentIds,
                    });
                  }}
                  initialAttachmentIds={formData.legal_documents}
                  multiple={true}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingProfile ? "Cập nhật" : "Tạo hồ sơ"}
                  </Text>
                )}
              </TouchableOpacity>
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
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#3B82F6",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  deleteButton: {
    // Additional styles if needed
  },
  actionButtonText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  avatarContainer: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  employeeCode: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  selectOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  selectOptionText: {
    fontSize: 14,
    color: "#1F2937",
  },
  selectOptionTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});


