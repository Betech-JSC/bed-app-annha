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
import { materialApi, Material, CreateMaterialData } from "@/api/materialApi";
import { projectApi } from "@/api/projectApi";
import BackButton from "@/components/BackButton";

export default function MaterialsScreen() {
    const router = useRouter();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [formData, setFormData] = useState<CreateMaterialData>({
        name: "",
        code: "",
        unit: "kg",
        description: "",
        min_stock_level: 0,
        project_id: undefined,
    });
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadMaterials();
        loadProjects();
    }, []);

    const loadMaterials = async () => {
        try {
            setLoading(true);
            const response = await materialApi.getMaterials({
                search: searchQuery || undefined,
                active_only: true,
            });
            if (response.success) {
                setMaterials(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading materials:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadProjects = async () => {
        try {
            const response = await projectApi.getProjects({ page: 1, per_page: 100 });
            if (response.success) {
                setProjects(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadMaterials();
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.unit) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            setSubmitting(true);
            const response = editingMaterial
                ? await materialApi.updateMaterial(editingMaterial.id, formData)
                : await materialApi.createMaterial(formData);

            if (response.success) {
                Alert.alert("Thành công", editingMaterial ? "Đã cập nhật vật liệu" : "Đã tạo vật liệu thành công");
                setShowCreateModal(false);
                resetForm();
                loadMaterials();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể thực hiện thao tác");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (material: Material) => {
        setEditingMaterial(material);
        setFormData({
            name: material.name,
            code: material.code || "",
            unit: material.unit,
            description: material.description || "",
            min_stock_level: material.min_stock_level || 0,
            project_id: material.project_id,
        });
        setShowCreateModal(true);
    };

    const handleDelete = (material: Material) => {
        Alert.alert(
            "Xác nhận",
            `Bạn có chắc chắn muốn xóa vật liệu "${material.name}"?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await materialApi.deleteMaterial(material.id);
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa vật liệu");
                                loadMaterials();
                            }
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa vật liệu");
                        }
                    },
                },
            ]
        );
    };

    const resetForm = () => {
        setEditingMaterial(null);
        setFormData({
            name: "",
            code: "",
            unit: "kg",
            description: "",
            min_stock_level: 0,
            project_id: undefined,
        });
    };

    const getStockStatus = (material: Material) => {
        if (material.current_stock <= (material.min_stock_level || 0)) {
            return { color: "#EF4444", text: "Thiếu" };
        }
        return { color: "#10B981", text: "Đủ" };
    };

    const renderItem = ({ item }: { item: Material }) => {
        const stockStatus = getStockStatus(item);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        {item.code && <Text style={styles.cardCode}>Mã: {item.code}</Text>}
                    </View>
                    <View
                        style={[
                            styles.stockBadge,
                            { backgroundColor: stockStatus.color + "20" },
                        ]}
                    >
                        <Text style={[styles.stockText, { color: stockStatus.color }]}>
                            {stockStatus.text}
                        </Text>
                    </View>
                </View>
                <View style={styles.stockInfo}>
                    <Text style={styles.stockLabel}>Tồn kho:</Text>
                    <Text style={styles.stockValue}>
                        {item.current_stock} {item.unit}
                    </Text>
                    {item.min_stock_level > 0 && (
                        <Text style={styles.minStockText}>
                            (Tối thiểu: {item.min_stock_level} {item.unit})
                        </Text>
                    )}
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/materials/${item.id}`)}
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
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Quản Lý Vật Liệu</Text>
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
                    placeholder="Tìm kiếm vật liệu..."
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        // Debounce search
                        setTimeout(() => {
                            if (text === searchQuery) {
                                loadMaterials();
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
                    data={materials}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có vật liệu</Text>
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
                                {editingMaterial ? "Sửa Vật Liệu" : "Tạo Vật Liệu"}
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
                                <Text style={styles.label}>Tên vật liệu *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập tên vật liệu"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mã vật liệu</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập mã vật liệu (tùy chọn)"
                                    value={formData.code}
                                    onChangeText={(text) => setFormData({ ...formData, code: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Đơn vị *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="kg, m, m2, m3..."
                                    value={formData.unit}
                                    onChangeText={(text) => setFormData({ ...formData, unit: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mức tồn kho tối thiểu</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={formData.min_stock_level?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, min_stock_level: parseFloat(text) || 0 })
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
                                    <Text style={styles.submitButtonText}>
                                        {editingMaterial ? "Cập Nhật" : "Tạo Mới"}
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
    stockBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    stockText: {
        fontSize: 12,
        fontWeight: "600",
    },
    stockInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        gap: 8,
    },
    stockLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    stockValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    minStockText: {
        fontSize: 12,
        color: "#9CA3AF",
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
    textArea: {
        height: 80,
        textAlignVertical: "top",
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

