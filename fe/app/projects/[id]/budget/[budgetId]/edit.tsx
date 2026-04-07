import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { budgetApi, CreateBudgetData, ProjectBudget } from "@/api/budgetApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditBudgetScreen() {
    const router = useRouter();
    const { id, budgetId } = useLocalSearchParams<{ id: string; budgetId: string }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();
    const [formData, setFormData] = useState<Partial<ProjectBudget>>({
        name: "",
        version: "",
        budget_date: "",
        notes: "",
        status: "draft",
        items: [],
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending_approval": return "#F97316";
            case "approved": return "#10B981";
            case "active": return "#3B82F6";
            case "archived": return "#6B7280";
            default: return "#F59E0B";
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (budgetId) {
                loadBudget();
                checkForNewItem();
            }
        }, [id, budgetId])
    );

    const checkForNewItem = async () => {
        try {
            // Check for new item
            const storageKey = `budget_edit_item_${budgetId}`;
            const itemData = await AsyncStorage.getItem(storageKey);
            if (itemData) {
                const item = JSON.parse(itemData);
                const items = [...(formData.items || [])];
                items.push(item);
                setFormData({ ...formData, items });
                await AsyncStorage.removeItem(storageKey);
            }

            // Check for updated items (with index)
            const items = [...(formData.items || [])];
            let updated = false;
            for (let i = 0; i < items.length; i++) {
                const editKey = `budget_edit_item_${budgetId}_${i}`;
                const editData = await AsyncStorage.getItem(editKey);
                if (editData) {
                    const updatedItem = JSON.parse(editData);
                    items[updatedItem.index] = updatedItem;
                    updated = true;
                    await AsyncStorage.removeItem(editKey);
                }
            }
            if (updated) {
                setFormData({ ...formData, items });
            }
        } catch (error) {
            console.error("Error loading new item:", error);
        }
    };

    const loadBudget = async () => {
        try {
            setLoading(true);
            const response = await budgetApi.getBudget(Number(id), Number(budgetId));
            if (response.success) {
                const budget = response.data;
                setFormData({
                    name: budget.name || "",
                    version: budget.version || "",
                    budget_date: budget.budget_date || "",
                    notes: budget.notes || "",
                    status: budget.status || "draft",
                    items: budget.items || [],
                });
            }
        } catch (error) {
            console.error("Error loading budget:", error);
            Alert.alert("Lỗi", "Không thể tải thông tin ngân sách");
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        // We need a specific create item screen for EDIT mode or make existing one generic
        // For now, let's use the create one but we'll need to fix the storage key there too
        // or just implement a simple modal here.
        // Given complexity, let's guide user to a generic item screen if available.
        router.push({
            pathname: `/projects/${id}/budget/create/items/create`,
            params: { mode: 'edit', budgetId: budgetId }
        });
    };

    const handleEditItem = (item: any, index: number) => {
        router.push({
            pathname: `/projects/${id}/budget/create/items/${index}/edit`,
            params: { 
                itemData: JSON.stringify(item),
                mode: 'edit',
                budgetId: budgetId
            }
        });
    };

    const handleRemoveItem = (index: number) => {
        const items = [...(formData.items || [])];
        items.splice(index, 1);
        setFormData({ ...formData, items });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const handleUpdate = async () => {
        // Validate
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) {
            newErrors.name = "Vui lòng nhập tên ngân sách";
        }
        if (!formData.budget_date) {
            newErrors.budget_date = "Vui lòng chọn ngày lập ngân sách";
        }
        if (!formData.items || formData.items.length === 0) {
            Alert.alert("Lỗi", "Ngân sách phải có ít nhất 1 hạng mục");
            return;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            setSubmitting(true);
            const response = await budgetApi.updateBudget(Number(id), Number(budgetId), formData as CreateBudgetData);
            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật ngân sách thành công", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || "Không thể cập nhật ngân sách";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Sửa Ngân Sách" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Sửa Ngân Sách"
                showBackButton
            />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(insets.bottom + tabBarHeight + 40, 100) }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                >
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <View style={styles.labelContainer}>
                                <Text style={styles.label}>Tên ngân sách</Text>
                                <Text style={styles.required}>*</Text>
                            </View>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedField === "name" && styles.inputFocused,
                                    errors.name && styles.inputError,
                                ]}
                                placeholder="Nhập tên ngân sách"
                                placeholderTextColor="#9CA3AF"
                                value={formData.name}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, name: text });
                                    if (errors.name) setErrors({ ...errors, name: "" });
                                }}
                                onFocus={() => setFocusedField("name")}
                                onBlur={() => setFocusedField(null)}
                            />
                            {errors.name && (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                    <Text style={styles.errorText}>{errors.name}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Phiên bản</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedField === "version" && styles.inputFocused,
                                ]}
                                placeholder="1.0"
                                placeholderTextColor="#9CA3AF"
                                value={formData.version}
                                onChangeText={(text) => setFormData({ ...formData, version: text })}
                                onFocus={() => setFocusedField("version")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <DatePickerInput
                            label={
                                <Text>
                                    Ngày lập ngân sách <Text style={styles.required}>*</Text>
                                </Text>
                            }
                            value={formData.budget_date}
                            onDateChange={(date) => {
                                setFormData({
                                    ...formData,
                                    budget_date: date,
                                });
                                if (errors.budget_date) setErrors({ ...errors, budget_date: "" });
                            }}
                            placeholder="Chọn ngày"
                            error={errors.budget_date}
                        />

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Trạng thái</Text>
                            <View style={[
                                styles.statusBadgeDisplay,
                                { backgroundColor: getStatusColor(formData.status) + "15", borderColor: getStatusColor(formData.status) }
                            ]}>
                                <Text style={[styles.statusBadgeText, { color: getStatusColor(formData.status) }]}>
                                    {formData.status === "draft" ? "Nháp" : formData.status === "pending_approval" ? "Chờ duyệt" : formData.status === "approved" ? "Đã duyệt" : formData.status === "active" ? "Áp dụng" : "Lưu trữ"}
                                </Text>
                            </View>
                            <Text style={styles.statusHint}>Để thay đổi trạng thái, sử dụng luồng duyệt trên trang chi tiết</Text>
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
                                numberOfLines={4}
                                textAlignVertical="top"
                                onFocus={() => setFocusedField("notes")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* ITEMS SECTION */}
                    <View style={[styles.formSection, { marginTop: 0 }]}>
                        <View style={styles.itemsHeader}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="list-outline" size={20} color="#3B82F6" />
                                <Text style={styles.sectionTitle}>Hạng mục ngân sách</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.addItemButton}
                                onPress={handleAddItem}
                            >
                                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                                <Text style={styles.addItemText}>Thêm</Text>
                            </TouchableOpacity>
                        </View>

                        {formData.items && formData.items.length > 0 ? (
                            <View style={styles.itemsList}>
                                {formData.items.map((item: any, index: number) => (
                                    <View key={index} style={styles.itemRow}>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemAmount}>
                                                {formatCurrency(item.estimated_amount || 0)}
                                            </Text>
                                        </View>
                                        <View style={styles.itemActions}>
                                            <TouchableOpacity
                                                onPress={() => handleEditItem(item, index)}
                                                style={styles.actionIcon}
                                            >
                                                <Ionicons name="pencil" size={20} color="#3B82F6" />
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                onPress={() => handleRemoveItem(index)}
                                                style={styles.actionIcon}
                                            >
                                                <Ionicons name="trash" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Tổng ngân sách:</Text>
                                    <Text style={styles.totalValue}>
                                        {formatCurrency(
                                            formData.items.reduce((sum: number, i: any) => sum + (Number(i.estimated_amount) || 0), 0)
                                        )}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyItemsText}>
                                    Chưa có hạng mục. Nhấn "Thêm" để thêm hạng mục.
                                </Text>
                            </View>
                        )}
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
                                    <Text style={styles.submitButtonText}>Lưu Thay Đổi</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        padding: 40,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 8,
    },
    formSection: {
        marginBottom: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
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
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
    },
    errorText: {
        fontSize: 12,
        color: "#EF4444",
        flex: 1,
    },
    statusButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
    },
    statusButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        backgroundColor: "#FFFFFF",
        minWidth: 90,
        alignItems: "center",
    },
    statusButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    statusButtonText: {
        fontSize: 13,
        fontWeight: "700",
    },
    statusButtonTextActive: {
        color: "#FFFFFF",
    },
    itemsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    addItemButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    addItemText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#3B82F6",
    },
    itemsList: {
        marginTop: 8,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
    },
    itemAmount: {
        fontSize: 13,
        color: "#3B82F6",
        fontWeight: "600",
        marginTop: 2,
    },
    itemActions: {
        flexDirection: "row",
        gap: 4,
    },
    actionIcon: {
        padding: 8,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#F0F9FF",
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#BAE6FD",
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0369A1",
    },
    totalValue: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0369A1",
    },
    emptyContainer: {
        padding: 20,
        alignItems: "center",
    },
    emptyItemsText: {
        fontSize: 14,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    buttonContainer: {
        marginTop: 8,
        marginBottom: 32,
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 14,
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
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    statusBadgeDisplay: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    statusBadgeText: {
        fontSize: 14,
        fontWeight: "700",
    },
    statusHint: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 6,
        fontStyle: "italic",
    },
});
