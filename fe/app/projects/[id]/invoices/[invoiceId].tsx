import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    AlertButton,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { invoiceApi, Invoice, CreateInvoiceData } from "@/api/invoiceApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, CurrencyInput, DatePickerInput, UniversalFileUploader, PermissionDenied } from "@/components";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";
import api from "@/api/api";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function InvoiceDetailScreen() {
    const router = useRouter();
    const { id, invoiceId } = useLocalSearchParams<{ id: string; invoiceId: string }>();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateInvoiceData>>({
        invoice_date: "",
        cost_group_id: undefined,
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        description: "",
        notes: "",
        attachment_ids: [],
    });
    const [costGroups, setCostGroups] = useState<any[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");

    const { hasPermission, loading: loadingPermissions } = useProjectPermissions(id!);
    const canUpdate = hasPermission(Permissions.INVOICE_UPDATE);
    const canDelete = hasPermission(Permissions.INVOICE_DELETE);
    const canView = hasPermission(Permissions.INVOICE_VIEW);

    useEffect(() => {
        loadInvoice();
        if (canUpdate) {
            loadCostGroups();
        }
    }, [id, invoiceId, canUpdate]);

    const loadInvoice = async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            const response = await invoiceApi.getInvoice(Number(id), Number(invoiceId));
            if (response.success) {
                setInvoice(response.data);

                // Map attachments to uploadedFiles format for FileUploader if needed
                const existingAttachments = response.data.attachments?.map((att: any) => ({
                    id: att.id, // ID in attachments table
                    attachment_id: att.id,
                    name: att.original_name,
                    uri: att.file_url,
                    type: att.mime_type
                })) || [];

                setUploadedFiles(existingAttachments);

                setFormData({
                    invoice_date: response.data.invoice_date,
                    cost_group_id: response.data.cost_group_id,
                    subtotal: response.data.subtotal,
                    tax_amount: response.data.tax_amount || 0,
                    discount_amount: response.data.discount_amount || 0,
                    description: response.data.description || "",
                    notes: response.data.notes || "",
                    attachment_ids: [], // Reset new attachments
                });
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem hóa đơn này.");
            } else {
                const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải hóa đơn";
                Alert.alert("Lỗi", errorMessage);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadCostGroups = async () => {
        try {
            const response = await api.get("/settings/cost-groups?active_only=true");
            if (response.data.success) {
                const data = response.data.data;
                // Handle both paginated and non-paginated responses
                setCostGroups(Array.isArray(data) ? data : (data?.data || []));
            }
        } catch (error: any) {
            // Silence 403 errors as they are expected for some users
            if (error.response?.status !== 403) {
                console.error("Error loading cost groups:", error);
            }
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInvoice();
        if (canUpdate) {
            loadCostGroups();
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.invoice_date) {
            newErrors.invoice_date = "Ngày hóa đơn là bắt buộc";
        }

        if (!formData.cost_group_id) {
            Alert.alert("Lỗi", "Vui lòng chọn danh mục chi phí");
            return false;
        }

        if (!formData.subtotal || formData.subtotal <= 0) {
            newErrors.subtotal = "Tổng tiền phải lớn hơn 0";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdate = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setSubmitting(true);

            // Filter to get IDs of attachments.
            // Note: The backend logic likely expects IDs of existing attachments OR new attachments.
            // Depending on how backend is implemented, it might simple attach these IDs.
            // For now, consistent with create logic.
            const attachmentIds = uploadedFiles
                .filter(f => f.attachment_id || f.id)
                .map(f => f.attachment_id || f.id);

            const dataToSubmit = {
                ...formData,
                attachment_ids: attachmentIds
            };

            const response = await invoiceApi.updateInvoice(Number(id), Number(invoiceId), dataToSubmit as CreateInvoiceData);
            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật hóa đơn");
                setShowEditModal(false);
                setErrors({});
                loadInvoice();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể cập nhật hóa đơn";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xóa hóa đơn này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await invoiceApi.deleteInvoice(Number(id), Number(invoiceId));
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa hóa đơn");
                                router.back();
                            }
                        } catch (error: any) {
                            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể xóa hóa đơn";
                            Alert.alert("Lỗi", errorMessage);
                        }
                    },
                },
            ]
        );
    };

    const handleDownload = async (attachment: any) => {
        try {
            if (!attachment.file_url) return;

            const callback = (downloadProgress: any) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            };

            const documentDirectory = (FileSystem as any).documentDirectory || "";
            if (!documentDirectory) {
                Alert.alert("Lỗi", "Không tìm thấy thư mục lưu trữ");
                return;
            }

            const downloadResumable = FileSystem.createDownloadResumable(
                attachment.file_url,
                documentDirectory + attachment.original_name,
                {},
                callback
            );

            const result = await downloadResumable.downloadAsync();
            if (result && result.uri) {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(result.uri);
                } else {
                    Alert.alert("Đã tải xuống", `File đã được lưu tại: ${result.uri}`);
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Lỗi", "Không thể tải file");
        }
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return "0 VNĐ";
        }
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };


    if (loading || loadingPermissions) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Hóa Đơn" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (!canView || permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Hóa Đơn" showBackButton />
                <PermissionDenied message={permissionMessage || "Bạn không có quyền xem hóa đơn này."} />
            </View>
        );
    }

    if (!invoice) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Hóa Đơn" showBackButton />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Không tìm thấy hóa đơn</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Chi Tiết Hóa Đơn"
                showBackButton
                rightComponent={
                    <View style={styles.headerActions}>
                        {canUpdate && (
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={() => setShowEditModal(true)}
                            >
                                <Ionicons name="pencil" size={20} color="#3B82F6" />
                            </TouchableOpacity>
                        )}
                        {canDelete && (
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={handleDelete}
                            >
                                <Ionicons name="trash" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Thông tin cơ bản */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số hóa đơn:</Text>
                        <Text style={styles.infoValue}>{invoice.invoice_number || `#${invoice.id}`}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày hóa đơn:</Text>
                        <Text style={styles.infoValue}>
                            {new Date(invoice.invoice_date).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>

                    {invoice.cost_group && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Danh mục:</Text>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryText}>{invoice.cost_group.name}</Text>
                            </View>
                        </View>
                    )}

                    {invoice.customer && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Khách hàng:</Text>
                            <Text style={styles.infoValue}>{invoice.customer.name}</Text>
                        </View>
                    )}

                    {invoice.description && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Mô tả:</Text>
                            <Text style={styles.infoValue}>{invoice.description}</Text>
                        </View>
                    )}

                    {invoice.notes && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Ghi chú:</Text>
                            <Text style={styles.infoValue}>{invoice.notes}</Text>
                        </View>
                    )}
                </View>

                {/* File đính kèm */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="attach-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Chứng từ đính kèm</Text>
                        {invoice.attachments && invoice.attachments.length > 0 && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{invoice.attachments.length}</Text>
                            </View>
                        )}
                    </View>

                    {invoice.attachments && invoice.attachments.length > 0 ? (
                        <View style={styles.attachmentsList}>
                            {invoice.attachments.map((file: any) => (
                                <View key={file.id} style={styles.attachmentCard}>
                                    <View style={styles.attachmentIcon}>
                                        <Ionicons name="document-text" size={24} color="#6B7280" />
                                    </View>
                                    <View style={styles.attachmentInfo}>
                                        <Text style={styles.attachmentName} numberOfLines={1}>
                                            {file.original_name}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handleDownload(file)}
                                        >
                                            <Text style={styles.downloadLink}>Tải xuống</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Chưa có file đính kèm</Text>
                    )}
                </View>

                {/* Thông tin tài chính */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="cash-outline" size={20} color="#3B82F6" />
                        <Text style={styles.sectionTitle}>Thông tin tài chính</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Tổng tiền trước thuế:</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(invoice.subtotal)}</Text>
                        </View>

                        {invoice.tax_amount > 0 && (
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Thuế VAT:</Text>
                                <Text style={styles.summaryValue}>{formatCurrency(invoice.tax_amount)}</Text>
                            </View>
                        )}

                        {invoice.discount_amount > 0 && (
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Giảm giá:</Text>
                                <Text style={styles.summaryValue}>-{formatCurrency(invoice.discount_amount)}</Text>
                            </View>
                        )}

                        <View style={[styles.summaryItem, styles.summaryTotal]}>
                            <Text style={styles.summaryTotalLabel}>Tổng cộng:</Text>
                            <Text style={styles.summaryTotalValue}>{formatCurrency(invoice.total_amount)}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowEditModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sửa Hóa Đơn</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                                </View>

                                <DatePickerInput
                                    label={
                                        <Text>
                                            Ngày hóa đơn <Text style={styles.required}>*</Text>
                                        </Text>
                                    }
                                    value={formData.invoice_date}
                                    onDateChange={(date) => {
                                        setFormData({
                                            ...formData,
                                            invoice_date: date,
                                        });
                                        if (errors.invoice_date) setErrors({ ...errors, invoice_date: "" });
                                    }}
                                    placeholder="Chọn ngày"
                                    error={errors.invoice_date}
                                />

                                {/* Cost Group Selector */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Danh mục chi phí <Text style={styles.required}>*</Text></Text>
                                    <TouchableOpacity
                                        style={[styles.input, styles.dateInput]}
                                        onPress={() => {
                                            const buttons = costGroups.map(cg => ({
                                                text: cg.name,
                                                onPress: () => setFormData({ ...formData, cost_group_id: cg.id })
                                            } as any));
                                            buttons.push({ text: "Hủy", onPress: () => { }, style: "cancel" });
                                            Alert.alert("Chọn danh mục", "", buttons);
                                        }}
                                    >
                                        <Text style={formData.cost_group_id ? { color: "#1F2937" } : styles.placeholderText}>
                                            {formData.cost_group_id
                                                ? costGroups.find(cg => cg.id === formData.cost_group_id)?.name
                                                : "Chọn danh mục"}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Mô tả</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.textArea,
                                            focusedField === "description" && styles.inputFocused,
                                        ]}
                                        placeholder="Nhập mô tả..."
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.description}
                                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                        onFocus={() => setFocusedField("description")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Ghi chú</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.textArea,
                                            focusedField === "notes" && styles.inputFocused,
                                        ]}
                                        placeholder="Nhập ghi chú..."
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.notes}
                                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                        onFocus={() => setFocusedField("notes")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>

                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="attach-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Chứng từ</Text>
                                </View>

                                <UniversalFileUploader
                                    onUploadComplete={(files) => setUploadedFiles(files)}
                                    multiple={true}
                                    accept="all"
                                    maxFiles={10}
                                    initialFiles={uploadedFiles}
                                    label="Thêm chứng từ"
                                />
                            </View>

                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="cash-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Thông tin tài chính</Text>
                                </View>

                                <CurrencyInput
                                    label={
                                        <>
                                            Tổng tiền trước thuế (VNĐ) <Text style={styles.required}>*</Text>
                                        </>
                                    }
                                    value={formData.subtotal}
                                    onChangeText={(value) => {
                                        setFormData({ ...formData, subtotal: value });
                                        if (errors.subtotal) setErrors({ ...errors, subtotal: "" });
                                    }}
                                    placeholder="0"
                                    error={errors.subtotal}
                                />

                                <CurrencyInput
                                    label="Thuế VAT (VNĐ)"
                                    value={formData.tax_amount}
                                    onChangeText={(value) => {
                                        setFormData({ ...formData, tax_amount: value });
                                    }}
                                    placeholder="0"
                                />

                                <CurrencyInput
                                    label="Giảm giá (VNĐ)"
                                    value={formData.discount_amount}
                                    onChangeText={(value) => {
                                        setFormData({ ...formData, discount_amount: value });
                                    }}
                                    placeholder="0"
                                />

                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Tổng cộng:</Text>
                                        <Text style={styles.summaryValue}>
                                            {formatCurrency(
                                                (Number(formData.subtotal) || 0) +
                                                (Number(formData.tax_amount) || 0) -
                                                (Number(formData.discount_amount) || 0)
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                    onPress={handleUpdate}
                                    disabled={submitting}
                                    activeOpacity={0.8}
                                >
                                    {submitting ? (
                                        <View style={styles.buttonContent}>
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                            <Text style={styles.submitButtonText}>Đang cập nhật...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                            <Text style={styles.submitButtonText}>Cập Nhật</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    headerActions: {
        flexDirection: "row",
        gap: 12,
    },
    headerButton: {
        padding: 4,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: "#FFFFFF",
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        flex: 1,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    infoLabel: {
        fontSize: 14,
        color: "#6B7280",
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
        textAlign: "right",
    },
    summaryCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 16,
        gap: 16,
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    summaryTotal: {
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: "#E5E7EB",
        marginTop: 8,
    },
    summaryTotalLabel: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    summaryTotalValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#3B82F6",
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "95%",
        padding: 16,
        paddingBottom: Platform.OS === "ios" ? 34 : 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalBody: {
        flex: 1,
    },
    modalBodyContent: {
        paddingBottom: 40,
    },
    formSection: {
        marginBottom: 24,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    required: {
        fontSize: 14,
        fontWeight: "600",
        color: "#EF4444",
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
    inputFocused: {
        borderColor: "#3B82F6",
        backgroundColor: "#F0F9FF",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
        paddingTop: 14,
    },
    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        backgroundColor: "#FFFFFF",
        minHeight: 48,
    },
    placeholderText: {
        color: "#9CA3AF",
    },
    buttonContainer: {
        marginTop: 8,
        marginBottom: 8,
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0.1,
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    permissionDeniedContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    permissionDeniedTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
    },
    permissionDeniedMessage: {
        fontSize: 16,
        color: "#4B5563",
        textAlign: "center",
        marginBottom: 8,
    },
    permissionDeniedSubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
    },
    categoryBadge: {
        backgroundColor: "#E0F2FE",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryText: {
        color: "#0369A1",
        fontSize: 13,
        fontWeight: "600",
    },
    countBadge: {
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    countText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#4B5563",
    },
    attachmentsList: {
        gap: 12,
    },
    attachmentCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    attachmentIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    attachmentInfo: {
        flex: 1,
    },
    attachmentName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1F2937",
        marginBottom: 4,
    },
    downloadLink: {
        fontSize: 13,
        color: "#3B82F6",
        fontWeight: "500",
    },
});
