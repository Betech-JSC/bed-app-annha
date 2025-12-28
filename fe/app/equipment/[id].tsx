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
    FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentApi, Equipment, EquipmentAllocation, EquipmentMaintenance, CreateEquipmentData } from "@/api/equipmentApi";
import { Ionicons } from "@expo/vector-icons";
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

export default function EquipmentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [equipment, setEquipment] = useState<Equipment | null>(null);
    const [allocations, setAllocations] = useState<EquipmentAllocation[]>([]);
    const [maintenances, setMaintenances] = useState<EquipmentMaintenance[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
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
    const [datePickerField, setDatePickerField] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"details" | "allocations" | "maintenance">("details");

    useEffect(() => {
        loadEquipment();
    }, [id]);

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const [equipmentRes, allocationsRes, maintenancesRes] = await Promise.all([
                equipmentApi.getEquipmentItem(Number(id)),
                equipmentApi.getAllocations(Number(id)),
                equipmentApi.getMaintenance(Number(id)),
            ]);

            if (equipmentRes.success) {
                setEquipment(equipmentRes.data);
                setFormData({
                    name: equipmentRes.data.name,
                    code: equipmentRes.data.code || "",
                    category: equipmentRes.data.category || "",
                    type: equipmentRes.data.type,
                    brand: equipmentRes.data.brand || "",
                    model: equipmentRes.data.model || "",
                    serial_number: equipmentRes.data.serial_number || "",
                    purchase_date: equipmentRes.data.purchase_date,
                    purchase_price: equipmentRes.data.purchase_price || 0,
                    rental_rate_per_day: equipmentRes.data.rental_rate_per_day || 0,
                    maintenance_interval_days: equipmentRes.data.maintenance_interval_days || 30,
                    status: equipmentRes.data.status,
                });
            }

            if (allocationsRes.success) {
                const data = allocationsRes.data?.data || allocationsRes.data || [];
                setAllocations(Array.isArray(data) ? data : []);
            }

            if (maintenancesRes.success) {
                const data = maintenancesRes.data?.data || maintenancesRes.data || [];
                setMaintenances(Array.isArray(data) ? data : []);
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải thiết bị";
            Alert.alert("Lỗi", errorMessage);
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

    const handleUpdate = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setSubmitting(true);
            const response = await equipmentApi.updateEquipment(Number(id), formData as CreateEquipmentData);
            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật thiết bị");
                setShowEditModal(false);
                setErrors({});
                loadEquipment();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể cập nhật thiết bị";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xóa thiết bị này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await equipmentApi.deleteEquipment(Number(id));
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa thiết bị", [
                                    { text: "OK", onPress: () => router.back() },
                                ]);
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Chưa có";
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderAllocationItem = ({ item }: { item: EquipmentAllocation }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + "20" },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status === "active" ? "Đang sử dụng" : item.status === "completed" ? "Hoàn thành" : "Đã hủy"}
                    </Text>
                </View>
            </View>
            {item.project && (
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dự án:</Text>
                    <Text style={styles.infoValue}>{item.project.name}</Text>
                </View>
            )}
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày bắt đầu:</Text>
                <Text style={styles.infoValue}>{formatDate(item.start_date)}</Text>
            </View>
            {item.end_date && (
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngày kết thúc:</Text>
                    <Text style={styles.infoValue}>{formatDate(item.end_date)}</Text>
                </View>
            )}
            {item.notes && (
                <Text style={styles.notesText}>{item.notes}</Text>
            )}
        </View>
    );

    const renderMaintenanceItem = ({ item }: { item: EquipmentMaintenance }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Bảo trì</Text>
                <Text style={styles.cardDate}>{formatDate(item.maintenance_date)}</Text>
            </View>
            {item.description && (
                <Text style={styles.descriptionText}>{item.description}</Text>
            )}
            {item.cost && item.cost > 0 && (
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chi phí:</Text>
                    <Text style={styles.infoValue}>{formatCurrency(item.cost)}</Text>
                </View>
            )}
            {item.performed_by && (
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Thực hiện bởi:</Text>
                    <Text style={styles.infoValue}>{item.performed_by}</Text>
                </View>
            )}
            {item.next_due_date && (
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Lần bảo trì tiếp theo:</Text>
                    <Text style={styles.infoValue}>{formatDate(item.next_due_date)}</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!equipment) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Không tìm thấy thiết bị</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Chi Tiết Thiết Bị</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setShowEditModal(true)}
                    >
                        <Ionicons name="pencil" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleDelete}
                    >
                        <Ionicons name="trash" size={24} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <Ionicons name="construct-outline" size={32} color="#3B82F6" />
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusLabel}>Trạng thái</Text>
                            <Text style={styles.statusValue}>{STATUS_LABELS[equipment.status]}</Text>
                        </View>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(equipment.status) + "20" },
                        ]}
                    >
                        <Text style={[styles.statusText, { color: getStatusColor(equipment.status) }]}>
                            {STATUS_LABELS[equipment.status]}
                        </Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "details" && styles.tabActive]}
                        onPress={() => setActiveTab("details")}
                    >
                        <Text style={[styles.tabText, activeTab === "details" && styles.tabTextActive]}>
                            Thông tin
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "allocations" && styles.tabActive]}
                        onPress={() => setActiveTab("allocations")}
                    >
                        <Text style={[styles.tabText, activeTab === "allocations" && styles.tabTextActive]}>
                            Phân bổ ({allocations.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "maintenance" && styles.tabActive]}
                        onPress={() => setActiveTab("maintenance")}
                    >
                        <Text style={[styles.tabText, activeTab === "maintenance" && styles.tabTextActive]}>
                            Bảo trì ({maintenances.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Details Tab */}
                {activeTab === "details" && (
                    <View style={styles.detailsSection}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tên thiết bị:</Text>
                                <Text style={styles.infoValue}>{equipment.name}</Text>
                            </View>
                            {equipment.code && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Mã:</Text>
                                    <Text style={styles.infoValue}>{equipment.code}</Text>
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Loại:</Text>
                                <Text style={styles.infoValue}>{TYPE_LABELS[equipment.type]}</Text>
                            </View>
                            {equipment.category && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Danh mục:</Text>
                                    <Text style={styles.infoValue}>{equipment.category}</Text>
                                </View>
                            )}
                            {equipment.brand && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Hãng:</Text>
                                    <Text style={styles.infoValue}>{equipment.brand}</Text>
                                </View>
                            )}
                            {equipment.model && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Model:</Text>
                                    <Text style={styles.infoValue}>{equipment.model}</Text>
                                </View>
                            )}
                            {equipment.serial_number && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Số seri:</Text>
                                    <Text style={styles.infoValue}>{equipment.serial_number}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Thông tin tài chính</Text>
                            {equipment.purchase_date && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Ngày mua:</Text>
                                    <Text style={styles.infoValue}>{formatDate(equipment.purchase_date)}</Text>
                                </View>
                            )}
                            {equipment.purchase_price && equipment.purchase_price > 0 && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Giá mua:</Text>
                                    <Text style={styles.infoValue}>{formatCurrency(equipment.purchase_price)}</Text>
                                </View>
                            )}
                            {equipment.type === "rented" && equipment.rental_rate_per_day && equipment.rental_rate_per_day > 0 && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Giá thuê/ngày:</Text>
                                    <Text style={styles.infoValue}>{formatCurrency(equipment.rental_rate_per_day)}</Text>
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Chu kỳ bảo trì:</Text>
                                <Text style={styles.infoValue}>{equipment.maintenance_interval_days} ngày</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Allocations Tab */}
                {activeTab === "allocations" && (
                    <View style={styles.listSection}>
                        {allocations.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyText}>Chưa có phân bổ</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={allocations}
                                renderItem={renderAllocationItem}
                                keyExtractor={(item) => item.id.toString()}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                )}

                {/* Maintenance Tab */}
                {activeTab === "maintenance" && (
                    <View style={styles.listSection}>
                        {maintenances.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="build-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyText}>Chưa có bảo trì</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={maintenances}
                                renderItem={renderMaintenanceItem}
                                keyExtractor={(item) => item.id.toString()}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setShowEditModal(false);
                    setErrors({});
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Chỉnh Sửa Thiết Bị</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowEditModal(false);
                                setErrors({});
                            }}
                        >
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    Tên thiết bị <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        errors.name && styles.inputError,
                                        focusedField === "name" && styles.inputFocused,
                                    ]}
                                    placeholder="Nhập tên thiết bị"
                                    value={formData.name}
                                    onChangeText={(text) => {
                                        setFormData({ ...formData, name: text });
                                        if (errors.name) {
                                            setErrors({ ...errors, name: "" });
                                        }
                                    }}
                                    onFocus={() => setFocusedField("name")}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mã thiết bị</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === "code" && styles.inputFocused,
                                    ]}
                                    placeholder="Nhập mã thiết bị (tùy chọn)"
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
                                    placeholder="Nhập danh mục (tùy chọn)"
                                    value={formData.category}
                                    onChangeText={(text) => setFormData({ ...formData, category: text })}
                                    onFocus={() => setFocusedField("category")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Loại</Text>
                                <View style={styles.radioGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            formData.type === "owned" && styles.radioOptionSelected,
                                        ]}
                                        onPress={() => setFormData({ ...formData, type: "owned" })}
                                    >
                                        <View style={styles.radio}>
                                            {formData.type === "owned" && <View style={styles.radioSelected} />}
                                        </View>
                                        <Text style={styles.radioLabel}>Sở hữu</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            formData.type === "rented" && styles.radioOptionSelected,
                                        ]}
                                        onPress={() => setFormData({ ...formData, type: "rented" })}
                                    >
                                        <View style={styles.radio}>
                                            {formData.type === "rented" && <View style={styles.radioSelected} />}
                                        </View>
                                        <Text style={styles.radioLabel}>Thuê</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Hãng</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === "brand" && styles.inputFocused,
                                    ]}
                                    placeholder="Nhập hãng (tùy chọn)"
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
                                    placeholder="Nhập model (tùy chọn)"
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
                                    placeholder="Nhập số seri (tùy chọn)"
                                    value={formData.serial_number}
                                    onChangeText={(text) => setFormData({ ...formData, serial_number: text })}
                                    onFocus={() => setFocusedField("serial_number")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày mua</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.input,
                                        styles.pickerInput,
                                        focusedField === "purchase_date" && styles.inputFocused,
                                    ]}
                                    onPress={() => {
                                        setDatePickerField("purchase_date");
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={formData.purchase_date ? styles.pickerText : styles.pickerPlaceholder}>
                                        {formData.purchase_date ? formatDate(formData.purchase_date) : "Chọn ngày mua (tùy chọn)"}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Giá mua (VNĐ)</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        errors.purchase_price && styles.inputError,
                                        focusedField === "purchase_price" && styles.inputFocused,
                                    ]}
                                    placeholder="0"
                                    value={formData.purchase_price?.toString() || "0"}
                                    onChangeText={(text) => {
                                        const value = text === "" ? 0 : parseFloat(text);
                                        setFormData({ ...formData, purchase_price: isNaN(value) ? 0 : value });
                                        if (errors.purchase_price) {
                                            setErrors({ ...errors, purchase_price: "" });
                                        }
                                    }}
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField("purchase_price")}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.purchase_price && (
                                    <Text style={styles.errorText}>{errors.purchase_price}</Text>
                                )}
                            </View>

                            {formData.type === "rented" && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Giá thuê/ngày (VNĐ)</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            errors.rental_rate_per_day && styles.inputError,
                                            focusedField === "rental_rate_per_day" && styles.inputFocused,
                                        ]}
                                        placeholder="0"
                                        value={formData.rental_rate_per_day?.toString() || "0"}
                                        onChangeText={(text) => {
                                            const value = text === "" ? 0 : parseFloat(text);
                                            setFormData({ ...formData, rental_rate_per_day: isNaN(value) ? 0 : value });
                                            if (errors.rental_rate_per_day) {
                                                setErrors({ ...errors, rental_rate_per_day: "" });
                                            }
                                        }}
                                        keyboardType="numeric"
                                        onFocus={() => setFocusedField("rental_rate_per_day")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                    {errors.rental_rate_per_day && (
                                        <Text style={styles.errorText}>{errors.rental_rate_per_day}</Text>
                                    )}
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Chu kỳ bảo trì (ngày)</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        focusedField === "maintenance_interval_days" && styles.inputFocused,
                                    ]}
                                    placeholder="30"
                                    value={formData.maintenance_interval_days?.toString() || "30"}
                                    onChangeText={(text) => {
                                        const value = text === "" ? 30 : parseInt(text);
                                        setFormData({ ...formData, maintenance_interval_days: isNaN(value) ? 30 : value });
                                    }}
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField("maintenance_interval_days")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Trạng thái</Text>
                                <View style={styles.statusPicker}>
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <TouchableOpacity
                                            key={value}
                                            style={[
                                                styles.statusOption,
                                                formData.status === value && styles.statusOptionSelected,
                                            ]}
                                            onPress={() => setFormData({ ...formData, status: value as any })}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusOptionText,
                                                    formData.status === value && styles.statusOptionTextSelected,
                                                ]}
                                            >
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowEditModal(false);
                                    setErrors({});
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, submitting && styles.saveButtonDisabled]}
                                onPress={handleUpdate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Cập nhật</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={formData.purchase_date ? new Date(formData.purchase_date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate && datePickerField === "purchase_date") {
                            setFormData({ ...formData, purchase_date: selectedDate.toISOString().split("T")[0] });
                        }
                        setDatePickerField(null);
                    }}
                />
            )}
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
        marginLeft: 12,
    },
    headerActions: {
        flexDirection: "row",
        gap: 12,
    },
    headerButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    statusCard: {
        backgroundColor: "#FFFFFF",
        margin: 16,
        padding: 20,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 16,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "600",
    },
    tabs: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: "#3B82F6",
    },
    tabText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#FFFFFF",
    },
    detailsSection: {
        padding: 16,
    },
    listSection: {
        padding: 16,
    },
    section: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
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
        flex: 2,
        textAlign: "right",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    cardDate: {
        fontSize: 12,
        color: "#6B7280",
    },
    descriptionText: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 8,
    },
    notesText: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 8,
        fontStyle: "italic",
    },
    emptyContainer: {
        padding: 40,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
    },
    errorText: {
        fontSize: 16,
        color: "#EF4444",
        marginBottom: 16,
    },
    backButton: {
        backgroundColor: "#3B82F6",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalContent: {
        padding: 16,
    },
    formSection: {
        marginBottom: 24,
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
    required: {
        color: "#EF4444",
    },
    input: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#FFFFFF",
    },
    inputFocused: {
        borderColor: "#3B82F6",
        borderWidth: 2,
    },
    inputError: {
        borderColor: "#EF4444",
    },
    pickerInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    pickerText: {
        fontSize: 16,
        color: "#1F2937",
    },
    pickerPlaceholder: {
        fontSize: 16,
        color: "#9CA3AF",
    },
    radioGroup: {
        flexDirection: "row",
        gap: 16,
    },
    radioOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        flex: 1,
    },
    radioOptionSelected: {
        borderColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        justifyContent: "center",
        alignItems: "center",
    },
    radioSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#3B82F6",
    },
    radioLabel: {
        fontSize: 14,
        color: "#1F2937",
    },
    statusPicker: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    statusOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        backgroundColor: "#FFFFFF",
    },
    statusOptionSelected: {
        borderColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
    },
    statusOptionText: {
        fontSize: 14,
        color: "#1F2937",
    },
    statusOptionTextSelected: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
        marginBottom: 32,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#E5E7EB",
    },
    cancelButtonText: {
        color: "#1F2937",
        fontWeight: "600",
    },
    saveButton: {
        backgroundColor: "#3B82F6",
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
});

