import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { CreateBonusData } from "@/api/bonusApi";

interface BonusFormProps {
  onSubmit: (data: CreateBonusData) => void;
  onCancel: () => void;
  initialData?: Partial<CreateBonusData>;
}

export default function BonusForm({
  onSubmit,
  onCancel,
  initialData,
}: BonusFormProps) {
  const [formData, setFormData] = useState<CreateBonusData>({
    user_id: initialData?.user_id || 0,
    project_id: initialData?.project_id,
    bonus_type: initialData?.bonus_type || "manual",
    amount: initialData?.amount || 0,
    calculation_method: initialData?.calculation_method || "manual",
    period_start: initialData?.period_start,
    period_end: initialData?.period_end,
    description: initialData?.description || "",
  });

  const handleSubmit = () => {
    if (!formData.user_id || !formData.amount) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Loại thưởng</Text>
          <View style={styles.radioGroup}>
            {["performance", "project_completion", "manual", "other"].map(
              (type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioButton,
                    formData.bonus_type === type && styles.radioButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, bonus_type: type as any })
                  }
                >
                  <Text
                    style={[
                      styles.radioText,
                      formData.bonus_type === type && styles.radioTextActive,
                    ]}
                  >
                    {type === "performance"
                      ? "Hiệu suất"
                      : type === "project_completion"
                        ? "Hoàn thành dự án"
                        : type === "manual"
                          ? "Thủ công"
                          : "Khác"}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số tiền *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số tiền"
            value={formData.amount?.toString()}
            onChangeText={(text) =>
              setFormData({ ...formData, amount: parseFloat(text) || 0 })
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhập mô tả"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            multiline
            numberOfLines={4}
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
