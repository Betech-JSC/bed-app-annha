import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { projectApi, CreateProjectData } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function CreateProjectScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
      const response = await projectApi.createProject({
        ...formData,
        code: formData.code || undefined,
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo Dự Án Mới</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Tên dự án <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên dự án"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mã dự án</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập mã dự án (tùy chọn)"
              value={formData.code}
              onChangeText={(text) => setFormData({ ...formData, code: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Khách hàng <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập ID khách hàng"
              value={formData.customer_id ? formData.customer_id.toString() : ""}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  customer_id: text ? parseInt(text) : 0,
                })
              }
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>
              Tạm thời nhập ID khách hàng. Sẽ cải thiện bằng dropdown sau.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Quản lý dự án</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập ID quản lý dự án (tùy chọn)"
              value={
                formData.project_manager_id
                  ? formData.project_manager_id.toString()
                  : ""
              }
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  project_manager_id: text ? parseInt(text) : undefined,
                })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ngày bắt đầu</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>
                {formData.start_date
                  ? new Date(formData.start_date).toLocaleDateString("vi-VN")
                  : "Chọn ngày bắt đầu"}
              </Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.start_date ? new Date(formData.start_date) : new Date()}
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
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>
                {formData.end_date
                  ? new Date(formData.end_date).toLocaleDateString("vi-VN")
                  : "Chọn ngày kết thúc"}
              </Text>
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={formData.end_date ? new Date(formData.end_date) : new Date()}
                mode="date"
                display="default"
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập mô tả dự án (tùy chọn)"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              multiline
              numberOfLines={4}
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
    </View>
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
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
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
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontWeight: "600",
    fontSize: 16,
  },
  createButton: {
    backgroundColor: "#3B82F6",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
