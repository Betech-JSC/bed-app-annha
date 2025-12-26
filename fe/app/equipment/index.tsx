import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { equipmentApi, Equipment, CreateEquipmentData } from "@/api/equipmentApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import BackButton from "@/components/BackButton";

const STATUS_LABELS: Record<string, string> = {
    available: "Sẵn sàng",
    in_use: "Đang sử dụng",
    maintenance: "Bảo trì",
    retired: "Ngừng sử dụng",
};

const TYPE_LABELS: Record<string, string> = {
    owned: "Sở hữu",
    rented: "Thuê",
};

export default function EquipmentScreen() {
    const router = useRouter();
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
    const [formData, setFormData] = useState<Partial<CreateEquipmentData>>({
        name: "",
        code: "",
        category: "",
        type: "owned",
        brand: "",
        model: "",
        serial_number: "",
        purchase_date: undefined,
        purchase_price: 0,
        rental_rate_per_day: 0,
        maintenance_interval_days: 30,
        status: "available",
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const response = await equipmentApi.getEquipment({
                search: searchQuery || undefined,
                active_only: true,
            });
            if (response.success) {
                setEquipment(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading equipment:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadEquipment();
    };

    const handleCreate = async () => {
        if (!formData.name) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            setSubmitting(true);
            const response = editingEquipment
                ? await equipmentApi.updateEquipment(editingEquipment.id, formData as any)
                : await equipmentApi.createEquipment(formData as CreateEquipmentData);

            if (response.success) {
                Alert.alert("Thành công", editingEquipment ? "Đã cập nhật thiết bị" : "Đã tạo thiết bị thành công");
                setShowCreateModal(false);
                resetForm();
                loadEquipment();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể thực hiện thao tác");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (item: Equipment) => {
        setEditingEquipment(item);
        setFormData({
            name: item.name,
            code: item.code || "",
            category: item.category || "",
            type: item.type,
            brand: item.brand || "",
            model: item.model || "",
            serial_number: item.serial_number || "",
            purchase_date: item.purchase_date,
            purchase_price: item.purchase_price || 0,
            rental_rate_per_day: item.rental_rate_per_day || 0,
            maintenance_interval_days: item.maintenance_interval_days || 30,
            status: item.status,
        });
        setShowCreateModal(true);
    };

    const handleDelete = (item: Equipment) => {
        Alert.alert(
            "Xác nhận",
            `Bạn có chắc chắn muốn xóa thiết bị "${item.name}"?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await equipmentApi.deleteEquipment(item.id);
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa thiết bị");
                                loadEquipment();
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa thiết bị");
                        }
                    },
                },
            ]
        );
    };

    const resetForm = () => {
        setEditingEquipment(null);
        setFormData({
            name: "",
            code: "",
            category: "",
            type: "owned",
            brand: "",
            model: "",
            serial_number: "",
            purchase_date: undefined,
            purchase_price: 0,
            rental_rate_per_day: 0,
            maintenance_interval_days: 30,
            status: "available",
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "available":
                return "#10B981";
            case "in_use":
                return "#3B82F6";
            case "maintenance":
                return "#F59E0B";
            case "retired":
                return "#6B7280";
            default:
                return "#6B7280";
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const renderItem = ({ item }: { item: Equipment }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.code && <Text style={styles.cardCode}>Mã: {item.code}</Text>}
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + "20" },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {STATUS_LABELS[item.status]}
                    </Text>
                </View>
            </View>
            <View style={styles.cardInfo}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Loại:</Text>
                    <Text style={styles.infoValue}>{TYPE_LABELS[item.type]}</Text>
                </View>
                {item.category && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Danh mục:</Text>
                        <Text style={styles.infoValue}>{item.category}</Text>
                    </View>
                )}
                {item.brand && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Hãng:</Text>
                        <Text style={styles.infoValue}>{item.brand}</Text>
                    </View>
                )}
                {item.purchase_price && item.purchase_price > 0 && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Giá mua:</Text>
                        <Text style={styles.infoValue}>{formatCurrency(item.purchase_price)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/equipment/${item.id}`)}
                >
                    <Ionicons name="eye" size={18} color="#3B82F6" />
                    <Text style={styles.actionText}>Chi tiết</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(item)}
                >
                    <Ionicons name="pencil" size={18} color="#3B82F6" />
                    <Text style={styles.actionText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item)}
                >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                    <Text style={[styles.actionText, styles.deleteText]}>Xóa</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Quản Lý Thiết Bị</Text>
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

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm thiết bị..."
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        setTimeout(() => {
                            if (text === searchQuery) {
                                loadEquipment();
                            }
                        }, 500);
                    }}
                />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={equipment}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="construct-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có thiết bị</Text>
                        </View>
                    }
                />
            )}

            {/* Create/Edit Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingEquipment ? "Sửa Thiết Bị" : "Tạo Thiết Bị"}
                            </Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={true}
                        >
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Tên thiết bị *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập tên thiết bị"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mã thiết bị</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập mã thiết bị (tùy chọn)"
                                    value={formData.code}
                                    onChangeText={(text) => setFormData({ ...formData, code: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Loại</Text>
                                <View style={styles.typeContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            formData.type === "owned" && styles.typeButtonActive,
                                        ]}
                                        onPress={() => setFormData({ ...formData, type: "owned" })}
                                    >
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                formData.type === "owned" && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Sở hữu
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            formData.type === "rented" && styles.typeButtonActive,
                                        ]}
                                        onPress={() => setFormData({ ...formData, type: "rented" })}
                                    >
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                formData.type === "rented" && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Thuê
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Danh mục</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập danh mục"
                                    value={formData.category}
                                    onChangeText={(text) => setFormData({ ...formData, category: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Hãng</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập hãng"
                                    value={formData.brand}
                                    onChangeText={(text) => setFormData({ ...formData, brand: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Model</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập model"
                                    value={formData.model}
                                    onChangeText={(text) => setFormData({ ...formData, model: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Số seri</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập số seri"
                                    value={formData.serial_number}
                                    onChangeText={(text) => setFormData({ ...formData, serial_number: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày mua</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text>
                                        {formData.purchase_date
                                            ? new Date(formData.purchase_date).toLocaleDateString("vi-VN")
                                            : "Chọn ngày"}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={formData.purchase_date ? new Date(formData.purchase_date) : new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowDatePicker(false);
                                            if (date) {
                                                setFormData({
                                                    ...formData,
                                                    purchase_date: date.toISOString().split("T")[0],
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Giá mua</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={formData.purchase_price?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, purchase_price: parseFloat(text) || 0 })
                                    }
                                    keyboardType="numeric"
                                />
                            </View>

                            {formData.type === "rented" && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Giá thuê/ngày</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        value={formData.rental_rate_per_day?.toString()}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, rental_rate_per_day: parseFloat(text) || 0 })
                                        }
                                        keyboardType="numeric"
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                onPress={handleCreate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        {editingEquipment ? "Cập Nhật" : "Tạo Mới"}
                                    </Text>
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
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: "#1F2937",
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
    cardCode: {
        fontSize: 12,
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
    cardInfo: {
        marginTop: 8,
        gap: 4,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    infoLabel: {
        fontSize: 13,
        color: "#6B7280",
    },
    infoValue: {
        fontSize: 13,
        fontWeight: "500",
        color: "#1F2937",
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
    deleteButton: {
        backgroundColor: "#FEE2E2",
    },
    actionText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "500",
    },
    deleteText: {
        color: "#EF4444",
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
        paddingBottom: 20,
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
    typeContainer: {
        flexDirection: "row",
        gap: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },
    typeButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    typeButtonText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    typeButtonTextActive: {
        color: "#FFFFFF",
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

