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
import { useRouter, useLocalSearchParams } from "expo-router";
import { budgetApi, ProjectBudget, CreateBudgetData } from "@/api/budgetApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";

export default function BudgetScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
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
    const [editingItem, setEditingItem] = useState<any>(null);
    const [showItemModal, setShowItemModal] = useState(false);

    useEffect(() => {
        loadBudgets();
        loadCostGroups();
    }, [id]);

    const loadBudgets = async () => {
        try {
            setLoading(true);
            const response = await budgetApi.getBudgets(Number(id));
            if (response.success) {
                setBudgets(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading budgets:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
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

    const onRefresh = () => {
        setRefreshing(true);
        loadBudgets();
    };

    const handleAddItem = () => {
        setEditingItem(null);
        setShowItemModal(true);
    };

    const handleEditItem = (item: any, index: number) => {
        setEditingItem({ ...item, index });
        setShowItemModal(true);
    };

    const handleSaveItem = (item: any) => {
        const items = formData.items || [];
        if (editingItem !== null && editingItem.index !== undefined) {
            items[editingItem.index] = item;
        } else {
            items.push(item);
        }
        setFormData({ ...formData, items });
        setShowItemModal(false);
        setEditingItem(null);
    };

    const handleRemoveItem = (index: number) => {
        const items = formData.items || [];
        items.splice(index, 1);
        setFormData({ ...formData, items });
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
                Alert.alert("Thành công", "Đã tạo ngân sách thành công");
                setShowCreateModal(false);
                resetForm();
                loadBudgets();
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const renderItem = ({ item }: { item: ProjectBudget }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/projects/${id}/budget/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.version && <Text style={styles.cardVersion}>v{item.version}</Text>}
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor:
                                item.status === "approved"
                                    ? "#10B98120"
                                    : item.status === "active"
                                        ? "#3B82F620"
                                        : "#F59E0B20",
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.statusText,
                            {
                                color:
                                    item.status === "approved"
                                        ? "#10B981"
                                        : item.status === "active"
                                            ? "#3B82F6"
                                            : "#F59E0B",
                            },
                        ]}
                    >
                        {item.status === "approved"
                            ? "Đã duyệt"
                            : item.status === "active"
                                ? "Đang áp dụng"
                                : "Nháp"}
                    </Text>
                </View>
            </View>
            <Text style={styles.budgetAmount}>
                {formatCurrency(item.total_budget)}
            </Text>
            <Text style={styles.budgetDate}>
                Ngày lập: {new Date(item.budget_date).toLocaleDateString("vi-VN")}
            </Text>
            {item.items && item.items.length > 0 && (
                <Text style={styles.itemsCount}>{item.items.length} hạng mục</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Ngân Sách Dự Án"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                    >
                        <Ionicons name="add" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={budgets}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="wallet-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có ngân sách</Text>
                        </View>
                    }
                />
            )}

            {/* Create Budget Modal */}
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
                            <Text style={styles.modalTitle}>Tạo Ngân Sách</Text>
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
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowDatePicker(false);
                                            if (date) {
                                                setFormData({
                                                    ...formData,
                                                    budget_date: date.toISOString().split("T")[0],
                                                });
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
                                ) : (
                                    <Text style={styles.emptyItemsText}>
                                        Chưa có hạng mục. Nhấn "Thêm" để thêm hạng mục.
                                    </Text>
                                )}
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
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Budget Item Modal */}
            <Modal
                visible={showItemModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowItemModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalContainer}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingItem ? "Sửa Hạng Mục" : "Thêm Hạng Mục"}
                            </Text>
                            <TouchableOpacity onPress={() => setShowItemModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <BudgetItemForm
                            costGroups={costGroups}
                            initialData={editingItem}
                            onSave={handleSaveItem}
                            onCancel={() => setShowItemModal(false)}
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

function BudgetItemForm({
    costGroups,
    initialData,
    onSave,
    onCancel,
}: {
    costGroups: CostGroup[];
    initialData: any;
    onSave: (item: any) => void;
    onCancel: () => void;
}) {
    const [itemData, setItemData] = useState({
        name: initialData?.name || "",
        cost_group_id: initialData?.cost_group_id || null,
        description: initialData?.description || "",
        estimated_amount: initialData?.estimated_amount?.toString() || "",
        quantity: initialData?.quantity?.toString() || "1",
        unit_price: initialData?.unit_price?.toString() || "",
    });
    const [showCostGroupPicker, setShowCostGroupPicker] = useState(false);
    const [selectedCostGroup, setSelectedCostGroup] = useState<CostGroup | null>(
        costGroups.find((g) => g.id === initialData?.cost_group_id) || null
    );

    const handleSave = () => {
        if (!itemData.name || !itemData.estimated_amount) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        onSave({
            name: itemData.name,
            cost_group_id: itemData.cost_group_id,
            description: itemData.description,
            estimated_amount: parseFloat(itemData.estimated_amount),
            quantity: parseInt(itemData.quantity) || 1,
            unit_price: parseFloat(itemData.unit_price) || parseFloat(itemData.estimated_amount),
        });
    };

    return (
        <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
        >
            <View style={styles.formGroup}>
                <Text style={styles.label}>Tên hạng mục *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập tên hạng mục"
                    value={itemData.name}
                    onChangeText={(text) => setItemData({ ...itemData, name: text })}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Nhóm chi phí</Text>
                <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowCostGroupPicker(true)}
                >
                    <Text style={selectedCostGroup ? {} : styles.placeholderText}>
                        {selectedCostGroup ? selectedCostGroup.name : "Chọn nhóm chi phí"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showCostGroupPicker && (
                    <Modal
                        visible={showCostGroupPicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowCostGroupPicker(false)}
                    >
                        <View style={styles.pickerOverlay}>
                            <View style={styles.pickerContent}>
                                <View style={styles.pickerHeader}>
                                    <Text style={styles.pickerTitle}>Chọn nhóm chi phí</Text>
                                    <TouchableOpacity onPress={() => setShowCostGroupPicker(false)}>
                                        <Ionicons name="close" size={24} color="#1F2937" />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={costGroups}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.pickerItem}
                                            onPress={() => {
                                                setSelectedCostGroup(item);
                                                setItemData({ ...itemData, cost_group_id: item.id });
                                                setShowCostGroupPicker(false);
                                            }}
                                        >
                                            <Text>{item.name}</Text>
                                            {selectedCostGroup?.id === item.id && (
                                                <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    </Modal>
                )}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Số tiền ước tính *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={itemData.estimated_amount}
                    onChangeText={(text) => setItemData({ ...itemData, estimated_amount: text })}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Số lượng</Text>
                <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={itemData.quantity}
                    onChangeText={(text) => setItemData({ ...itemData, quantity: text })}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Đơn giá</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={itemData.unit_price}
                    onChangeText={(text) => setItemData({ ...itemData, unit_price: text })}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Nhập mô tả"
                    value={itemData.description}
                    onChangeText={(text) => setItemData({ ...itemData, description: text })}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
    cardVersion: {
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
    budgetAmount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#3B82F6",
        marginTop: 8,
    },
    budgetDate: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    itemsCount: {
        fontSize: 13,
        color: "#9CA3AF",
        marginTop: 4,
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
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    pickerContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "70%",
        padding: 16,
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

