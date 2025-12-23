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
import { CreateWorkScheduleData } from "@/api/workScheduleApi";

interface WorkScheduleFormProps {
  visible: boolean;
  initialDate?: Date;
  onSubmit: (data: CreateWorkScheduleData) => Promise<void>;
  onCancel: () => void;
}

const TYPE_OPTIONS = [
  { value: "work" as const, label: "Làm việc" },
  { value: "leave" as const, label: "Nghỉ phép" },
  { value: "holiday" as const, label: "Lễ" },
  { value: "overtime" as const, label: "Tăng ca" },
];

export default function WorkScheduleForm({
  visible,
  initialDate,
  onSubmit,
  onCancel,
}: WorkScheduleFormProps) {
  const [formData, setFormData] = useState({
    date: initialDate || new Date(),
    start_time: new Date(),
    end_time: new Date(),
    type: "work" as "work" | "leave" | "holiday" | "overtime",
    notes: "",
  });

  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [users, setUsers] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsers();
      loadProjects();
      if (initialDate) {
        setFormData((prev) => ({ ...prev, date: initialDate }));
      }
    }
  }, [visible, initialDate]);

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

  const handleSubmit = async () => {
    if (!selectedUser) {
      Alert.alert("Lỗi", "Vui lòng chọn nhân viên");
      return;
    }

    if (formData.start_time >= formData.end_time) {
      Alert.alert("Lỗi", "Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }

    try {
      setSubmitting(true);
      const startTimeStr = formData.start_time.toTimeString().slice(0, 5);
      const endTimeStr = formData.end_time.toTimeString().slice(0, 5);

      const data: CreateWorkScheduleData = {
        user_id: selectedUser.id,
        project_id: selectedProject?.id,
        date: formData.date.toISOString().split("T")[0],
        start_time: startTimeStr,
        end_time: endTimeStr,
        type: formData.type,
        notes: formData.notes.trim() || undefined,
      };

      await onSubmit(data);
      
      // Reset form
      setFormData({
        date: initialDate || new Date(),
        start_time: new Date(),
        end_time: new Date(),
        type: "work",
        notes: "",
      });
      setSelectedUser(null);
      setSelectedProject(null);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo lịch làm việc"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Tạo lịch làm việc</Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* User Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>Nhân viên *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowUserModal(true)}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !selectedUser && styles.selectButtonTextPlaceholder,
                  ]}
                >
                  {selectedUser ? selectedUser.name : "Chọn nhân viên"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Project Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>Dự án (tùy chọn)</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowProjectModal(true)}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !selectedProject && styles.selectButtonTextPlaceholder,
                  ]}
                >
                  {selectedProject ? selectedProject.name : "Chọn dự án"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Ngày *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.selectButtonText}>
                  {formData.date.toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setFormData((prev) => ({ ...prev, date }));
                    }
                  }}
                />
              )}
            </View>

            {/* Start Time */}
            <View style={styles.field}>
              <Text style={styles.label}>Giờ bắt đầu *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.selectButtonText}>
                  {formData.start_time.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={formData.start_time}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartTimePicker(false);
                    if (date) {
                      setFormData((prev) => ({ ...prev, start_time: date }));
                    }
                  }}
                />
              )}
            </View>

            {/* End Time */}
            <View style={styles.field}>
              <Text style={styles.label}>Giờ kết thúc *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.selectButtonText}>
                  {formData.end_time.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={formData.end_time}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowEndTimePicker(false);
                    if (date) {
                      setFormData((prev) => ({ ...prev, end_time: date }));
                    }
                  }}
                />
              )}
            </View>

            {/* Type */}
            <View style={styles.field}>
              <Text style={styles.label}>Loại *</Text>
              <View style={styles.typeOptions}>
                {TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.typeButton,
                      formData.type === option.value && styles.typeButtonActive,
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, type: option.value }))
                    }
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === option.value &&
                          styles.typeButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={styles.textArea}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, notes: text }))
                }
                placeholder="Nhập ghi chú (tùy chọn)"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Tạo</Text>
              )}
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
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.userItem,
                          selectedUser?.id === item.id && styles.userItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedUser(item);
                          setShowUserModal(false);
                          setUserSearch("");
                        }}
                      >
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                      </TouchableOpacity>
                    )}
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
                        style={[
                          styles.userItem,
                          selectedProject?.id === item.id &&
                            styles.userItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedProject(item);
                          setShowProjectModal(false);
                          setProjectSearch("");
                        }}
                      >
                        <Text style={styles.userName}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
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
  selectButtonTextPlaceholder: {
    color: "#9CA3AF",
  },
  typeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
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
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    height: 80,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  userItemSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});

