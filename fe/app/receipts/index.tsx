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
import { useRouter } from "expo-router";
import { receiptApi, Receipt, CreateReceiptData } from "@/api/receiptApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import BackButton from "@/components/BackButton";
import { useSelector } from "react-redux";
import type { RootState } from "@/reducers/index";

export default function ReceiptsScreen() {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.user);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [formData, setFormData] = useState<Partial<CreateReceiptData>>({
        receipt_date: new Date().toISOString().split("T")[0],
        type: "expense",
        amount: 0,
        payment_method: "",
        description: "",
        notes: "",
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filterType, setFilterType] = useState<"all" | "purchase" | "expense" | "payment">("all");
    const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "verified" | "cancelled">("all");

    useEffect(() => {
        loadReceipts();
        loadProjects();
    }, [filterType, filterStatus]);

    const loadReceipts = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (filterType !== "all") params.type = filterType;
            if (filterStatus !== "all") params.status = filterStatus;
            const response = await receiptApi.getReceipts(params);
            if (response.success) {
                setReceipts(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading receipts:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadProjects = async () => {
        try {
            const response = await projectApi.getProjects({ per_page: 1000 });
            if (response.success) {
                setProjects(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    };


    const onRefresh = () => {
        setRefreshing(true);
        loadReceipts();
    };

    const handleCreate = async () => {
        if (!formData.receipt_date || !formData.type || !formData.amount) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            setSubmitting(true);
            const response = await receiptApi.createReceipt(formData as CreateReceiptData);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo chứng từ thành công");
                setShowCreateModal(false);
                resetForm();
                loadReceipts();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo chứng từ");
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerify = async (receiptId: number) => {
        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xác thực chứng từ này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận",
                    onPress: async () => {
                        try {
                            const response = await receiptApi.verifyReceipt(receiptId);
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xác thực chứng từ thành công");
                                loadReceipts();
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác thực chứng từ");
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = async (receiptId: number) => {
        Alert.alert(
            "Xác nhận xóa",
            "Bạn có chắc chắn muốn xóa chứng từ này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await receiptApi.deleteReceipt(receiptId);
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa chứng từ thành công");
                                loadReceipts();
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa chứng từ");
                        }
                    },
                },
            ]
        );
    };

    const resetForm = () => {
        setFormData({
            receipt_date: new Date().toISOString().split("T")[0],
            type: "expense",
            amount: 0,
            payment_method: "",
            description: "",
            notes: "",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "purchase":
                return "Mua hàng";
            case "expense":
                return "Chi phí";
            case "payment":
                return "Thanh toán";
            default:
                return type;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "verified":
                return "#10B981";
            case "cancelled":
                return "#EF4444";
            default:
                return "#6B7280";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "verified":
                return "Đã xác thực";
            case "cancelled":
                return "Đã hủy";
            default:
                return "Nháp";
        }
    };

    const renderItem = ({ item }: { item: Receipt }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>
                        {item.receipt_number || `CT #${item.id}`}
                    </Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.receipt_date).toLocaleDateString("vi-VN")}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + "20" },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                    </Text>
                </View>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
                </View>
                <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                {item.project && (
                    <Text style={styles.projectText}>Dự án: {item.project.name}</Text>
                )}
                {item.supplier && (
                    <Text style={styles.supplierText}>Nhà cung cấp: {item.supplier.name}</Text>
                )}
                {item.description && (
                    <Text style={styles.descriptionText} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
            </View>
            <View style={styles.cardActions}>
                {item.status === "draft" && (
                    <>
                        {user?.role === "accountant" && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.verifyButton]}
                                onPress={() => handleVerify(item.id)}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                <Text style={[styles.actionText, { color: "#10B981" }]}>Xác thực</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleDelete(item.id)}
                        >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            <Text style={[styles.actionText, { color: "#EF4444" }]}>Xóa</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );

    const filteredReceipts = receipts;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Chứng Từ</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        resetForm();
                        setShowCreateModal(true);
                    }}
                >
                    <Ionicons name="add" size={24} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.filterButton, filterType === "all" && styles.filterButtonActive]}
                        onPress={() => setFilterType("all")}
                    >
                        <Text style={[styles.filterText, filterType === "all" && styles.filterTextActive]}>
                            Tất cả
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filterType === "purchase" && styles.filterButtonActive]}
                        onPress={() => setFilterType("purchase")}
                    >
                        <Text style={[styles.filterText, filterType === "purchase" && styles.filterTextActive]}>
                            Mua hàng
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filterType === "expense" && styles.filterButtonActive]}
                        onPress={() => setFilterType("expense")}
                    >
                        <Text style={[styles.filterText, filterType === "expense" && styles.filterTextActive]}>
                            Chi phí
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filterType === "payment" && styles.filterButtonActive]}
                        onPress={() => setFilterType("payment")}
                    >
                        <Text style={[styles.filterText, filterType === "payment" && styles.filterTextActive]}>
                            Thanh toán
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={filteredReceipts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có chứng từ</Text>
                        </View>
                    }
                />
            )}

            {/* Create Receipt Modal */}
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
                            <Text style={styles.modalTitle}>Tạo Chứng Từ</Text>
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
                                <Text style={styles.label}>Ngày chứng từ *</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text>{formData.receipt_date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={new Date(formData.receipt_date || new Date())}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowDatePicker(false);
                                            if (date) {
                                                setFormData({
                                                    ...formData,
                                                    receipt_date: date.toISOString().split("T")[0],
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Loại chứng từ *</Text>
                                <View style={styles.typeSelector}>
                                    {(["purchase", "expense", "payment"] as const).map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.typeOption,
                                                formData.type === type && styles.typeOptionActive,
                                            ]}
                                            onPress={() => setFormData({ ...formData, type })}
                                        >
                                            <Text
                                                style={[
                                                    styles.typeOptionText,
                                                    formData.type === type && styles.typeOptionTextActive,
                                                ]}
                                            >
                                                {getTypeLabel(type)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Dự án</Text>
                                <ScrollView style={styles.selectContainer}>
                                    {projects.map((project) => (
                                        <TouchableOpacity
                                            key={project.id}
                                            style={[
                                                styles.selectOption,
                                                formData.project_id === project.id && styles.selectOptionActive,
                                            ]}
                                            onPress={() =>
                                                setFormData({
                                                    ...formData,
                                                    project_id: formData.project_id === project.id ? undefined : project.id,
                                                })
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.selectOptionText,
                                                    formData.project_id === project.id && styles.selectOptionTextActive,
                                                ]}
                                            >
                                                {project.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Nhà cung cấp (ID)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập ID nhà cung cấp (tùy chọn)"
                                    value={formData.supplier_id?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({
                                            ...formData,
                                            supplier_id: text ? parseInt(text) : undefined,
                                        })
                                    }
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Số tiền *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={formData.amount?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, amount: parseFloat(text) || 0 })
                                    }
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Phương thức thanh toán</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tiền mặt, chuyển khoản..."
                                    value={formData.payment_method}
                                    onChangeText={(text) => setFormData({ ...formData, payment_method: text })}
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

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ghi chú</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Nhập ghi chú"
                                    value={formData.notes}
                                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
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
                                    <Text style={styles.submitButtonText}>Tạo Chứng Từ</Text>
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
    },
    addButton: {
        padding: 4,
    },
    filters: {
        backgroundColor: "#FFFFFF",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
    },
    filterButtonActive: {
        backgroundColor: "#3B82F6",
    },
    filterText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    filterTextActive: {
        color: "#FFFFFF",
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
    cardBody: {
        marginTop: 8,
    },
    typeBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: "#EFF6FF",
        marginBottom: 8,
    },
    typeText: {
        fontSize: 12,
        color: "#3B82F6",
        fontWeight: "500",
    },
    amountText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#3B82F6",
        marginTop: 4,
    },
    projectText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    supplierText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    descriptionText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 8,
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
    verifyButton: {
        backgroundColor: "#ECFDF5",
    },
    deleteButton: {
        backgroundColor: "#FEF2F2",
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
        padding: 16,
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
    typeSelector: {
        flexDirection: "row",
        gap: 8,
    },
    typeOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        alignItems: "center",
    },
    typeOptionActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    typeOptionText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    typeOptionTextActive: {
        color: "#FFFFFF",
    },
    selectContainer: {
        maxHeight: 150,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
    },
    selectOption: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    selectOptionActive: {
        backgroundColor: "#EFF6FF",
    },
    selectOptionText: {
        fontSize: 14,
        color: "#1F2937",
    },
    selectOptionTextActive: {
        color: "#3B82F6",
        fontWeight: "600",
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

