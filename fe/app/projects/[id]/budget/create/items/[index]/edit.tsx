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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditBudgetItemScreen() {
    const router = useRouter();
    const { id, index, itemData: itemDataParam } = useLocalSearchParams<{ 
        id: string; 
        index: string;
        itemData?: string;
    }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();
    const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
    const [itemData, setItemData] = useState({
        name: "",
        cost_group_id: null as number | null,
        description: "",
        estimated_amount: "",
        quantity: "1",
        unit_price: "",
    });
    const [showCostGroupPicker, setShowCostGroupPicker] = useState(false);
    const [selectedCostGroup, setSelectedCostGroup] = useState<CostGroup | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCostGroups();
        if (itemDataParam) {
            try {
                const parsed = JSON.parse(itemDataParam);
                setItemData({
                    name: parsed.name || "",
                    cost_group_id: parsed.cost_group_id || null,
                    description: parsed.description || "",
                    estimated_amount: parsed.estimated_amount?.toString() || "",
                    quantity: parsed.quantity?.toString() || "1",
                    unit_price: parsed.unit_price?.toString() || "",
                });
                if (parsed.cost_group_id) {
                    // Will be set after costGroups load
                }
            } catch (error) {
                console.error("Error parsing item data:", error);
            }
        }
    }, [id, itemDataParam]);

    useEffect(() => {
        if (costGroups.length > 0 && itemData.cost_group_id) {
            const costGroup = costGroups.find(cg => cg.id === itemData.cost_group_id);
            setSelectedCostGroup(costGroup || null);
        }
    }, [costGroups, itemData.cost_group_id]);

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

    const handleSave = async () => {
        if (!itemData.name || !itemData.estimated_amount) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            setSubmitting(true);
            const itemPayload = {
                name: itemData.name,
                cost_group_id: itemData.cost_group_id,
                description: itemData.description || undefined,
                estimated_amount: parseFloat(itemData.estimated_amount),
                quantity: itemData.quantity ? parseFloat(itemData.quantity) : undefined,
                unit_price: itemData.unit_price ? parseFloat(itemData.unit_price) : undefined,
            };

            // Store item data in AsyncStorage temporarily with index
            const storageKey = `budget_create_item_${id}_${index}`;
            await AsyncStorage.setItem(storageKey, JSON.stringify({ ...itemPayload, index: parseInt(index) }));
            
            router.back();
        } catch (error) {
            Alert.alert("Lỗi", "Không thể lưu hạng mục");
        } finally {
            setSubmitting(false);
        }
    };

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
                            <Text style={styles.saveButtonText}>Đang lưu...</Text>
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
