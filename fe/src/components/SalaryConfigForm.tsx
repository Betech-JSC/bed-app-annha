import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { CreateSalaryConfigData } from "@/api/salaryConfigApi";

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
    effective_from: initialData?.effective_from || new Date().toISOString().split("T")[0],
    effective_to: initialData?.effective_to,
  });

  const handleSubmit = () => {
    if (!formData.user_id || !formData.effective_from) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
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
              value={formData.hourly_rate?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  hourly_rate: parseFloat(text) || undefined,
                })
              }
              keyboardType="numeric"
            />
          </View>
        )}

        {formData.salary_type === "daily" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lương theo ngày *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lương theo ngày"
              value={formData.daily_rate?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  daily_rate: parseFloat(text) || undefined,
                })
              }
              keyboardType="numeric"
            />
          </View>
        )}

        {formData.salary_type === "monthly" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lương theo tháng *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lương theo tháng"
              value={formData.monthly_salary?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  monthly_salary: parseFloat(text) || undefined,
                })
              }
              keyboardType="numeric"
            />
          </View>
        )}

        {formData.salary_type === "project_based" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lương theo dự án *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lương theo dự án"
              value={formData.project_rate?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  project_rate: parseFloat(text) || undefined,
                })
              }
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Có hiệu lực từ *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.effective_from}
            onChangeText={(text) =>
              setFormData({ ...formData, effective_from: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Có hiệu lực đến</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (tùy chọn)"
            value={formData.effective_to}
            onChangeText={(text) =>
              setFormData({ ...formData, effective_to: text || undefined })
            }
          />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  form: {
    padding: 16,
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
    backgroundColor: "#FFFFFF",
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
});
