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
    KeyboardAvoidingView,
    Platform,
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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

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

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.trim() === "") {
            newErrors.name = "Tên thiết bị là bắt buộc";
        }

        if (formData.purchase_price !== undefined && formData.purchase_price < 0) {
            newErrors.purchase_price = "Giá mua không được âm";
        }

        if (formData.rental_rate_per_day !== undefined && formData.rental_rate_per_day < 0) {
            newErrors.rental_rate_per_day = "Giá thuê không được âm";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreate = async () => {
        if (!validateForm()) {
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
                setErrors({});
                loadEquipment();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể thực hiện thao tác";
            Alert.alert("Lỗi", errorMessage);
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
                            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể xóa thiết bị";
                            Alert.alert("Lỗi", errorMessage);
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
        setErrors({});
        setFocusedField(null);
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
                            nestedScrollEnabled={true}
                        >
                            {/* Thông tin cơ bản */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                                </View>

                                <View style={styles.formGroup}>
                                    <View style={styles.labelContainer}>
                                        <Text style={styles.label}>Tên thiết bị</Text>
                                        <Text style={styles.required}>*</Text>
                                    </View>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "name" && styles.inputFocused,
                                            errors.name && styles.inputError,
                                        ]}
                                        placeholder="Nhập tên thiết bị"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.name}
                                        onChangeText={(text) => {
                                            setFormData({ ...formData, name: text });
                                            if (errors.name) setErrors({ ...errors, name: "" });
                                        }}
                                        onFocus={() => setFocusedField("name")}
                                        onBlur={() => {
                                            setFocusedField(null);
                                            if (!formData.name || formData.name.trim() === "") {
                                                setErrors({ ...errors, name: "Tên thiết bị là bắt buộc" });
                                            }
                                        }}
                                    />
                                    {errors.name && (
                                        <View style={styles.errorContainer}>
                                            <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                            <Text style={styles.errorText}>{errors.name}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.formGroup}>
                                    <View style={styles.labelContainer}>
                                        <Text style={styles.label}>Mã thiết bị</Text>
                                        <Text style={styles.optional}>(Tùy chọn)</Text>
                                    </View>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "code" && styles.inputFocused,
                                        ]}
                                        placeholder="Nhập mã thiết bị"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.code}
                                        onChangeText={(text) => setFormData({ ...formData, code: text })}
                                        onFocus={() => setFocusedField("code")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Loại thiết bị</Text>
                                    <View style={styles.typeContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.typeButton,
                                                formData.type === "owned" && styles.typeButtonActive,
                                            ]}
                                            onPress={() => setFormData({ ...formData, type: "owned" })}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={formData.type === "owned" ? "checkmark-circle" : "ellipse-outline"}
                                                size={18}
                                                color={formData.type === "owned" ? "#FFFFFF" : "#6B7280"}
                                            />
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
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={formData.type === "rented" ? "checkmark-circle" : "ellipse-outline"}
                                                size={18}
                                                color={formData.type === "rented" ? "#FFFFFF" : "#6B7280"}
                                            />
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
                                        style={[
                                            styles.input,
                                            focusedField === "category" && styles.inputFocused,
                                        ]}
                                        placeholder="Nhập danh mục"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.category}
                                        onChangeText={(text) => setFormData({ ...formData, category: text })}
                                        onFocus={() => setFocusedField("category")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>

                            {/* Thông tin chi tiết */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="construct-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Hãng sản xuất</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "brand" && styles.inputFocused,
                                        ]}
                                        placeholder="Nhập hãng sản xuất"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.brand}
                                        onChangeText={(text) => setFormData({ ...formData, brand: text })}
                                        onFocus={() => setFocusedField("brand")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Model</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "model" && styles.inputFocused,
                                        ]}
                                        placeholder="Nhập model"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.model}
                                        onChangeText={(text) => setFormData({ ...formData, model: text })}
                                        onFocus={() => setFocusedField("model")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Số seri</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "serial_number" && styles.inputFocused,
                                        ]}
                                        placeholder="Nhập số seri"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.serial_number}
                                        onChangeText={(text) => setFormData({ ...formData, serial_number: text })}
                                        onFocus={() => setFocusedField("serial_number")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                            </View>

                            {/* Thông tin tài chính */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="cash-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Thông tin tài chính</Text>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Ngày mua</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.dateInput,
                                            focusedField === "purchase_date" && styles.inputFocused,
                                        ]}
                                        onPress={() => {
                                            setShowDatePicker(true);
                                            setFocusedField("purchase_date");
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={formData.purchase_date ? {} : styles.placeholderText}>
                                            {formData.purchase_date
                                                ? new Date(formData.purchase_date).toLocaleDateString("vi-VN")
                                                : "Chọn ngày mua"}
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
                                                setFocusedField(null);
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
                                    <Text style={styles.label}>Giá mua (VNĐ)</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            focusedField === "purchase_price" && styles.inputFocused,
                                            errors.purchase_price && styles.inputError,
                                        ]}
                                        placeholder="0"
                                        placeholderTextColor="#9CA3AF"
                                        value={formData.purchase_price?.toString()}
                                        onChangeText={(text) => {
                                            const value = parseFloat(text) || 0;
                                            setFormData({ ...formData, purchase_price: value });
                                            if (errors.purchase_price) setErrors({ ...errors, purchase_price: "" });
                                        }}
                                        keyboardType="numeric"
                                        onFocus={() => setFocusedField("purchase_price")}
                                        onBlur={() => {
                                            setFocusedField(null);
                                            if (formData.purchase_price !== undefined && formData.purchase_price < 0) {
                                                setErrors({ ...errors, purchase_price: "Giá mua không được âm" });
                                            }
                                        }}
                                    />
                                    {errors.purchase_price && (
                                        <View style={styles.errorContainer}>
                                            <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                            <Text style={styles.errorText}>{errors.purchase_price}</Text>
                                        </View>
                                    )}
                                </View>

                                {formData.type === "rented" && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Giá thuê/ngày (VNĐ)</Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                focusedField === "rental_rate_per_day" && styles.inputFocused,
                                                errors.rental_rate_per_day && styles.inputError,
                                            ]}
                                            placeholder="0"
                                            placeholderTextColor="#9CA3AF"
                                            value={formData.rental_rate_per_day?.toString()}
                                            onChangeText={(text) => {
                                                const value = parseFloat(text) || 0;
                                                setFormData({ ...formData, rental_rate_per_day: value });
                                                if (errors.rental_rate_per_day) setErrors({ ...errors, rental_rate_per_day: "" });
                                            }}
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField("rental_rate_per_day")}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                if (formData.rental_rate_per_day !== undefined && formData.rental_rate_per_day < 0) {
                                                    setErrors({ ...errors, rental_rate_per_day: "Giá thuê không được âm" });
                                                }
                                            }}
                                        />
                                        {errors.rental_rate_per_day && (
                                            <View style={styles.errorContainer}>
                                                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                                <Text style={styles.errorText}>{errors.rental_rate_per_day}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Submit Button */}
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                    onPress={handleCreate}
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
                                            <Ionicons
                                                name={editingEquipment ? "checkmark-circle" : "add-circle"}
                                                size={20}
                                                color="#FFFFFF"
                                            />
                                            <Text style={styles.submitButtonText}>
                                                {editingEquipment ? "Cập Nhật" : "Tạo Mới"}
                                            </Text>
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
    formSection: {
        marginBottom: 24,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 16,
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
    optional: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
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
    typeContainer: {
        flexDirection: "row",
        gap: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: "#F3F4F6",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },
    typeButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    typeButtonText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "600",
    },
    typeButtonTextActive: {
        color: "#FFFFFF",
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

