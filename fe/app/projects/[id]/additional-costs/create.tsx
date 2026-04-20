import React, { useEffect, useState } from "react";
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
import { ScreenHeader, PermissionGuard, CurrencyInput } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { Permissions } from "@/constants/Permissions";

export default function CreateAdditionalCostScreen() {
  const router = useRouter();
  const { id, editId } = useLocalSearchParams<{ id: string; editId?: string }>();
  const isEdit = !!editId;
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({ amount: 0, description: "" });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await additionalCostApi.getAdditionalCost(id!, editId!);
        if (res.success && res.data) {
          setFormData({ amount: Number(res.data.amount) || 0, description: res.data.description || "" });
          if (Array.isArray(res.data.attachments)) {
            const files = res.data.attachments.map((a: any) => ({ id: a.id, attachment_id: a.id, file_url: a.file_url, file_name: a.original_name || a.file_name, original_name: a.original_name, mime_type: a.mime_type }));
            setUploadedFiles(files);
            setAttachmentIds(res.data.attachments.map((a: any) => a.id));
          }
        }
      } catch (error: any) {
        Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải dữ liệu.");
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [id, editId, isEdit]);

  const handleFilesUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    const ids = files
      .map((f) => f.id || f.attachment_id)
      .filter((id): id is number => id !== undefined);
    setAttachmentIds(ids);
  };

  const handleSubmit = async () => {
    if (!formData.amount || formData.amount <= 0 || !formData.description) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        amount: formData.amount,
        description: formData.description,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      };
      const response = isEdit
        ? await additionalCostApi.updateAdditionalCost(id!, editId!, payload)
        : await additionalCostApi.createAdditionalCost(id!, payload);

      if (response.success) {
        Alert.alert("Thành công", isEdit ? "Đã cập nhật chi phí phát sinh." : "Chi phí phát sinh đã được đề xuất.", [
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
        title={isEdit ? "Sửa Chi Phí Phát Sinh" : "Thêm Chi Phí Phát Sinh"}
        showBackButton
        rightComponent={
          <PermissionGuard permission={isEdit ? Permissions.ADDITIONAL_COST_UPDATE : Permissions.ADDITIONAL_COST_CREATE} projectId={id}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmit}
              disabled={submitting || loadingDetail}
            >
              {submitting ? (
                <ActivityIndicator color="#3B82F6" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{isEdit ? "Lưu" : "Gửi"}</Text>
              )}
            </TouchableOpacity>
          </PermissionGuard>
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
          <CurrencyInput
            label="Số tiền (VND) *"
            value={formData.amount}
            onChangeText={(amount) =>
              setFormData({ ...formData, amount })
            }
            placeholder="Nhập số tiền"
          />

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

        {/* Bottom Action Bar */}
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Ionicons name="close-outline" size={18} color="#4B5563" style={{ marginRight: 4 }} />
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBottomButton, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitBottomButtonText}>Gửi Duyệt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  bottomActionBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  submitBottomButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
  },
  submitBottomButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
