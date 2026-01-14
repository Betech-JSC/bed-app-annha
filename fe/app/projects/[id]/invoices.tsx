import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { invoiceApi, Invoice, CreateInvoiceData } from "@/api/invoiceApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function InvoicesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateInvoiceData>>({
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: new Date().toISOString().split("T")[0],
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        description: "",
        notes: "",
    });
    const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadInvoices();
    }, [id]);

    // Reload data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadInvoices();
        }, [id])
    );

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const response = await invoiceApi.getInvoices(Number(id));
            if (response.success) {
                setInvoices(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading invoices:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInvoices();
    };

    const handleCreate = async () => {
        if (!formData.invoice_date || !formData.subtotal) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            setSubmitting(true);
            const response = await invoiceApi.createInvoice(Number(id), formData as CreateInvoiceData);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo hóa đơn thành công");
                setShowCreateModal(false);
                resetForm();
                loadInvoices();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo hóa đơn");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSend = async (invoiceId: number) => {
        try {
            const response = await invoiceApi.sendInvoice(Number(id), invoiceId);
            if (response.success) {
                Alert.alert("Thành công", "Đã gửi hóa đơn");
                loadInvoices();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi hóa đơn");
        }
    };

    const handleMarkPaid = async (invoiceId: number) => {
        Alert.prompt(
            "Xác nhận thanh toán",
            "Nhập ngày thanh toán (YYYY-MM-DD):",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận",
                    onPress: async (paidDate) => {
                        if (!paidDate) {
                            Alert.alert("Lỗi", "Vui lòng nhập ngày thanh toán");
                            return;
                        }
                        try {
                            const response = await invoiceApi.markPaid(Number(id), invoiceId, paidDate);
                            if (response.success) {
                                Alert.alert("Thành công", "Đã đánh dấu hóa đơn đã thanh toán");
                                loadInvoices();
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể đánh dấu đã thanh toán");
                        }
                    },
                },
            ],
            "plain-text"
        );
    };

    const resetForm = () => {
        setFormData({
            invoice_date: new Date().toISOString().split("T")[0],
            due_date: new Date().toISOString().split("T")[0],
            subtotal: 0,
            tax_amount: 0,
            discount_amount: 0,
            description: "",
            notes: "",
        });
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
            default:
                return "#6B7280";
        }
    };

    const renderItem = ({ item }: { item: Invoice }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/projects/${id}/invoices/${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>HĐ #{item.id}</Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.invoice_date).toLocaleDateString("vi-VN")}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + "20" },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status === "paid"
                            ? "Đã thanh toán"
                            : item.status === "sent"
                                ? "Đã gửi"
                                : item.status === "overdue"
                                    ? "Quá hạn"
                                    : item.status === "partially_paid"
                                        ? "Thanh toán một phần"
                                        : "Nháp"}
                    </Text>
                </View>
            </View>
            <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
            {item.due_date && (
                <Text style={styles.dueDateText}>
                    Đến hạn: {new Date(item.due_date).toLocaleDateString("vi-VN")}
                </Text>
            )}
            <View style={styles.cardActions}>
                {item.status === "draft" && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleSend(item.id);
                        }}
                    >
                        <Ionicons name="send" size={18} color="#3B82F6" />
                        <Text style={styles.actionText}>Gửi</Text>
                    </TouchableOpacity>
                )}
                {item.status === "sent" && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleMarkPaid(item.id);
                        }}
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <Text style={[styles.actionText, { color: "#10B981" }]}>Đã thanh toán</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Hóa Đơn"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                    >
                        <Ionicons name="add" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={invoices}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: tabBarHeight }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có hóa đơn</Text>
                        </View>
                    }
                />
            )}

            {/* Create Invoice Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalContainer}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tạo Hóa Đơn</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày hóa đơn *</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowInvoiceDatePicker(true)}
                                >
                                    <Text>{formData.invoice_date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showInvoiceDatePicker && (
                                    <DateTimePicker
                                        value={new Date(formData.invoice_date || new Date())}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowInvoiceDatePicker(false);
                                            if (date) {
                                                setFormData({
                                                    ...formData,
                                                    invoice_date: date.toISOString().split("T")[0],
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày đến hạn</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowDueDatePicker(true)}
                                >
                                    <Text>{formData.due_date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showDueDatePicker && (
                                    <DateTimePicker
                                        value={new Date(formData.due_date || new Date())}
                                        mode="date"
                                        display="default"
                                        minimumDate={new Date(formData.invoice_date || new Date())}
                                        onChange={(event, date) => {
                                            setShowDueDatePicker(false);
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
                                <Text style={styles.label}>Tổng tiền (chưa VAT) *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={formData.subtotal?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, subtotal: parseFloat(text) || 0 })
                                    }
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>VAT</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={formData.tax_amount?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, tax_amount: parseFloat(text) || 0 })
                                    }
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Giảm giá</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={formData.discount_amount?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, discount_amount: parseFloat(text) || 0 })
                                    }
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mô tả</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Nhập mô tả"
                                    value={formData.description}
                                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                onPress={handleCreate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Tạo Hóa Đơn</Text>
                                )}
                            </TouchableOpacity>
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
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    addButton: {
        padding: 4,
    },
    card: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    cardHeaderLeft: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 13,
        color: "#6B7280",
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
    amountText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#3B82F6",
        marginTop: 8,
    },
    dueDateText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    cardActions: {
        flexDirection: "row",
        marginTop: 12,
        gap: 12,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
    },
    actionText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "500",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalContent: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
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
        paddingBottom: Platform.OS === "ios" ? 100 : 80,
        paddingHorizontal: 16,
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
        fontSize: 14,
        backgroundColor: "#FFFFFF",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});

