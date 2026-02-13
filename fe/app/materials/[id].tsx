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
import { materialApi, Material, CreateMaterialData } from "@/api/materialApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function MaterialDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [material, setMaterial] = useState<Material | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [formData, setFormData] = useState<Partial<CreateMaterialData>>({
        name: "",
        code: "",
        unit: "kg",
        description: "",
        project_id: undefined,
    });
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    useEffect(() => {
        loadMaterial();
        loadProjects();
    }, [id]);

    const loadMaterial = async () => {
        try {
            setLoading(true);
            const response = await materialApi.getMaterial(Number(id));

            if (response.success) {
                setMaterial(response.data);
                setFormData({
                    name: response.data.name,
                    code: response.data.code || "",
                    unit: response.data.unit,
                    description: response.data.description || "",
                    project_id: response.data.project_id,
                });

                // Set selected project if exists
                if (response.data.project_id) {
                    const project = projects.find((p) => p.id === response.data.project_id);
                    if (project) {
                        setSelectedProject(project);
                    }
                }
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

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ScreenHeader title="Chi Tiết Vật Liệu" showBackButton />
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
            </View>
        );
    }

    if (!material) {
        return (
            <View style={styles.centerContainer}>
                <ScreenHeader title="Chi Tiết Vật Liệu" showBackButton />
                <Text style={styles.errorText}>Không tìm thấy vật liệu</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Chi Tiết Vật Liệu"
                showBackButton
                rightComponent={
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
                }
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: useTabBarHeight() + 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
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
                        {material.unit_price !== undefined && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Đơn giá mặc định:</Text>
                                <Text style={styles.infoValue}>
                                    {new Intl.NumberFormat("vi-VN").format(material.unit_price)} VNĐ
                                </Text>
                            </View>
                        )}
                        {material.description && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Mô tả:</Text>
                                <Text style={styles.infoValue}>{material.description}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="fullScreen"
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

            {/* Project Picker Modal - Keeping if still needed for assignment logic elsewhere */}
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
    detailsSection: {
        padding: 16,
    },
    section: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        paddingBottom: 10,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    infoLabel: {
        fontSize: 14,
        color: "#6B7280",
        flex: 1,
        fontWeight: "500",
    },
    infoValue: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1.5,
        textAlign: "right",
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
        paddingTop: Platform.OS === "ios" ? 40 : 0,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
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
        padding: 20,
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
        color: "#374151",
        marginBottom: 8,
    },
    required: {
        color: "#EF4444",
    },
    input: {
        borderWidth: 1.5,
        borderColor: "#D1D5DB",
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        backgroundColor: "#FFFFFF",
        color: "#1F2937",
    },
    inputFocused: {
        borderColor: "#3B82F6",
        backgroundColor: "#F0F9FF",
    },
    inputError: {
        borderColor: "#EF4444",
    },
    textArea: {
        height: 120,
        textAlignVertical: "top",
    },
    errorTextField: {
        fontSize: 12,
        color: "#EF4444",
        marginTop: 6,
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
        marginBottom: 40,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#F3F4F6",
    },
    cancelButtonText: {
        color: "#4B5563",
        fontWeight: "600",
        fontSize: 16,
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
        fontSize: 16,
    },
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    pickerModal: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "80%",
        paddingBottom: 20,
    },
    pickerModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    pickerModalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },
    pickerItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#F9FAFB",
    },
    pickerItemSelected: {
        backgroundColor: "#F0F9FF",
    },
    pickerItemText: {
        fontSize: 16,
        color: "#374151",
    },
    pickerItemTextSelected: {
        color: "#3B82F6",
        fontWeight: "600",
    },
});
