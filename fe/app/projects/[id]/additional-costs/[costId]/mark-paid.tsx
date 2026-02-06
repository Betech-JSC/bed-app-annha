import React, { useState, useEffect } from "react";
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
import { ScreenHeader, DatePickerInput, CurrencyInput } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Permissions } from "@/constants/Permissions";

export default function MarkPaidAdditionalCostScreen() {
  const router = useRouter();
  const { id, costId } = useLocalSearchParams<{ id: string; costId: string }>();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const [cost, setCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [actualAmount, setActualAmount] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCost();
  }, [id, costId]);

  const loadCost = async () => {
    try {
      setLoading(true);
      const response = await additionalCostApi.getAdditionalCost(id!, costId!);
      if (response.success) {
        setCost(response.data);
        setMarkPaidDate(response.data.paid_date || new Date().toISOString().split("T")[0]);
        setActualAmount(response.data.amount || null);
        setUploadedFiles(
          response.data.attachments?.map((att: any) => ({
            id: att.id,
            file_url: att.file_url,
            original_name: att.original_name,
            type: att.mime_type?.startsWith("image/") ? "image" : "document",
          })) || []
        );
        setAttachmentIds(response.data.attachments?.map((att: any) => att.id) || []);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải chi phí phát sinh");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleFilesUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    const ids = files
      .map((f) => f.id || f.attachment_id)
      .filter((id): id is number => id !== undefined);
    setAttachmentIds(ids);
  };

  const handleSubmit = async () => {
    if (!markPaidDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày thanh toán");
      return;
    }

    if (attachmentIds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng upload ít nhất một chứng từ chuyển khoản");
      return;
    }

    try {
      setSubmitting(true);
      const response = await additionalCostApi.markAsPaidByCustomer(id!, costId!, {
        paid_date: markPaidDate,
        actual_amount: actualAmount || undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <PermissionGuard permission={Permissions.ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER} projectId={id}>
      <View style={styles.container}>
        <ScreenHeader
          title="Đánh Dấu Đã Thanh Toán"
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
                <Text style={styles.saveButtonText}>Xác Nhận</Text>
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
            {cost && (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Số tiền yêu cầu</Text>
                  <Text style={styles.infoValue}>{formatCurrency(cost.amount)}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ngày thanh toán *</Text>
                  <DatePickerInput
                    value={markPaidDate}
                    onDateChange={(date) => setMarkPaidDate(date)}
                    placeholder="Chọn ngày thanh toán"
                    maximumDate={new Date()}
                  />
                </View>

                <CurrencyInput
                  label="Số tiền thực tế (nếu khác)"
                  value={actualAmount}
                  onChangeText={(amount) => setActualAmount(amount)}
                  placeholder="Nhập số tiền thực tế (tùy chọn)"
                  helperText="Để trống nếu số tiền thực tế bằng số tiền yêu cầu"
                />

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Chứng từ chuyển khoản *</Text>
                  <UniversalFileUploader
                    onUploadComplete={handleFilesUpload}
                    multiple={true}
                    accept="image"
                    maxFiles={10}
                    initialFiles={uploadedFiles}
                    showPreview={true}
                    label="Chọn hình ảnh chứng từ chuyển khoản"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </PermissionGuard>
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
  infoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E40AF",
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
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
    minHeight: 48,
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
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
