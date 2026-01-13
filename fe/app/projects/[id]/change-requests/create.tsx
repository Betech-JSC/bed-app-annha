import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { changeRequestApi, CreateChangeRequestData } from "@/api/changeRequestApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function CreateChangeRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateChangeRequestData>({
    title: "",
    description: "",
    change_type: "other",
    priority: "medium",
    reason: "",
    impact_analysis: "",
    estimated_cost_impact: undefined,
    estimated_schedule_impact_days: undefined,
    implementation_plan: "",
  });

  // Helper functions to translate English to Vietnamese
  const getChangeTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      scope: "Phạm vi",
      schedule: "Tiến độ",
      cost: "Chi phí",
      quality: "Chất lượng",
      resource: "Nguồn lực",
      other: "Khác",
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      low: "Thấp",
      medium: "Trung bình",
      high: "Cao",
      urgent: "Khẩn cấp",
    };
    return labels[priority] || priority;
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề");
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mô tả");
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        estimated_cost_impact: formData.estimated_cost_impact
          ? parseFloat(formData.estimated_cost_impact.toString())
          : undefined,
        estimated_schedule_impact_days: formData.estimated_schedule_impact_days
          ? parseInt(formData.estimated_schedule_impact_days.toString())
          : undefined,
      };
      const response = await changeRequestApi.createChangeRequest(id!, submitData);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo yêu cầu thay đổi", [
          { text: "Đồng ý", onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo yêu cầu thay đổi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tạo Yêu Cầu Thay Đổi" />
      <ScrollView style={[styles.scrollView, { marginBottom: tabBarHeight }]}>
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tiêu đề *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Nhập tiêu đề yêu cầu thay đổi"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mô tả *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Mô tả chi tiết yêu cầu thay đổi"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Loại thay đổi *</Text>
            <View style={styles.optionsGrid}>
              {["scope", "schedule", "cost", "quality", "resource", "other"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    formData.change_type === type && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, change_type: type as any })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.change_type === type && styles.optionTextActive,
                    ]}
                  >
                    {getChangeTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Ưu tiên *</Text>
            <View style={styles.optionsGrid}>
              {["low", "medium", "high", "urgent"].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.optionButton,
                    formData.priority === priority && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, priority: priority as any })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.priority === priority && styles.optionTextActive,
                    ]}
                  >
                    {getPriorityLabel(priority)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Lý do</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.reason}
              onChangeText={(text) => setFormData({ ...formData, reason: text })}
              placeholder="Lý do yêu cầu thay đổi"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phân tích tác động</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.impact_analysis}
              onChangeText={(text) => setFormData({ ...formData, impact_analysis: text })}
              placeholder="Phân tích tác động của thay đổi"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tác động chi phí (VNĐ)</Text>
            <TextInput
              style={styles.input}
              value={formData.estimated_cost_impact?.toString() || ""}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  estimated_cost_impact: text ? parseFloat(text) : undefined,
                })
              }
              placeholder="Nhập số tiền"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tác động tiến độ (ngày)</Text>
            <TextInput
              style={styles.input}
              value={formData.estimated_schedule_impact_days?.toString() || ""}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  estimated_schedule_impact_days: text ? parseInt(text) : undefined,
                })
              }
              placeholder="Nhập số ngày"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kế hoạch triển khai</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.implementation_plan}
              onChangeText={(text) => setFormData({ ...formData, implementation_plan: text })}
              placeholder="Mô tả kế hoạch triển khai"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Tạo Yêu Cầu</Text>
            )}
          </TouchableOpacity>
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
  scrollView: {
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
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  optionText: {
    fontSize: 14,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  optionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
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


