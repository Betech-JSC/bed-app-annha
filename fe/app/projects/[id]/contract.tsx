import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  contractApi,
  Contract,
  CreateContractData,
} from "@/api/contractApi";
import { attachmentApi, Attachment } from "@/api/attachmentApi";
import { UniversalFileUploader, ScreenHeader, DatePickerInput } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Ionicons } from "@expo/vector-icons";

export default function ContractScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [signedDate, setSignedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    contract_value: "",
    signed_date: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const response = await contractApi.getContract(id!);
      if (response.success) {
        if (response.data) {
          // Có contract - hiển thị thông tin
          setContract(response.data);
          setFormData({
            contract_value: response.data.contract_value?.toString() || "",
            signed_date: response.data.signed_date || "",
          });
          if (response.data.signed_date) {
            setSignedDate(new Date(response.data.signed_date));
          }
          // Set uploaded files for display
          if (response.data.attachments) {
            setUploadedFiles(response.data.attachments);
          }
        } else {
          // Không có contract - hiển thị form tạo mới (đây là trạng thái bình thường)
          setContract(null);
          setFormData({
            contract_value: "",
            signed_date: "",
          });
        }
      } else {
        // Response không thành công
        setContract(null);
        setFormData({
          contract_value: "",
          signed_date: "",
        });
      }
    } catch (error: any) {
      console.error("Error loading contract:", error);
      // Xử lý lỗi thực sự (không phải 404 - không có contract)
      if (error.response?.status === 404) {
        // Vẫn xử lý 404 để tương thích với code cũ
        setContract(null);
        setFormData({
          contract_value: "",
          signed_date: "",
        });
      } else {
        Alert.alert(
          "Lỗi",
          error.response?.data?.message || "Không thể tải thông tin hợp đồng"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string): string => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");
    if (!numericValue) return "";
    
    // Format with commas
    return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue));
  };

  const parseCurrency = (value: string): number => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");
    return numericValue ? parseInt(numericValue) : 0;
  };

  const handleSave = async () => {
    const contractValue = parseCurrency(formData.contract_value);
    if (!contractValue || contractValue <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập giá trị hợp đồng hợp lệ");
      return;
    }

    if (!formData.signed_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày ký hợp đồng");
      return;
    }

    try {
      const data: CreateContractData = {
        contract_value: contractValue,
        signed_date: formData.signed_date,
        status: "draft",
      };

      const response = contract
        ? await contractApi.updateContract(id!, data)
        : await contractApi.saveContract(id!, data);

      if (response.success) {
        // If there are uploaded files waiting to be attached, attach them now
        if (uploadedFiles.length > 0) {
          try {
            const attachmentIds = uploadedFiles.map((file) => file.attachment_id || file.id);
            await contractApi.attachFiles(id!, attachmentIds);
            setUploadedFiles([]);
          } catch (error) {
            console.error("Error attaching files:", error);
          }
        }
        Alert.alert("Thành công", "Hợp đồng đã được lưu.");
        setEditing(false);
        loadContract();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể lưu hợp đồng");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Có lỗi xảy ra khi lưu hợp đồng"
      );
    }
  };

  const handleApprove = async () => {
    if (!contract) {
      Alert.alert("Lỗi", "Hợp đồng chưa được tạo");
      return;
    }

    try {
      const response = await contractApi.approveContract(id!);
      if (response.success) {
        Alert.alert("Thành công", "Hợp đồng đã được duyệt.");
        loadContract();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể duyệt hợp đồng");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Có lỗi xảy ra khi duyệt hợp đồng"
      );
    }
  };

  const handleFileUploadComplete = async (files: any[]) => {
    if (files.length === 0) return;

    // If contract doesn't exist, save uploaded files to attach later
    if (!contract) {
      setUploadedFiles([...uploadedFiles, ...files]);
      Alert.alert(
        "Thông báo",
        "File đã được tải lên. Vui lòng tạo hợp đồng trước để đính kèm file."
      );
      return;
    }

    // If contract exists, attach files immediately
    try {
      setUploadingFiles(true);
      const attachmentIds = files.map((file) => file.attachment_id || file.id);
      const response = await contractApi.attachFiles(id!, attachmentIds);
      
      if (response.success) {
        Alert.alert("Thành công", "Đã đính kèm file vào hợp đồng.");
        loadContract();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể đính kèm file");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Có lỗi xảy ra khi đính kèm file"
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };

  const getFileIcon = (type: string) => {
    if (type === "image") return "image-outline";
    if (type === "document") {
      // Check for PDF
      return "document-text-outline";
    }
    return "document-outline";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending_customer_approval":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "Bản nháp";
      case "pending_customer_approval":
        return "Chờ khách hàng duyệt";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: tabBarHeight }}>
      <ScreenHeader
        title="Giá Trị Hợp Đồng"
        showBackButton
        rightComponent={
          contract && !editing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ) : null
        }
      />

      {contract && (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Trạng thái</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(contract.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(contract.status) },
              ]}
            >
              {getStatusText(contract.status)}
            </Text>
          </View>
        </View>
      )}

      {!contract && !loading && (
        <View style={styles.emptyCard}>
          <Ionicons name="document-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Chưa có hợp đồng</Text>
          <Text style={styles.emptyText}>
            Hãy tạo hợp đồng mới bằng cách điền thông tin bên dưới
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Giá trị hợp đồng (VNĐ)</Text>
          <TextInput
            style={styles.input}
            value={formData.contract_value ? formatCurrency(formData.contract_value) + " VNĐ" : ""}
            onChangeText={(text) => {
              // Remove " VNĐ" suffix and format
              const cleaned = text.replace(/[^0-9]/g, "");
              setFormData({ ...formData, contract_value: cleaned });
            }}
            placeholder="Nhập giá trị hợp đồng"
            keyboardType="numeric"
            editable={editing || !contract}
          />
        </View>

        <DatePickerInput
          label="Ngày ký hợp đồng"
          value={signedDate}
          onChange={(date) => {
            if (date) {
              setSignedDate(date);
              setFormData({
                ...formData,
                signed_date: date.toISOString().split("T")[0],
              });
            }
          }}
          placeholder="Chọn ngày ký hợp đồng"
          disabled={!editing && !!contract}
        />

        {/* File Upload Section - Show when editing or when contract doesn't exist */}
        {(editing || !contract) && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.sectionTitle}>Đính kèm file hợp đồng</Text>
            <Text style={styles.helperText}>
              Hỗ trợ PDF, DOC, DOCX, ảnh. Tối đa 10 file.
            </Text>
            <UniversalFileUploader
              onUploadComplete={handleFileUploadComplete}
              multiple={true}
              accept="all"
              maxFiles={10}
              initialFiles={uploadedFiles}
              label="Đính kèm file hợp đồng (PDF, DOC, ảnh)"
            />
            {uploadingFiles && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.uploadingText}>Đang đính kèm file...</Text>
              </View>
            )}
          </View>
        )}

        {/* Display attached files - Show when contract exists and not editing */}
        {contract && contract.attachments && contract.attachments.length > 0 && !editing && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.sectionTitle}>File đính kèm</Text>
            {contract.attachments.map((attachment: any, index: number) => (
              <TouchableOpacity key={attachment.id || index} style={styles.attachmentItem}>
                <Ionicons 
                  name={getFileIcon(attachment.type || "document") as any} 
                  size={24} 
                  color="#3B82F6" 
                />
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.original_name || attachment.file_name}
                  </Text>
                  {attachment.file_size && (
                    <Text style={styles.attachmentSize}>
                      {(attachment.file_size / 1024).toFixed(2)} KB
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {editing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                loadContract();
              }}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!contract && (
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Tạo hợp đồng</Text>
              </TouchableOpacity>
            )}
            {contract &&
              contract.status === "pending_customer_approval" && (
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={handleApprove}
                >
                  <Text style={styles.approveButtonText}>Duyệt hợp đồng</Text>
                </TouchableOpacity>
              )}
          </>
        )}
      </View>
    </ScrollView>
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
  editButton: {
    padding: 4,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 16,
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
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
  attachmentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  attachmentSize: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  buttonRow: {
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
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  approveButton: {
    backgroundColor: "#10B981",
    marginTop: 16,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 32,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
