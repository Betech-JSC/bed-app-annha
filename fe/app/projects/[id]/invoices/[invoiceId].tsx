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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { invoiceApi, Invoice, CreateInvoiceData } from "@/api/invoiceApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import BackButton from "@/components/BackButton";

export default function InvoiceDetailScreen() {
    const router = useRouter();
    const { id, invoiceId } = useLocalSearchParams<{ id: string; invoiceId: string }>();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateInvoiceData>>({
        invoice_date: "",
        due_date: "",
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        description: "",
        notes: "",
    });
    const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
    const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const [showPaidDatePicker, setShowPaidDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    useEffect(() => {
        loadInvoice();
    }, [id, invoiceId]);

    const loadInvoice = async () => {
        try {
            setLoading(true);
            const response = await invoiceApi.getInvoice(Number(id), Number(invoiceId));
            if (response.success) {
                setInvoice(response.data);
                setFormData({
                    invoice_date: response.data.invoice_date,
                    due_date: response.data.due_date || "",
                    subtotal: response.data.subtotal,
                    tax_amount: response.data.tax_amount || 0,
                    discount_amount: response.data.discount_amount || 0,
                    description: response.data.description || "",
                    notes: response.data.notes || "",
                });
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải hóa đơn";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInvoice();
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.invoice_date) {
            newErrors.invoice_date = "Ngày hóa đơn là bắt buộc";
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
            const response = await invoiceApi.updateInvoice(Number(id), Number(invoiceId), formData as CreateInvoiceData);
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

    const handleSend = async () => {
        try {
            const response = await invoiceApi.sendInvoice(Number(id), Number(invoiceId));
            if (response.success) {
                Alert.alert("Thành công", "Đã gửi hóa đơn");
                loadInvoice();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể gửi hóa đơn";
            Alert.alert("Lỗi", errorMessage);
        }
    };

    const handleMarkPaid = async () => {
        try {
            setSubmitting(true);
            const response = await invoiceApi.markPaid(Number(id), Number(invoiceId), paidDate);
            if (response.success) {
                Alert.alert("Thành công", "Đã đánh dấu hóa đơn đã thanh toán");
                setShowMarkPaidModal(false);
                loadInvoice();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể đánh dấu đã thanh toán";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid":
                return "#10B981";
            case "sent":
                return "#3B82F6";
            case "overdue":
                return "#EF4444";
            case "partially_paid":
                return "#F59E0B";
            case "cancelled":
                return "#6B7280";
            default:
                return "#F59E0B";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "paid":
                return "Đã thanh toán";
            case "sent":
                return "Đã gửi";
            case "overdue":
                return "Quá hạn";
            case "partially_paid":
                return "Thanh toán một phần";
            case "cancelled":
                return "Đã hủy";
            default:
                return "Nháp";
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <BackButton />
                    <Text style={styles.headerTitle}>Chi Tiết Hóa Đơn</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (!invoice) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <BackButton />
                    <Text style={styles.headerTitle}>Chi Tiết Hóa Đơn</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Không tìm thấy hóa đơn</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Chi Tiết Hóa Đơn</Text>
                <View style={styles.headerActions}>
                    {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => setShowEditModal(true)}
                        >
                            <Ionicons name="pencil" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleDelete}
                    >
                        <Ionicons name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

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
                        <Text style={styles.infoValue}>#{invoice.id}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngày hóa đơn:</Text>
                        <Text style={styles.infoValue}>
                            {new Date(invoice.invoice_date).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>
                    
                    {invoice.due_date && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Ngày đến hạn:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(invoice.due_date).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>
                    )}
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Trạng thái:</Text>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: getStatusColor(invoice.status) + "20" },
                            ]}
                        >
                            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                {getStatusLabel(invoice.status)}
                            </Text>
                        </View>
                    </View>
                    
                    {invoice.paid_date && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Ngày thanh toán:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(invoice.paid_date).toLocaleDateString("vi-VN")}
                            </Text>
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

                {/* Actions */}
                {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="settings-outline" size={20} color="#3B82F6" />
                            <Text style={styles.sectionTitle}>Thao tác</Text>
                        </View>
                        
                        <View style={styles.actionsContainer}>
                            {invoice.status === "draft" && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleSend}
                                >
                                    <Ionicons name="send" size={20} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>Gửi Hóa Đơn</Text>
                                </TouchableOpacity>
                            )}
                            
                            {invoice.status !== "paid" && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.actionButtonSuccess]}
                                    onPress={() => setShowMarkPaidModal(true)}
                                >
                                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>Đánh Dấu Đã Thanh Toán</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
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
                                
                                <View style={styles.formGroup}>
                                    <View style={styles.labelContainer}>
                                        <Text style={styles.label}>Ngày hóa đơn</Text>
                                        <Text style={styles.required}>*</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.dateInput,
                                            focusedField === "invoice_date" && styles.inputFocused,
                                            errors.invoice_date && styles.inputError,
                                        ]}
                                        onPress={() => {
                                            setShowInvoiceDatePicker(true);
                                            setFocusedField("invoice_date");
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={formData.invoice_date ? {} : styles.placeholderText}>
                                            {formData.invoice_date
                                                ? new Date(formData.invoice_date).toLocaleDateString("vi-VN")
                                                : "Chọn ngày"}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                    {showInvoiceDatePicker && (
                                        <DateTimePicker
                                            value={formData.invoice_date ? new Date(formData.invoice_date) : new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                                setShowInvoiceDatePicker(false);
                                                setFocusedField(null);
                                                if (date) {
                                                    setFormData({
                                                        ...formData,
                                                        invoice_date: date.toISOString().split("T")[0],
                                                    });
                                                    if (errors.invoice_date) setErrors({ ...errors, invoice_date: "" });
                                                }
                                            }}
                                        />
                                    )}
                                    {errors.invoice_date && (
                                        <View style={styles.errorContainer}>
                                            <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                            <Text style={styles.errorText}>{errors.invoice_date}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Ngày đến hạn</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.dateInput,
                                            focusedField === "due_date" && styles.inputFocused,
                                        ]}
                                        onPress={() => {
                                            setShowDueDatePicker(true);
                                            setFocusedField("due_date");
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={formData.due_date ? {} : styles.placeholderText}>
                                            {formData.due_date
                                                ? new Date(formData.due_date).toLocaleDateString("vi-VN")
                                                : "Chọn ngày"}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                    {showDueDatePicker && (
                                        <DateTimePicker
                                            value={formData.due_date ? new Date(formData.due_date) : new Date()}
                                            mode="date"
                                            display="default"
                                            minimumDate={formData.invoice_date ? new Date(formData.invoice_date) : undefined}
                                            onChange={(event, date) => {
                                                setShowDueDatePicker(false);
                                                setFocusedField(null);
                                                if (date) {
                                                    setFormData({
                                                        ...formData,
                                                        due_date: date.toISOString().split("T")[0],
                                                    });
                                                }
                                            }}
                                        />
                                    )}
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
                                    <Ionicons name="cash-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Thông tin tài chính</Text>
                                </View>
                                
                                <View style={styles.formGroup}>
                                    <View style={styles.labelContainer}>
                                        <Text style={styles.label}>Tổng tiền trước thuế (VNĐ)</Text>
                                        <Text style={styles.required}>*</Text>
                                    </View>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "subtotal" && styles.inputFocused,
                                            errors.subtotal && styles.inputError,
                                        ]}
                                        placeholder="0"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.subtotal?.toString()}
                                        onChangeText={(text) => {
                                            const value = parseFloat(text) || 0;
                                            setFormData({ ...formData, subtotal: value });
                                            if (errors.subtotal) setErrors({ ...errors, subtotal: "" });
                                        }}
                                        keyboardType="numeric"
                                        onFocus={() => setFocusedField("subtotal")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    {errors.subtotal && (
                                        <View style={styles.errorContainer}>
                                            <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                            <Text style={styles.errorText}>{errors.subtotal}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Thuế VAT (VNĐ)</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "tax_amount" && styles.inputFocused,
                                        ]}
                                        placeholder="0"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.tax_amount?.toString()}
                                        onChangeText={(text) => {
                                            const value = parseFloat(text) || 0;
                                            setFormData({ ...formData, tax_amount: value });
                                        }}
                                        keyboardType="numeric"
                                        onFocus={() => setFocusedField("tax_amount")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Giảm giá (VNĐ)</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "discount_amount" && styles.inputFocused,
                                        ]}
                                        placeholder="0"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.discount_amount?.toString()}
                                        onChangeText={(text) => {
                                            const value = parseFloat(text) || 0;
                                            setFormData({ ...formData, discount_amount: value });
                                        }}
                                        keyboardType="numeric"
                                        onFocus={() => setFocusedField("discount_amount")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Tổng cộng:</Text>
                                        <Text style={styles.summaryValue}>
                                            {formatCurrency(
                                                (formData.subtotal || 0) +
                                                (formData.tax_amount || 0) -
                                                (formData.discount_amount || 0)
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

            {/* Mark Paid Modal */}
            <Modal
                visible={showMarkPaidModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowMarkPaidModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Đánh Dấu Đã Thanh Toán</Text>
                            <TouchableOpacity onPress={() => setShowMarkPaidModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày thanh toán</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowPaidDatePicker(true)}
                                >
                                    <Text>
                                        {new Date(paidDate).toLocaleDateString("vi-VN")}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showPaidDatePicker && (
                                    <DateTimePicker
                                        value={new Date(paidDate)}
                                        mode="date"
                                        display="default"
                                        maximumDate={new Date()}
                                        onChange={(event, date) => {
                                            setShowPaidDatePicker(false);
                                            if (date) {
                                                setPaidDate(date.toISOString().split("T")[0]);
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.submitButton, styles.actionButtonSuccess, submitting && styles.submitButtonDisabled]}
                                    onPress={handleMarkPaid}
                                    disabled={submitting}
                                    activeOpacity={0.8}
                                >
                                    {submitting ? (
                                        <View style={styles.buttonContent}>
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                            <Text style={styles.submitButtonText}>Đang xử lý...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                            <Text style={styles.submitButtonText}>Xác Nhận</Text>
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
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
        textAlign: "center",
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
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
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
    actionsContainer: {
        gap: 12,
    },
    actionButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    actionButtonSuccess: {
        backgroundColor: "#10B981",
        shadowColor: "#10B981",
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
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
    labelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 4,
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
    inputError: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
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
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 6,
    },
    errorText: {
        fontSize: 12,
        color: "#EF4444",
        flex: 1,
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
});

