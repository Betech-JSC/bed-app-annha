import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { employeesApi, Employee } from "@/api/employeesApi";
import { projectApi } from "@/api/projectApi";

interface BulkScheduleFormProps {
  onSubmit: (data: {
    user_ids: number[];
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    type: "work" | "leave" | "holiday" | "overtime";
    project_id?: number;
    notes?: string;
    skip_weekends?: boolean;
  }) => void;
  onCancel: () => void;
}

export default function BulkScheduleForm({
  onSubmit,
  onCancel,
}: BulkScheduleFormProps) {
  const [formData, setFormData] = useState({
    start_date: new Date(),
    end_date: new Date(),
    start_time: new Date(),
    end_time: new Date(),
    type: "work" as "work" | "leave" | "holiday" | "overtime",
    notes: "",
    skip_weekends: false,
  });

  const [selectedUsers, setSelectedUsers] = useState<Employee[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [users, setUsers] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await employeesApi.getEmployees({ per_page: 100 });
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await projectApi.getProjects({ page: 1 });
      if (response.success) {
        setProjects(response.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      !userSearch ||
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (project) =>
      !projectSearch ||
      project.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleToggleUser = (user: Employee) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleSelectProject = (project: any) => {
    setSelectedProject(project);
    setShowProjectModal(false);
    setProjectSearch("");
  };

  const calculatePreview = () => {
    if (!formData.start_date || !formData.end_date) return 0;

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    let days = 0;
    const current = new Date(start);

    while (current <= end) {
      if (!formData.skip_weekends || (current.getDay() !== 0 && current.getDay() !== 6)) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days * selectedUsers.length;
  };

  const handleSubmit = () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất một nhân viên");
      return;
    }

    const startTimeStr = formData.start_time.toTimeString().slice(0, 5);
    const endTimeStr = formData.end_time.toTimeString().slice(0, 5);

    onSubmit({
      user_ids: selectedUsers.map((u) => u.id),
      start_date: formData.start_date.toISOString().split("T")[0],
      end_date: formData.end_date.toISOString().split("T")[0],
      start_time: startTimeStr,
      end_time: endTimeStr,
      type: formData.type,
      project_id: selectedProject?.id,
      notes: formData.notes || undefined,
      skip_weekends: formData.skip_weekends,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tạo lịch hàng loạt</Text>

      {/* Selected Users */}
      <View style={styles.section}>
        <Text style={styles.label}>Nhân viên *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowUserModal(true)}
        >
          <Text style={styles.selectButtonText}>
            {selectedUsers.length > 0
              ? `Đã chọn ${selectedUsers.length} nhân viên`
              : "Chọn nhân viên"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {selectedUsers.length > 0 && (
          <View style={styles.selectedChips}>
            {selectedUsers.map((user) => (
              <View key={user.id} style={styles.chip}>
                <Text style={styles.chipText}>{user.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))
                  }
                >
                  <Ionicons name="close-circle" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Date Range */}
      <View style={styles.section}>
        <Text style={styles.label}>Từ ngày *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={styles.selectButtonText}>
            {formData.start_date.toLocaleDateString("vi-VN")}
          </Text>
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Đến ngày *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Text style={styles.selectButtonText}>
            {formData.end_date.toLocaleDateString("vi-VN")}
          </Text>
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Time */}
      <View style={styles.section}>
        <Text style={styles.label}>Giờ bắt đầu *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowStartTimePicker(true)}
        >
          <Text style={styles.selectButtonText}>
            {formData.start_time.toTimeString().slice(0, 5)}
          </Text>
          <Ionicons name="time-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Giờ kết thúc *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowEndTimePicker(true)}
        >
          <Text style={styles.selectButtonText}>
            {formData.end_time.toTimeString().slice(0, 5)}
          </Text>
          <Ionicons name="time-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Loại lịch *</Text>
        <View style={styles.typeButtons}>
          {(["work", "leave", "holiday", "overtime"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                formData.type === type && styles.typeButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, type })}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  formData.type === type && styles.typeButtonTextActive,
                ]}
              >
                {type === "work"
                  ? "Làm việc"
                  : type === "leave"
                    ? "Nghỉ phép"
                    : type === "holiday"
                      ? "Lễ"
                      : "Tăng ca"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Project */}
      <View style={styles.section}>
        <Text style={styles.label}>Dự án (tùy chọn)</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowProjectModal(true)}
        >
          <Text style={styles.selectButtonText}>
            {selectedProject?.name || "Chọn dự án"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          style={styles.textArea}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Nhập ghi chú..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Skip Weekends */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() =>
            setFormData({
              ...formData,
              skip_weekends: !formData.skip_weekends,
            })
          }
        >
          <Ionicons
            name={formData.skip_weekends ? "checkbox" : "square-outline"}
            size={24}
            color={formData.skip_weekends ? "#3B82F6" : "#6B7280"}
          />
          <Text style={styles.checkboxLabel}>Bỏ qua cuối tuần</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      {selectedUsers.length > 0 && (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Sẽ tạo:</Text>
          <Text style={styles.previewValue}>
            {calculatePreview()} lịch làm việc
          </Text>
          <Text style={styles.previewSubtext}>
            ({selectedUsers.length} nhân viên × {calculatePreview() / selectedUsers.length} ngày)
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Tạo lịch</Text>
        </TouchableOpacity>
      </View>

      {/* User Selection Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn nhân viên</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm nhân viên..."
              value={userSearch}
              onChangeText={setUserSearch}
            />
            {loadingUsers ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const isSelected = selectedUsers.some((u) => u.id === item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.userItem,
                        isSelected && styles.userItemSelected,
                      ]}
                      onPress={() => handleToggleUser(item)}
                    >
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={24}
                        color={isSelected ? "#3B82F6" : "#6B7280"}
                      />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Project Selection Modal */}
      <Modal
        visible={showProjectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn dự án</Text>
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm dự án..."
              value={projectSearch}
              onChangeText={setProjectSearch}
            />
            {loadingProjects ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <FlatList
                data={filteredProjects}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleSelectProject(item)}
                  >
                    <Text style={styles.userName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.start_date}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) {
              setFormData({ ...formData, start_date: date });
            }
          }}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={formData.end_date}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) {
              setFormData({ ...formData, end_date: date });
            }
          }}
        />
      )}
      {showStartTimePicker && (
        <DateTimePicker
          value={formData.start_time}
          mode="time"
          display="default"
          onChange={(event, date) => {
            setShowStartTimePicker(false);
            if (date) {
              setFormData({ ...formData, start_time: date });
            }
          }}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          value={formData.end_time}
          mode="time"
          display="default"
          onChange={(event, date) => {
            setShowEndTimePicker(false);
            if (date) {
              setFormData({ ...formData, end_time: date });
            }
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
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
    fontSize: 14,
    color: "#1F2937",
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  typeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  typeButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#1F2937",
  },
  previewBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  previewLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#10B981",
  },
  previewSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
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
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  userItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
  },
});


