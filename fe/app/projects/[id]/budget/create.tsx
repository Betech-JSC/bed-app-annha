import React, { useState, useEffect, useRef } from "react";
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
import { budgetApi, ProjectBudget, CreateBudgetData } from "@/api/budgetApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CreateBudgetScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();
    const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
    const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
    const [formData, setFormData] = useState<Partial<CreateBudgetData>>({
        name: "",
        version: "1.0",
        budget_date: new Date().toISOString().split("T")[0],
        notes: "",
        items: [],
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);

    useEffect(() => {
        loadBudgets();
        loadCostGroups();
    }, [id]);

    useFocusEffect(
        React.useCallback(() => {
            loadBudgets();
            // Check for new/updated item from create/edit item screen
            checkForNewItem();
        }, [id])
    );

    const checkForNewItem = async () => {
        try {
            // Check for new item
            const storageKey = `budget_create_item_${id}`;
            const itemData = await AsyncStorage.getItem(storageKey);
            if (itemData) {
                const item = JSON.parse(itemData);
                const items = formData.items || [];
                items.push(item);
                const total = items.reduce((sum, i) => sum + (i.estimated_amount || 0), 0);
                setFormData({ ...formData, items, total });
                await AsyncStorage.removeItem(storageKey);
            }

            // Check for updated items (with index)
            const items = formData.items || [];
            for (let i = 0; i < items.length; i++) {
                const editKey = `budget_create_item_${id}_${i}`;
                const editData = await AsyncStorage.getItem(editKey);
                if (editData) {
                    const updatedItem = JSON.parse(editData);
                    items[updatedItem.index] = updatedItem;
                    const total = items.reduce((sum, i) => sum + (i.estimated_amount || 0), 0);
                    setFormData({ ...formData, items, total });
                    await AsyncStorage.removeItem(editKey);
                }
            }
        } catch (error) {
            console.error("Error loading new item:", error);
        }
    };

    const loadBudgets = async () => {
        try {
            const response = await budgetApi.getBudgets(Number(id));
            if (response.success) {
                setBudgets(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading budgets:", error);
        }
    };

    const loadCostGroups = async () => {
        try {
            const response = await costGroupApi.getCostGroups({ active_only: true });
            if (response.success) {
                const data = response.data?.data || response.data || [];
                setCostGroups(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error loading cost groups:", error);
        }
    };

    const handleAddItem = () => {
        router.push(`/projects/${id}/budget/create/items/create`);
    };

    const handleEditItem = (item: any, index: number) => {
        router.push({
            pathname: `/projects/${id}/budget/create/items/${index}/edit`,
            params: { itemData: JSON.stringify(item) }
        });
    };

    const handleRemoveItem = (index: number) => {
        const items = formData.items || [];
        items.splice(index, 1);
        const total = items.reduce((sum, i) => sum + (i.estimated_amount || 0), 0);
        setFormData({ ...formData, items, total });
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.budget_date || !formData.items || formData.items.length === 0) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin và thêm ít nhất 1 hạng mục");
            return;
        }

        try {
            setSubmitting(true);
            const response = await budgetApi.createBudget(Number(id), formData as CreateBudgetData);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo ngân sách thành công", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo ngân sách");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            version: "1.0",
            budget_date: new Date().toISOString().split("T")[0],
            notes: "",
            items: [],
        });
    };

    const handleUseTemplate = (templateBudget: ProjectBudget) => {
        setFormData({
            name: `${templateBudget.name} (Mới)`,
            version: "1.0",
            budget_date: new Date().toISOString().split("T")[0],
            notes: templateBudget.notes || "",
            items: templateBudget.items?.map(item => ({
                name: item.name,
                cost_group_id: item.cost_group_id,
                description: item.description,
                estimated_amount: item.estimated_amount,
                quantity: item.quantity,
                unit_price: item.unit_price,
            })) || [],
        });
        setShowTemplatePicker(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Tạo Ngân Sách"
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
                    {/* Template Selection */}
                    {budgets.length > 0 && (
                        <View style={styles.formGroup}>
                            <View style={styles.templateHeader}>
                                <Text style={styles.label}>Tạo từ ngân sách có sẵn</Text>
                                <TouchableOpacity
                                    style={styles.templateButton}
                                    onPress={() => setShowTemplatePicker(true)}
                                >
                                    <Ionicons name="copy-outline" size={18} color="#3B82F6" />
                                    <Text style={styles.templateButtonText}>Chọn ngân sách</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tên ngân sách *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập tên ngân sách"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Phiên bản</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1.0"
                            value={formData.version}
                            onChangeText={(text) => setFormData({ ...formData, version: text })}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Ngày lập ngân sách *</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text>{formData.budget_date}</Text>
                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={new Date(formData.budget_date || new Date())}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    if (Platform.OS === 'android') {
                                        setShowDatePicker(false);
                                    }
                                    if (date && (Platform.OS === 'android' || event.type !== 'dismissed')) {
                                        setFormData({
                                            ...formData,
                                            budget_date: date.toISOString().split("T")[0],
                                        });
                                    }
                                    if (Platform.OS === 'ios' && event.type === 'dismissed') {
                                        setShowDatePicker(false);
                                    }
                                }}
                            />
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <View style={styles.itemsHeader}>
                            <Text style={styles.label}>Hạng mục ngân sách *</Text>
                            <TouchableOpacity
                                style={styles.addItemButton}
                                onPress={handleAddItem}
                            >
                                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                                <Text style={styles.addItemText}>Thêm</Text>
                            </TouchableOpacity>
                        </View>
                        {formData.items && formData.items.length > 0 ? (
                            <>
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
                                                >
                                                    <Ionicons name="pencil" size={20} color="#3B82F6" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                                                    <Ionicons name="trash" size={20} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Tổng ngân sách:</Text>
                                    <Text style={styles.totalValue}>
                                        {formatCurrency(
                                            formData.items.reduce((sum: number, i: any) => sum + (i.estimated_amount || 0), 0)
                                        )}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.emptyItemsText}>
                                Chưa có hạng mục. Nhấn "Thêm" để thêm hạng mục.
                            </Text>
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Ghi chú</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Nhập ghi chú..."
                            value={formData.notes}
                            onChangeText={(text) => setFormData({ ...formData, notes: text })}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
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
                            <Text style={styles.submitButtonText}>Tạo Ngân Sách</Text>
                        )}
                    </TouchableOpacity>
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
    itemsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    addItemButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    addItemText: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    itemsList: {
        gap: 8,
        marginBottom: 12,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    totalValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#3B82F6",
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        marginBottom: 8,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    itemAmount: {
        fontSize: 13,
        color: "#3B82F6",
        marginTop: 4,
    },
    itemActions: {
        flexDirection: "row",
        gap: 12,
    },
    emptyItemsText: {
        fontSize: 14,
        color: "#6B7280",
        fontStyle: "italic",
        textAlign: "center",
        padding: 20,
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
    templateHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    templateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    templateButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#3B82F6",
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
        paddingBottom: Platform.OS === "ios" ? 120 : 100,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    selectInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
    },
    placeholderText: {
        color: "#9CA3AF",
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "flex-end",
        zIndex: 2000,
        elevation: 2000,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    pickerContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "70%",
        padding: 16,
        zIndex: 2001,
        elevation: 2001,
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    pickerItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    formActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
    },
    cancelButtonText: {
        color: "#6B7280",
        fontSize: 16,
        fontWeight: "600",
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#3B82F6",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
