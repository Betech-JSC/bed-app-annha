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
import { projectRiskApi, CreateProjectRiskData } from "@/api/projectRiskApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function CreateRiskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProjectRiskData>({
    title: "",
    description: "",
    category: "other",
    probability: "medium",
    impact: "medium",
    risk_type: "threat",
    mitigation_plan: "",
    contingency_plan: "",
    target_resolution_date: "",
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề rủi ro");
      return;
    }

    try {
      setLoading(true);
      const response = await projectRiskApi.createRisk(id!, formData);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo rủi ro mới", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo rủi ro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tạo Rủi Ro Mới" />
      <ScrollView style={[styles.scrollView, { marginBottom: tabBarHeight }]}>
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tiêu đề *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Nhập tiêu đề rủi ro"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Mô tả chi tiết rủi ro"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Danh mục *</Text>
            <View style={styles.optionsGrid}>
              {["schedule", "cost", "quality", "scope", "resource", "technical", "external", "other"].map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.optionButton,
                      formData.category === cat && styles.optionButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat as any })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        formData.category === cat && styles.optionTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Xác suất *</Text>
            <View style={styles.optionsGrid}>
              {["very_low", "low", "medium", "high", "very_high"].map((prob) => (
                <TouchableOpacity
                  key={prob}
                  style={[
                    styles.optionButton,
                    formData.probability === prob && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, probability: prob as any })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.probability === prob && styles.optionTextActive,
                    ]}
                  >
                    {prob.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tác động *</Text>
            <View style={styles.optionsGrid}>
              {["very_low", "low", "medium", "high", "very_high"].map((imp) => (
                <TouchableOpacity
                  key={imp}
                  style={[
                    styles.optionButton,
                    formData.impact === imp && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, impact: imp as any })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.impact === imp && styles.optionTextActive,
                    ]}
                  >
                    {imp.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Loại rủi ro</Text>
            <View style={styles.optionsGrid}>
              {["threat", "opportunity"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    formData.risk_type === type && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, risk_type: type as any })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.risk_type === type && styles.optionTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kế hoạch giảm thiểu</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.mitigation_plan}
              onChangeText={(text) => setFormData({ ...formData, mitigation_plan: text })}
              placeholder="Mô tả kế hoạch giảm thiểu rủi ro"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kế hoạch dự phòng</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.contingency_plan}
              onChangeText={(text) => setFormData({ ...formData, contingency_plan: text })}
              placeholder="Mô tả kế hoạch dự phòng"
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
              <Text style={styles.submitButtonText}>Tạo Rủi Ro</Text>
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

