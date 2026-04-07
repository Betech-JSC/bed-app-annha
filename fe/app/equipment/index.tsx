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
import { ScreenHeader, DatePickerInput, CurrencyInput, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";
import { usePermissions } from "@/hooks/usePermissions";

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
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = usePermissions();
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
    type EquipmentFormData = {
        name: string;
        code: string;
        category: string;
        notes: string;
    };
    const [formData, setFormData] = useState<EquipmentFormData>({
        name: "",
        code: "",
        category: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");

    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    useEffect(() => {
        loadEquipment();
    }, [selectedStatus]); // Reload when status changes

    const loadEquipment = async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            setPermissionMessage("");
            const response = await equipmentApi.getEquipment({
                search: searchQuery || undefined,
                status: selectedStatus !== "all" ? selectedStatus : undefined,
                // active_only: true, // Removed to allow viewing all statuses including Retired
            });
            if (response.success) {
                setEquipment(response.data.data || []);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem danh sách thiết bị.");
            } else {
                console.error("Error loading equipment:", error);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status);
        // useEffect will trigger loadEquipment
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
                ? await equipmentApi.updateEquipment(editingEquipment.id, formData)
                : await equipmentApi.createEquipment(formData);

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
            notes: (item as any).notes || "",
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
            notes: "",
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
                {item.category && (
                    <View style={styles.infoRow}>
                        <Ionicons name="folder-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoLabel}>Danh mục:</Text>
                        <Text style={styles.infoValue}>{item.category}</Text>
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
                <PermissionGuard permission={Permissions.EQUIPMENT_UPDATE}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(item)}
                    >
                        <Ionicons name="pencil" size={18} color="#3B82F6" />
                        <Text style={styles.actionText}>Sửa</Text>
                    </TouchableOpacity>
                </PermissionGuard>
                <PermissionGuard permission={Permissions.EQUIPMENT_DELETE}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(item)}
                    >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                        <Text style={[styles.actionText, styles.deleteText]}>Xóa</Text>
                    </TouchableOpacity>
                </PermissionGuard>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* ... ScreenHeader ... */}
            <ScreenHeader
                title="Kho Tài Sản Thiết Bị"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.EQUIPMENT_CREATE}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => {
                                resetForm();
                                setShowCreateModal(true);
                            }}
                        >
                            <Ionicons name="add" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm thiết bị..."
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        // Debounce handling could be improved, but strictly keeping existing logic structure
                        setTimeout(() => {
                            if (text === searchQuery) {
                                loadEquipment();
                            }
                        }, 500);
                    }}
                />
            </View>

            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    <TouchableOpacity
                        style={[styles.filterChip, selectedStatus === "all" && styles.filterChipActive]}
                        onPress={() => handleStatusFilter("all")}
                    >
                        <Text style={[styles.filterChipText, selectedStatus === "all" && styles.filterChipTextActive]}>Tất cả</Text>
                    </TouchableOpacity>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.filterChip, selectedStatus === key && styles.filterChipActive]}
                            onPress={() => handleStatusFilter(key)}
                        >
                            <Text style={[styles.filterChipText, selectedStatus === key && styles.filterChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {permissionDenied ? (
                <PermissionDenied message={permissionMessage} />
            ) : loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={equipment}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: tabBarHeight }}
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
                presentationStyle="fullScreen"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalContent}>
                    <ScreenHeader
                        title={editingEquipment ? "Sửa Thiết Bị" : "Tạo Thiết Bị"}
                        leftComponent={
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        }
                    />

                    <ScrollView
                        style={styles.modalBody}
                        contentContainerStyle={styles.modalBodyContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                    >




                        {/* Thông tin thiết bị */}
                        <View style={styles.formSection}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="construct-outline" size={20} color="#3B82F6" />
                                <Text style={styles.sectionTitle}>Thông tin thiết bị</Text>
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

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mô tả / Ghi chú</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        styles.textArea,
                                        focusedField === "notes" && styles.inputFocused,
                                    ]}
                                    placeholder="Nhập mô tả chi tiết"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.notes}
                                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                                    onFocus={() => setFocusedField("notes")}
                                    onBlur={() => setFocusedField(null)}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
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
    infoValueCost: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
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
        paddingTop: 40,
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
    textArea: {
        height: 100,
        paddingTop: 12,
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
    statusPickerContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
    },
    statusPickerOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        marginBottom: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusPickerText: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "500",
    },
    filterContainer: {
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    filterContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    filterChipTextActive: {
        color: '#3B82F6',
        fontWeight: '600',
    },
});

