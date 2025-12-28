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
import { materialApi, Material, MaterialTransaction, CreateMaterialData } from "@/api/materialApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/components/BackButton";

export default function MaterialDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [material, setMaterial] = useState<Material | null>(null);
    const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [formData, setFormData] = useState<Partial<CreateMaterialData>>({
        name: "",
        code: "",
        unit: "kg",
        description: "",
        min_stock_level: 0,
        project_id: undefined,
    });
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"details" | "transactions">("details");

    useEffect(() => {
        loadMaterial();
        loadProjects();
    }, [id]);

    const loadMaterial = async () => {
        try {
            setLoading(true);
            const [materialRes, transactionsRes] = await Promise.all([
                materialApi.getMaterial(Number(id)),
                materialApi.getTransactions(Number(id)),
            ]);

            if (materialRes.success) {
                setMaterial(materialRes.data);
                setFormData({
                    name: materialRes.data.name,
                    code: materialRes.data.code || "",
                    unit: materialRes.data.unit,
                    description: materialRes.data.description || "",
                    min_stock_level: materialRes.data.min_stock_level,
                    project_id: materialRes.data.project_id,
                });

                // Set selected project
                if (materialRes.data.project_id) {
                    const project = projects.find((p) => p.id === materialRes.data.project_id);
                    if (project) {
                        setSelectedProject(project);
                    }
                }
            }

            if (transactionsRes.success) {
                const data = transactionsRes.data?.data || transactionsRes.data || [];
                setTransactions(Array.isArray(data) ? data : []);
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải vật liệu";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadProjects = async () => {
        try {
            const response = await projectApi.getProjects({ page: 1 });
            if (response.success) {
                setProjects(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadMaterial();
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.trim() === "") {
            newErrors.name = "Tên vật liệu là bắt buộc";
        }

        if (!formData.unit || formData.unit.trim() === "") {
            newErrors.unit = "Đơn vị là bắt buộc";
        }

        if (formData.min_stock_level !== undefined && formData.min_stock_level < 0) {
            newErrors.min_stock_level = "Mức tồn kho tối thiểu không được âm";
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
            const response = await materialApi.updateMaterial(Number(id), formData as CreateMaterialData);
            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật vật liệu");
                setShowEditModal(false);
                setErrors({});
                loadMaterial();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể cập nhật vật liệu";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xóa vật liệu này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await materialApi.deleteMaterial(Number(id));
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa vật liệu", [
                                    { text: "OK", onPress: () => router.back() },
                                ]);
                            }
                        } catch (error: any) {
                            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể xóa vật liệu";
                            Alert.alert("Lỗi", errorMessage);
                        }
                    },
                },
            ]
        );
    };

    const getStockStatus = (material: Material) => {
        if (material.current_stock <= 0) {
            return { color: "#EF4444", text: "Hết hàng" };
        }
        if (material.current_stock < material.min_stock_level) {
            return { color: "#F59E0B", text: "Sắp hết" };
        }
        return { color: "#10B981", text: "Đủ" };
    };

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case "in":
                return "Nhập kho";
            case "out":
                return "Xuất kho";
            case "adjustment":
                return "Điều chỉnh";
            default:
                return type;
        }
    };

    const getTransactionTypeColor = (type: string) => {
        switch (type) {
            case "in":
                return "#10B981";
            case "out":
                return "#EF4444";
            case "adjustment":
                return "#3B82F6";
            default:
                return "#6B7280";
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderTransactionItem = ({ item }: { item: MaterialTransaction }) => (
        <View style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
                <View
                    style={[
                        styles.transactionTypeBadge,
                        { backgroundColor: getTransactionTypeColor(item.type) + "20" },
                    ]}
                >
                    <Text style={[styles.transactionTypeText, { color: getTransactionTypeColor(item.type) }]}>
                        {getTransactionTypeLabel(item.type)}
                    </Text>
                </View>
                <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
            </View>
            <View style={styles.transactionInfo}>
                <Text style={styles.transactionQuantity}>
                    {item.type === "in" ? "+" : item.type === "out" ? "-" : ""}
                    {item.quantity} {material?.unit}
                </Text>
                {item.project && (
                    <Text style={styles.transactionProject}>Dự án: {item.project.name}</Text>
                )}
                {item.notes && (
                    <Text style={styles.transactionNotes}>{item.notes}</Text>
                )}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!material) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Không tìm thấy vật liệu</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const stockStatus = getStockStatus(material);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Chi Tiết Vật Liệu</Text>
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
                {/* Stock Status Card */}
                <View style={styles.stockCard}>
                    <View style={styles.stockHeader}>
                        <Ionicons name="cube-outline" size={32} color="#3B82F6" />
                        <View style={styles.stockInfo}>
                            <Text style={styles.stockLabel}>Tồn kho hiện tại</Text>
                            <Text style={styles.stockValue}>
                                {material.current_stock} {material.unit}
                            </Text>
                        </View>
                    </View>
                    <View
                        style={[
                            styles.stockStatusBadge,
                            { backgroundColor: stockStatus.color + "20" },
                        ]}
                    >
                        <Text style={[styles.stockStatusText, { color: stockStatus.color }]}>
                            {stockStatus.text}
                        </Text>
                    </View>
                    {material.min_stock_level > 0 && (
                        <Text style={styles.minStockText}>
                            Mức tối thiểu: {material.min_stock_level} {material.unit}
                        </Text>
                    )}
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
                        style={[styles.tab, activeTab === "transactions" && styles.tabActive]}
                        onPress={() => setActiveTab("transactions")}
                    >
                        <Text style={[styles.tabText, activeTab === "transactions" && styles.tabTextActive]}>
                            Lịch sử ({transactions.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Details Tab */}
                {activeTab === "details" && (
                    <View style={styles.detailsSection}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tên vật liệu:</Text>
                                <Text style={styles.infoValue}>{material.name}</Text>
                            </View>
                            {material.code && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Mã:</Text>
                                    <Text style={styles.infoValue}>{material.code}</Text>
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Đơn vị:</Text>
                                <Text style={styles.infoValue}>{material.unit}</Text>
                            </View>
                            {material.description && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Mô tả:</Text>
                                    <Text style={styles.infoValue}>{material.description}</Text>
                                </View>
                            )}
                            {selectedProject && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Dự án:</Text>
                                    <Text style={styles.infoValue}>{selectedProject.name}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Thông tin tồn kho</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tồn kho hiện tại:</Text>
                                <Text style={[styles.infoValue, styles.stockValue]}>
                                    {material.current_stock} {material.unit}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Mức tối thiểu:</Text>
                                <Text style={styles.infoValue}>
                                    {material.min_stock_level} {material.unit}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Transactions Tab */}
                {activeTab === "transactions" && (
                    <View style={styles.transactionsSection}>
                        {transactions.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyText}>Chưa có giao dịch</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={transactions}
                                renderItem={renderTransactionItem}
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
                        <Text style={styles.modalTitle}>Chỉnh Sửa Vật Liệu</Text>
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
                                    Tên vật liệu <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        errors.name && styles.inputError,
                                        focusedField === "name" && styles.inputFocused,
                                    ]}
                                    placeholder="Nhập tên vật liệu"
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
                                <Text style={styles.label}>Mã vật liệu</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        errors.code && styles.inputError,
                                        focusedField === "code" && styles.inputFocused,
                                    ]}
                                    placeholder="Nhập mã vật liệu (tùy chọn)"
                                    value={formData.code}
                                    onChangeText={(text) => {
                                        setFormData({ ...formData, code: text });
                                        if (errors.code) {
                                            setErrors({ ...errors, code: "" });
                                        }
                                    }}
                                    onFocus={() => setFocusedField("code")}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    Đơn vị <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        errors.unit && styles.inputError,
                                        focusedField === "unit" && styles.inputFocused,
                                    ]}
                                    placeholder="kg, m, m², m³..."
                                    value={formData.unit}
                                    onChangeText={(text) => {
                                        setFormData({ ...formData, unit: text });
                                        if (errors.unit) {
                                            setErrors({ ...errors, unit: "" });
                                        }
                                    }}
                                    onFocus={() => setFocusedField("unit")}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mô tả</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        styles.textArea,
                                        focusedField === "description" && styles.inputFocused,
                                    ]}
                                    placeholder="Nhập mô tả (tùy chọn)"
                                    value={formData.description}
                                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                                    multiline
                                    numberOfLines={4}
                                    onFocus={() => setFocusedField("description")}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mức tồn kho tối thiểu</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        errors.min_stock_level && styles.inputError,
                                        focusedField === "min_stock_level" && styles.inputFocused,
                                    ]}
                                    placeholder="0"
                                    value={formData.min_stock_level?.toString() || "0"}
                                    onChangeText={(text) => {
                                        const value = text === "" ? 0 : parseFloat(text);
                                        setFormData({ ...formData, min_stock_level: isNaN(value) ? 0 : value });
                                        if (errors.min_stock_level) {
                                            setErrors({ ...errors, min_stock_level: "" });
                                        }
                                    }}
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField("min_stock_level")}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.min_stock_level && (
                                    <Text style={styles.errorText}>{errors.min_stock_level}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Dự án</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.input,
                                        styles.pickerInput,
                                        focusedField === "project_id" && styles.inputFocused,
                                    ]}
                                    onPress={() => setShowProjectPicker(true)}
                                    onFocus={() => setFocusedField("project_id")}
                                >
                                    <Text style={selectedProject ? styles.pickerText : styles.pickerPlaceholder}>
                                        {selectedProject ? selectedProject.name : "Chọn dự án (tùy chọn)"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                </TouchableOpacity>
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

            {/* Project Picker Modal */}
            <Modal
                visible={showProjectPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowProjectPicker(false)}
            >
                <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerModal}>
                        <View style={styles.pickerModalHeader}>
                            <Text style={styles.pickerModalTitle}>Chọn dự án</Text>
                            <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={[{ id: null, name: "Không chọn" }, ...projects]}
                            keyExtractor={(item) => (item.id ? item.id.toString() : "none")}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.pickerItem,
                                        selectedProject?.id === item.id && styles.pickerItemSelected,
                                    ]}
                                    onPress={() => {
                                        if (item.id === null) {
                                            setSelectedProject(null);
                                            setFormData({ ...formData, project_id: undefined });
                                        } else {
                                            setSelectedProject(item);
                                            setFormData({ ...formData, project_id: item.id });
                                        }
                                        setShowProjectPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerItemText,
                                            selectedProject?.id === item.id && styles.pickerItemTextSelected,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                    {selectedProject?.id === item.id && (
                                        <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
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
    stockCard: {
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
    stockHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 16,
    },
    stockInfo: {
        flex: 1,
    },
    stockLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    stockValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    stockStatusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginBottom: 8,
    },
    stockStatusText: {
        fontSize: 14,
        fontWeight: "600",
    },
    minStockText: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
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
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#FFFFFF",
    },
    detailsSection: {
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
    transactionsSection: {
        padding: 16,
    },
    transactionCard: {
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
    transactionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    transactionTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    transactionTypeText: {
        fontSize: 12,
        fontWeight: "600",
    },
    transactionDate: {
        fontSize: 12,
        color: "#6B7280",
    },
    transactionInfo: {
        gap: 4,
    },
    transactionQuantity: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    transactionProject: {
        fontSize: 14,
        color: "#6B7280",
    },
    transactionNotes: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 4,
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
    textArea: {
        height: 100,
        textAlignVertical: "top",
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
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    pickerModal: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
    },
    pickerModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    pickerModalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    pickerItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    pickerItemSelected: {
        backgroundColor: "#EFF6FF",
    },
    pickerItemText: {
        fontSize: 16,
        color: "#1F2937",
    },
    pickerItemTextSelected: {
        color: "#3B82F6",
        fontWeight: "600",
    },
});

