import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  contractApi,
  Contract,
  CreateContractData,
} from "@/api/contractApi";
import { projectApi, Project } from "@/api/projectApi"; // Import projectApi
import { attachmentApi, Attachment } from "@/api/attachmentApi";
import { UniversalFileUploader, ScreenHeader, DatePickerInput, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { Ionicons } from "@expo/vector-icons";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function ContractScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const { permissions: projectPermissions, loading: permissionsLoading, refresh: refreshPermissions } = useProjectPermissions(id);
  const [contract, setContract] = useState<Contract | null>(null);
  const [project, setProject] = useState<Project | null>(null); // State for project
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [signedDate, setSignedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    contract_value: "",
    signed_date: new Date().toISOString().split("T")[0],
  });
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadContract();
    loadProject(); // Load project info
  }, [id]);


  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadContract();
      loadProject();
    }, [id])
  );

  const loadProject = async () => {
    try {
      const response = await projectApi.getProject(id!);
      if (response.success) {
        setProject(response.data);
      }
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const loadContract = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);
      setPermissionMessage("");
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
          const today = new Date();
          setSignedDate(today);
          setFormData({
            contract_value: "",
            signed_date: today.toISOString().split("T")[0],
          });
        }
      } else {
        // Response không thành công
        setContract(null);
        const today = new Date();
        setSignedDate(today);
        setFormData({
          contract_value: "",
          signed_date: today.toISOString().split("T")[0],
        });
      }
    } catch (error: any) {
      // Xử lý lỗi 403 - Permission denied
      if (error.response?.status === 403) {
        // Không log error để tránh hiển thị toast notification
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem hợp đồng.");
        setContract(null);
        setFormData({
          contract_value: "",
          signed_date: "",
        });
      } else {
        // Chỉ log error cho các lỗi khác 403
        console.error("Error loading contract:", error);
        if (error.response?.status === 404) {
          // Vẫn xử lý 404 để tương thích với code cũ
          setContract(null);
          const today = new Date();
          setSignedDate(today);
          setFormData({
            contract_value: "",
            signed_date: today.toISOString().split("T")[0],
          });
        } else {
          Alert.alert(
            "Lỗi",
            error.response?.data?.message || "Không thể tải thông tin hợp đồng"
          );
        }
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

  const handleReject = async () => {
    if (!contract || !rejectReason.trim()) return;

    try {
      setActionLoading("reject");
      const response = await contractApi.rejectContract(id!, rejectReason.trim());
      if (response.success) {
        Alert.alert("Thành công", "Hợp đồng đã bị từ chối.");
        setShowRejectModal(false);
        setShowDetailDrawer(false);
        setRejectReason("");
        loadContract();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể từ chối hợp đồng");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Có lỗi xảy ra khi từ chối hợp đồng"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveFromDrawer = async () => {
    if (!contract) return;

    try {
      setActionLoading("approve");
      const response = await contractApi.approveContract(id!);
      if (response.success) {
        Alert.alert("Thành công", "Hợp đồng đã được duyệt.");
        setShowDetailDrawer(false);
        loadContract();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể duyệt hợp đồng");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Có lỗi xảy ra khi duyệt hợp đồng"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "#6B7280";
      case "pending_customer_approval":
      case "pending_management_approval":
      case "pending_accountant_approval": return "#F59E0B";
      case "approved": return "#10B981";
      case "rejected": return "#EF4444";
      case "confirmed": return "#3B82F6";
      case "signed": return "#8B5CF6";
      case "completed": return "#059669";
      case "expired":
      case "terminated":
      case "cancelled": return "#9CA3AF";
      default: return "#6B7280";
    }
  };

  const getContractStatusText = (status: string) => {
    switch (status) {
      case "draft": return "Nháp";
      case "pending_customer_approval": return "Chờ duyệt (KH)";
      case "pending_management_approval": return "Chờ BĐH duyệt";
      case "pending_accountant_approval": return "Chờ KT xác nhận";
      case "approved": return "Đã duyệt";
      case "rejected": return "Từ chối";
      case "confirmed": return "Đã xác nhận";
      case "signed": return "Đã ký";
      case "completed": return "Hoàn thành";
      case "expired": return "Hết hạn";
      case "terminated": return "Chấm dứt";
      case "cancelled": return "Đã hủy";
      default: return "Chưa xác định";
    }
  };

  const formatContractCurrency = (value: number | string) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(numValue);
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

  const handleFilePress = async (file: any) => {
    const fileUrl = file.file_url || file.url || file.location;
    if (!fileUrl) {
      Alert.alert("Lỗi", "Không tìm thấy đường dẫn file");
      return;
    }

    const isImage = file.type === "image" || (fileUrl && fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    if (isImage) {
      setPreviewImage(fileUrl);
    } else {
      try {
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) {
          await Linking.openURL(fileUrl);
        } else {
          Alert.alert("Thông báo", "Không thể mở file này trên thiết bị của bạn");
        }
      } catch (error) {
        console.error("Error opening URL:", error);
        Alert.alert("Lỗi", "Không thể mở file");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "#6B7280"; // Gray
      case "in_progress": // Đang thi công
        return "#3B82F6"; // Blue
      case "completed":
        return "#10B981"; // Green
      case "cancelled":
        return "#EF4444"; // Red
      default:
        return "#6B7280"; // Default Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "planning":
        return "Lập kế hoạch";
      case "in_progress":
        return "Đang thi công";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Chưa xác định";
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Giá Trị Hợp Đồng" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Giá Trị Hợp Đồng" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: tabBarHeight }}>
      <ScreenHeader
        title="Giá Trị Hợp Đồng"
        showBackButton
        rightComponent={
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {!permissionsLoading && projectPermissions.length === 0 && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => {
                  console.log("[Contract] Force refreshing permissions...");
                  refreshPermissions();
                }}
              >
                <Ionicons name="refresh" size={20} color="#3B82F6" />
              </TouchableOpacity>
            )}
            {contract && !editing ? (
              <PermissionGuard permission={Permissions.CONTRACT_UPDATE} projectId={id}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditing(true)}
                >
                  <Ionicons name="create-outline" size={24} color="#3B82F6" />
                </TouchableOpacity>
              </PermissionGuard>
            ) : null}
          </View>
        }
      />

      {contract && project && (
        <TouchableOpacity
          style={styles.statusCard}
          activeOpacity={0.7}
          onPress={() => setShowDetailDrawer(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>Trạng thái hợp đồng</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getContractStatusColor(contract.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getContractStatusColor(contract.status) },
                  ]}
                >
                  {getContractStatusText(contract.status)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(project.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(project.status) },
                  ]}
                >
                  {getStatusText(project.status)}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 13, color: "#3B82F6", fontWeight: "600" }}>Chi tiết</Text>
            <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
          </View>
        </TouchableOpacity>
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
              <TouchableOpacity
                key={attachment.id || index}
                style={styles.attachmentItem}
                onPress={() => handleFilePress(attachment)}
              >
                <Ionicons
                  name={getFileIcon(attachment.type || "document") as any}
                  size={24}
                  color="#3B82F6"
                />
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.original_name || attachment.file_name}
                  </Text>
                  {!!attachment.file_size && (
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
              <PermissionGuard permission={Permissions.CONTRACT_CREATE} projectId={id}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Tạo hợp đồng</Text>
                </TouchableOpacity>
              </PermissionGuard>
            )}

            {contract && contract.status === "draft" && (
              <PermissionGuard permission={Permissions.CONTRACT_CREATE} projectId={id}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, { backgroundColor: '#3B82F6' }]}
                  onPress={() => {
                    Alert.alert(
                      "Gửi duyệt hợp đồng",
                      "Bạn có chắc chắn muốn gửi duyệt hợp đồng này?",
                      [
                        { text: "Hủy", style: "cancel" },
                        {
                          text: "Gửi duyệt",
                          onPress: async () => {
                            try {
                              const response = await contractApi.saveContract(id!, {
                                contract_value: parseFloat(contract.contract_value.toString()),
                                signed_date: contract.signed_date,
                                status: "pending_customer_approval",
                              });
                              if (response.success) {
                                Alert.alert("Thành công", "Đã gửi duyệt hợp đồng");
                                loadContract();
                              } else {
                                Alert.alert("Lỗi", "Không thể gửi duyệt");
                              }
                            } catch (error: any) {
                              Alert.alert("Lỗi", error.response?.data?.message || "Lỗi khi gửi duyệt");
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.saveButtonText}>Gửi duyệt</Text>
                </TouchableOpacity>
              </PermissionGuard>
            )}

            {contract &&
              contract.status === "pending_customer_approval" && (
                <PermissionGuard permission={Permissions.CONTRACT_APPROVE_LEVEL_1} projectId={id}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      style={[styles.button, styles.approveButton, { flex: 1 }]}
                      onPress={handleApprove}
                    >
                      <Text style={styles.approveButtonText}>Duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.rejectButton, { flex: 1 }]}
                      onPress={() => {
                        Alert.prompt(
                          "Từ chối hợp đồng",
                          "Nhập lý do từ chối (tùy chọn):",
                          async (reason) => {
                            try {
                              const response = await contractApi.rejectContract(id!, reason || "");
                              if (response.success) {
                                Alert.alert("Thành công", "Đã từ chối hợp đồng");
                                loadContract();
                              } else {
                                Alert.alert("Lỗi", "Không thể từ chối");
                              }
                            } catch (error: any) {
                              Alert.alert("Lỗi", error.response?.data?.message || "Lỗi khi từ chối");
                            }
                          }
                        );
                      }}
                    >
                      <Text style={[styles.approveButtonText, { color: '#EF4444' }]}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                </PermissionGuard>
              )}

            {contract &&
              ["pending_customer_approval", "approved", "rejected", "confirmed", "signed"].includes(contract.status) && (
                <PermissionGuard permission={Permissions.CONTRACT_REVERT} projectId={id}>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#F59E0B', marginTop: 12 }]}
                    onPress={() => {
                      Alert.alert(
                        "Hoàn duyệt hợp đồng",
                        "Bạn có chắc chắn muốn hoàn duyệt hợp đồng về trạng thái nháp?",
                        [
                          { text: "Hủy", style: "cancel" },
                          {
                            text: "Hoàn duyệt",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                const response = await contractApi.revertToDraft(id!);
                                if (response.success) {
                                  Alert.alert("Thành công", "Đã hoàn duyệt hợp đồng");
                                  loadContract();
                                } else {
                                  Alert.alert("Lỗi", "Không thể hoàn duyệt");
                                }
                              } catch (error: any) {
                                Alert.alert("Lỗi", error.response?.data?.message || "Lỗi khi hoàn duyệt");
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.saveButtonText}>Hoàn duyệt</Text>
                  </TouchableOpacity>
                </PermissionGuard>
              )}
          </>
        )}
      </View>

      {/* Fullscreen image preview modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.previewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          <View style={styles.previewContainer}>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closePreviewButton}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detail Drawer Modal */}
      <Modal
        visible={showDetailDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailDrawer(false)}
      >
        <View style={drawerStyles.sheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowDetailDrawer(false)}>
            <View style={drawerStyles.sheetCloser} />
          </TouchableWithoutFeedback>
          <View style={drawerStyles.sheetContent}>
            <View style={drawerStyles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {contract && (
                <View style={drawerStyles.detailBody}>
                  {/* Header */}
                  <View style={drawerStyles.sheetHeader}>
                    <View style={[drawerStyles.typeTag, { backgroundColor: getContractStatusColor(contract.status) + "15" }]}>
                      <Text style={[drawerStyles.typeTagText, { color: getContractStatusColor(contract.status) }]}>
                        {getContractStatusText(contract.status)}
                      </Text>
                    </View>
                    <Text style={drawerStyles.sheetTitle}>Hợp đồng dự án</Text>
                    <Text style={drawerStyles.sheetSubtitle}>{project?.name || ""}</Text>
                  </View>

                  {/* Detail Grid */}
                  <View style={drawerStyles.detailGrid}>
                    <View style={drawerStyles.detailBox}>
                      <Text style={drawerStyles.detailLabel}>Giá trị hợp đồng</Text>
                      <Text style={drawerStyles.detailValueAmount}>{formatContractCurrency(contract.contract_value)}</Text>
                    </View>
                    <View style={drawerStyles.detailBox}>
                      <Text style={drawerStyles.detailLabel}>Ngày ký</Text>
                      <Text style={drawerStyles.detailValue}>
                        {contract.signed_date
                          ? new Date(contract.signed_date).toLocaleDateString("vi-VN")
                          : "Chưa có"}
                      </Text>
                    </View>
                    <View style={drawerStyles.detailBox}>
                      <Text style={drawerStyles.detailLabel}>Trạng thái HĐ</Text>
                      <Text style={[drawerStyles.detailValue, { color: getContractStatusColor(contract.status) }]}>
                        {getContractStatusText(contract.status)}
                      </Text>
                    </View>
                    {project && (
                      <View style={drawerStyles.detailBox}>
                        <Text style={drawerStyles.detailLabel}>Trạng thái DA</Text>
                        <Text style={[drawerStyles.detailValue, { color: getStatusColor(project.status) }]}>
                          {getStatusText(project.status)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Approver Info */}
                  {contract.approved_by && contract.approved_at && (
                    <View style={drawerStyles.descBox}>
                      <Text style={drawerStyles.detailLabel}>Thông tin phê duyệt</Text>
                      <Text style={drawerStyles.descText}>
                        Duyệt lúc: {new Date(contract.approved_at).toLocaleString("vi-VN")}
                      </Text>
                    </View>
                  )}

                  {/* Rejected Reason */}
                  {contract.rejected_reason && (
                    <View style={[drawerStyles.descBox, { backgroundColor: "#FEF2F2" }]}>
                      <Text style={[drawerStyles.detailLabel, { color: "#EF4444" }]}>Lý do từ chối</Text>
                      <Text style={[drawerStyles.descText, { color: "#B91C1C" }]}>{contract.rejected_reason}</Text>
                    </View>
                  )}

                  {/* Attachments */}
                  <View style={drawerStyles.attachSection}>
                    <Text style={drawerStyles.detailLabel}>Tệp đính kèm ({contract.attachments?.length || 0})</Text>
                    {contract.attachments && contract.attachments.length > 0 ? (
                      contract.attachments.map((att: any) => (
                        <TouchableOpacity
                          key={att.id}
                          style={drawerStyles.fileRow}
                          onPress={() => handleFilePress(att)}
                        >
                          <View style={drawerStyles.fileIcon}>
                            <Ionicons
                              name={
                                (att.file_url || att.url || "").match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                  ? "image-outline"
                                  : "document-outline"
                              }
                              size={20}
                              color="#3B82F6"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={drawerStyles.fileName} numberOfLines={1}>
                              {att.original_name || att.file_name || "File"}
                            </Text>
                            {att.file_size ? (
                              <Text style={drawerStyles.fileSize}>{(att.file_size / 1024).toFixed(1)} KB</Text>
                            ) : null}
                          </View>
                          <Ionicons name="eye-outline" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={drawerStyles.noAttach}>
                        <Ionicons name="attach-outline" size={20} color="#CBD5E1" />
                        <Text style={drawerStyles.noAttachText}>Không có tệp đính kèm</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            {contract && contract.status === "pending_customer_approval" && (
              <PermissionGuard permission={Permissions.CONTRACT_APPROVE_LEVEL_1} projectId={id}>
                <View style={drawerStyles.sheetActions}>
                  <TouchableOpacity
                    style={drawerStyles.actionBtnReject}
                    onPress={() => setShowRejectModal(true)}
                  >
                    <Text style={drawerStyles.actionBtnTextReject}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={drawerStyles.actionBtnApprove}
                    onPress={handleApproveFromDrawer}
                  >
                    {actionLoading === "approve" ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={drawerStyles.actionBtnTextApprove}>Phê duyệt</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </PermissionGuard>
            )}




            <TouchableOpacity style={drawerStyles.closeSheet} onPress={() => setShowDetailDrawer(false)}>
              <Text style={drawerStyles.closeSheetText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="fade"
      >
        <View style={drawerStyles.modalBg}>
          <View style={drawerStyles.modalWindow}>
            <Text style={drawerStyles.modalTitle}>Lý do từ chối</Text>
            <TextInput
              style={drawerStyles.modalInput}
              placeholder="Nhập lý do tại đây..."
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={drawerStyles.modalButs}>
              <TouchableOpacity
                style={drawerStyles.mBtnCan}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
              >
                <Text style={drawerStyles.mBtnCanText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[drawerStyles.mBtnSub, !rejectReason.trim() && { opacity: 0.5 }]}
                onPress={handleReject}
                disabled={!rejectReason.trim() || actionLoading === "reject"}
              >
                {actionLoading === "reject" ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={drawerStyles.mBtnSubText}>Xác nhận từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ============ Drawer Styles ============ */
const drawerStyles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetCloser: { flex: 1 },
  sheetContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  detailBody: { paddingHorizontal: 24 },
  sheetHeader: { marginBottom: 24 },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeTagText: { fontSize: 12, fontWeight: "700" },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B", marginTop: 4 },
  sheetSubtitle: { fontSize: 14, color: "#64748B", marginTop: 2 },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  detailBox: {
    width: "47%",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: { fontSize: 13, fontWeight: "600", color: "#475569" },
  detailValueAmount: { fontSize: 16, fontWeight: "800", color: "#059669" },
  descBox: {
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  descText: { fontSize: 14, color: "#475569", lineHeight: 22 },
  attachSection: { marginBottom: 24 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  fileName: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  fileSize: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  noAttach: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  noAttachText: { fontSize: 13, color: "#94A3B8" },
  sheetActions: {
    flexDirection: "row",
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtnReject: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
  },
  actionBtnApprove: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#10B981",
    alignItems: "center",
  },
  actionBtnTextReject: { color: "#EF4444", fontWeight: "800", fontSize: 15 },
  actionBtnTextApprove: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  closeSheet: { alignSelf: "center", padding: 12 },
  closeSheetText: { color: "#94A3B8", fontWeight: "700" },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalWindow: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: "#334155",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButs: { flexDirection: "row", gap: 12 },
  mBtnCan: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  mBtnCanText: { color: "#64748B", fontWeight: "700", fontSize: 14 },
  mBtnSub: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  mBtnSubText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});

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
  refreshButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
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
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permissionDeniedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 24,
    marginBottom: 8,
  },
  permissionDeniedMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  permissionDeniedSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "95%",
    height: "95%",
  },
  closePreviewButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
});
