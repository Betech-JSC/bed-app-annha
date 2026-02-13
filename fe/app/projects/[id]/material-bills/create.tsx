import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
    Modal,
    FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { materialBillApi } from "@/api/materialBillApi";
import { materialApi, Material } from "@/api/materialApi";
import { supplierApi, Supplier } from "@/api/supplierApi";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, CurrencyInput } from "@/components";

export default function CreateMaterialBillScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);

    // Form State
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [costGroup, setCostGroup] = useState<CostGroup | null>(null);
    const [billNumber, setBillNumber] = useState("");
    const [billDate, setBillDate] = useState(new Date());
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<any[]>([]);

    // Selector States
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    const [showCostGroupModal, setShowCostGroupModal] = useState(false);
    const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
    const [loadingCostGroups, setLoadingCostGroups] = useState(false);

    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Load Data for selectors
    const loadSuppliers = async () => {
        try {
            setLoadingSuppliers(true);
            const response = await supplierApi.getSuppliers({ active_only: true });
            if (response.success) {
                const data = response.data?.data ?? response.data ?? [];
                setSuppliers(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error loading suppliers:", error);
        } finally {
            setLoadingSuppliers(false);
        }
    };

    const loadCostGroups = async () => {
        try {
            setLoadingCostGroups(true);
            const response = await costGroupApi.getCostGroups({ active_only: true });
            if (response.success) {
                const data = response.data?.data ?? response.data ?? [];
                setCostGroups(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error loading cost groups:", error);
        } finally {
            setLoadingCostGroups(false);
        }
    };

    const loadMaterials = async (query = "") => {
        try {
            setLoadingMaterials(true);
            const response = await materialApi.getMaterials({ search: query, active_only: true });
            if (response.success) {
                const data = response.data?.data ?? response.data ?? [];
                setMaterials(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error loading materials:", error);
        } finally {
            setLoadingMaterials(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
        loadCostGroups();
        loadMaterials();
    }, []);

    const handleAddItem = (material: Material) => {
        // Kiểm tra xem vật liệu đã có trong list chưa
        if (items.some(item => item.material_id === material.id)) {
            Alert.alert("Thông báo", "Vật liệu này đã có trong danh sách hóa đơn.");
            return;
        }

        setItems([...items, {
            material_id: material.id,
            material: material,
            quantity: 1,
            unit_price: material.unit_price || 0,
        }]);
        setShowMaterialModal(false);
    };

    const handleUpdateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
    };

    const handleSubmit = async () => {
        if (!supplier) return Alert.alert("Lỗi", "Vui lòng chọn nhà cung cấp.");
        if (!costGroup) return Alert.alert("Lỗi", "Vui lòng chọn nhóm chi phí.");
        if (items.length === 0) return Alert.alert("Lỗi", "Vui lòng thêm ít nhất một vật liệu.");

        try {
            setLoading(true);
            const payload = {
                supplier_id: supplier.id,
                bill_number: billNumber,
                bill_date: billDate.toISOString().split("T")[0],
                cost_group_id: costGroup.id,
                notes,
                items: items.map(item => ({
                    material_id: item.material_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                }))
            };

            const response = await materialBillApi.createBill(id!, payload);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo hóa đơn vật liệu.");
                router.back();
            }
        } catch (error: any) {
            console.error("Error creating bill:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo hóa đơn.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Tạo Hóa Đơn Vật Liệu" showBackButton />

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin chung</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nhà cung cấp *</Text>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setShowSupplierModal(true)}
                        >
                            <Text style={[styles.pickerButtonText, !supplier && styles.placeholder]}>
                                {supplier ? supplier.name : "Chọn nhà cung cấp"}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nhóm chi phí *</Text>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setShowCostGroupModal(true)}
                        >
                            <Text style={[styles.pickerButtonText, !costGroup && styles.placeholder]}>
                                {costGroup ? costGroup.name : "Chọn nhóm chi phí"}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Số hóa đơn</Text>
                            <TextInput
                                style={styles.input}
                                value={billNumber}
                                onChangeText={setBillNumber}
                                placeholder="Nhập số bill"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <DatePickerInput
                                label="Ngày hóa đơn *"
                                value={billDate}
                                onChange={(date) => date && setBillDate(date)}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Danh sách vật liệu</Text>
                        <TouchableOpacity
                            style={styles.addMaterialBtn}
                            onPress={() => setShowMaterialModal(true)}
                        >
                            <Ionicons name="add-circle" size={20} color="#3B82F6" />
                            <Text style={styles.addMaterialText}>Thêm vật liệu</Text>
                        </TouchableOpacity>
                    </View>

                    {items.length === 0 ? (
                        <View style={styles.emptyItems}>
                            <Text style={styles.emptyItemsText}>Chưa có vật liệu nào được thêm</Text>
                        </View>
                    ) : (
                        items.map((item, index) => (
                            <View key={index} style={styles.itemCard}>
                                <View style={styles.itemHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{item.material.name}</Text>
                                        <Text style={styles.itemCode}>{item.material.code} - {item.material.unit}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.label}>Số lượng</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={item.quantity.toString()}
                                            onChangeText={(text) => handleUpdateItem(index, 'quantity', parseFloat(text) || 0)}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                    <View style={{ flex: 2 }}>
                                        <CurrencyInput
                                            label="Đơn giá"
                                            value={item.unit_price}
                                            onChangeText={(amount) => handleUpdateItem(index, 'unit_price', amount)}
                                        />
                                    </View>
                                </View>
                                <View style={styles.itemSubtotal}>
                                    <Text style={styles.subtotalLabel}>Thành tiền:</Text>
                                    <Text style={styles.subtotalValue}>{formatCurrency(item.quantity * item.unit_price)}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Ghi chú</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Nhập ghi chú cho hóa đơn..."
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TỔNG CỘNG:</Text>
                        <Text style={styles.totalValueText}>{formatCurrency(calculateTotal())}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Lưu hóa đơn</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Selector Modals */}
            <Modal visible={showSupplierModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn nhà cung cấp</Text>
                            <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={suppliers}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setSupplier(item);
                                        setShowSupplierModal(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{item.name}</Text>
                                    {supplier?.id === item.id && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <Modal visible={showCostGroupModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn nhóm chi phí</Text>
                            <TouchableOpacity onPress={() => setShowCostGroupModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={costGroups}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setCostGroup(item);
                                        setShowCostGroupModal(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{item.name}</Text>
                                    {costGroup?.id === item.id && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <Modal visible={showMaterialModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Thêm vật liệu</Text>
                            <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm kiếm vật liệu..."
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    loadMaterials(text);
                                }}
                            />
                        </View>
                        {loadingMaterials ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color="#3B82F6" />
                        ) : (
                            <FlatList
                                data={materials}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.pickerItem}
                                        onPress={() => handleAddItem(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.pickerItemText}>{item.name}</Text>
                                            <Text style={styles.itemCode}>{item.code || "N/A"}</Text>
                                        </View>
                                        <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
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
    content: {
        flex: 1,
    },
    section: {
        padding: 16,
        backgroundColor: "#FFFFFF",
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4B5563",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 10,
        fontSize: 15,
        backgroundColor: "#F9FAFB",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    pickerButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#F9FAFB",
    },
    pickerButtonText: {
        fontSize: 15,
        color: "#1F2937",
    },
    placeholder: {
        color: "#9CA3AF",
    },
    row: {
        flexDirection: "row",
        marginBottom: 8,
    },
    emptyItems: {
        padding: 20,
        alignItems: "center",
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
    },
    emptyItemsText: {
        color: "#9CA3AF",
    },
    addMaterialBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    addMaterialText: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    itemCard: {
        borderWidth: 1,
        borderColor: "#F3F4F6",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#FAFAFA",
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    itemName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
    },
    itemCode: {
        fontSize: 12,
        color: "#6B7280",
    },
    itemSubtotal: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#EEE",
    },
    subtotalLabel: {
        fontSize: 13,
        color: "#6B7280",
        marginRight: 8,
    },
    subtotalValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#10B981",
    },
    footer: {
        padding: 16,
        paddingBottom: 40,
        backgroundColor: "#FFFFFF",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: "#F3F4F6",
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "800",
        color: "#1F2937",
    },
    totalValueText: {
        fontSize: 20,
        fontWeight: "800",
        color: "#3B82F6",
    },
    submitBtn: {
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    submitBtnText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    disabledBtn: {
        backgroundColor: "#93C5FD",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    pickerItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    pickerItemText: {
        fontSize: 16,
        color: "#1F2937",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
    },
});
