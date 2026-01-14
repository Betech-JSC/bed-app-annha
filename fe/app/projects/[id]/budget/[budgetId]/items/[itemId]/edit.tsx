import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { budgetApi, BudgetItem } from "@/api/budgetApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditBudgetItemDetailScreen() {
    const router = useRouter();
    const { id, budgetId, itemId } = useLocalSearchParams<{ id: string; budgetId: string; itemId: string }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();
    const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
    const [itemData, setItemData] = useState({
        name: "",
        cost_group_id: undefined as number | undefined,
        description: "",
        estimated_amount: "",
        quantity: "",
        unit_price: "",
    });
    const [showCostGroupPicker, setShowCostGroupPicker] = useState(false);
    const [selectedCostGroup, setSelectedCostGroup] = useState<CostGroup | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCostGroups();
        loadItem();
    }, [id, budgetId, itemId]);

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

    const loadItem = async () => {
        try {
            setLoading(true);
            const response = await budgetApi.getBudget(Number(id), Number(budgetId));
            if (response.success) {
                const budget = response.data;
                const item = budget.items?.find((i: BudgetItem) => i.id === Number(itemId));
                if (item) {
                    setItemData({
                        name: item.name || "",
                        cost_group_id: item.cost_group_id,
                        description: item.description || "",
                        estimated_amount: item.estimated_amount?.toString() || "",
                        quantity: item.quantity?.toString() || "",
                        unit_price: item.unit_price?.toString() || "",
                    });
                    if (item.cost_group_id) {
                        const costGroup = costGroups.find(cg => cg.id === item.cost_group_id);
                        setSelectedCostGroup(costGroup || null);
                    }
                }
            }
        } catch (error) {
            console.error("Error loading item:", error);
            Alert.alert("Lỗi", "Không thể tải thông tin hạng mục");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (costGroups.length > 0 && itemData.cost_group_id) {
            const costGroup = costGroups.find(cg => cg.id === itemData.cost_group_id);
            setSelectedCostGroup(costGroup || null);
        }
    }, [costGroups, itemData.cost_group_id]);

    const handleSave = async () => {
        if (!itemData.name || !itemData.estimated_amount) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            setSubmitting(true);
            
            // Load current budget to get items
            const budgetResponse = await budgetApi.getBudget(Number(id), Number(budgetId));
            if (!budgetResponse.success) {
                Alert.alert("Lỗi", "Không thể tải thông tin ngân sách");
                return;
            }

            const budget = budgetResponse.data;
            const currentItems = budget.items || [];

            const itemPayload = {
                name: itemData.name,
                cost_group_id: itemData.cost_group_id,
                description: itemData.description || undefined,
                estimated_amount: parseFloat(itemData.estimated_amount),
                quantity: itemData.quantity ? parseFloat(itemData.quantity) : undefined,
                unit_price: itemData.unit_price ? parseFloat(itemData.unit_price) : undefined,
            };

            // Update item in items array
            const updatedItems = currentItems.map((item: BudgetItem) =>
                item.id === Number(itemId)
                    ? { ...item, ...itemPayload }
                    : item
            );

            // Update budget with updated items array
            const response = await budgetApi.updateBudget(Number(id), Number(budgetId), {
                items: updatedItems.map((item: BudgetItem) => ({
                    name: item.name,
                    cost_group_id: item.cost_group_id,
                    description: item.description,
                    estimated_amount: item.estimated_amount,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                }))
            });

            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật hạng mục", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật hạng mục");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Sửa Hạng Mục" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Sửa Hạng Mục"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#3B82F6" size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>Lưu</Text>
                        )}
                    </TouchableOpacity>
                }
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
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Số tiền ước tính (VNĐ) *</Text>
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
                        <Text style={styles.label}>Đơn giá (VNĐ)</Text>
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
                            placeholder="Nhập mô tả..."
                            value={itemData.description}
                            onChangeText={(text) => setItemData({ ...itemData, description: text })}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Cost Group Picker Modal */}
            <Modal
                visible={showCostGroupPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCostGroupPicker(false)}
                presentationStyle="overFullScreen"
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
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        backgroundColor: "#FFFFFF",
        color: "#1F2937",
        minHeight: 48,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
        paddingTop: 14,
    },
    selectInput: {
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
    saveButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    saveButtonText: {
        color: "#3B82F6",
        fontSize: 16,
        fontWeight: "600",
    },
});
