import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { additionalCostApi } from "@/api/additionalCostApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";

export default function CreateAdditionalCostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({ amount: "", description: "" });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFilesUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    const ids = files
      .map((f) => f.id || f.attachment_id)
      .filter((id): id is number => id !== undefined);
    setAttachmentIds(ids);
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.description) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);
      const response = await additionalCostApi.createAdditionalCost(id!, {
        amount: parseFloat(formData.amount),
        description: formData.description,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Chi phí phát sinh đã được đề xuất.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Thêm Chi Phí Phát Sinh"
        showBackButton
        rightComponent={
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#3B82F6" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Gửi</Text>
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + tabBarHeight + 40, 100) }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.formGroup}>
            <Text style={styles.label}>Số tiền (VND) *</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(text) =>
                setFormData({ ...formData, amount: text })
              }
              placeholder="Nhập số tiền"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mô tả *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Nhập mô tả chi phí"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Đính kèm file/hình ảnh</Text>
            <UniversalFileUploader
              onUploadComplete={handleFilesUpload}
              multiple={true}
              accept="all"
              maxFiles={10}
              initialFiles={uploadedFiles}
              showPreview={true}
              label="Chọn file để đính kèm"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
    minHeight: 48,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
});
