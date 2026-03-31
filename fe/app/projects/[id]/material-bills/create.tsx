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
    Platform,
    KeyboardAvoidingView,
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

    // Adder State (For inline adding)
    const [currentItem, setCurrentItem] = useState({
        material: null as Material | null,
        quantity: 1,
        unit_price: 0,
    });

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

    const handleSelectMaterial = (material: Material) => {
        setCurrentItem({
            ...currentItem,
            material: material,
            unit_price: material.unit_price || 0,
        });
        setShowMaterialModal(false);
    };

    const handleAddItem = () => {
        const { material, quantity, unit_price } = currentItem;
        if (!material) {
            Alert.alert("Lỗi", "Vui lòng chọn vật liệu.");
            return;
        }

        if (quantity <= 0) {
            Alert.alert("Lỗi", "Số lượng phải lớn hơn 0.");
            return;
        }

        // Kiểm tra xem vật liệu đã có trong list chưa
        if (items.some(item => item.material_id === material.id)) {
            Alert.alert("Thông báo", "Vật liệu này đã có trong danh sách hóa đơn.");
            return;
        }

        setItems([...items, {
            material_id: material.id,
            material: material,
            quantity: quantity,
            unit_price: unit_price,
            total_price: quantity * unit_price
        }]);

        // Reset adder
        setCurrentItem({
            material: null,
            quantity: 1,
            unit_price: 0,
        });
    };

    const handleUpdateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
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
            <ScreenHeader 
                title="Tạo Phiếu Nhập Vật Liệu" 
                showBackButton 
                rightComponent={
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.headerSubmitBtn, (loading || items.length === 0) && { opacity: 0.5 }]}
                        disabled={loading || items.length === 0}
                    >
                        {loading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.headerSubmitText}>Tạo</Text>}
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={[styles.section, { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }]}>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <DatePickerInput
                                    label="Ngày nhập *"
                                    value={billDate}
                                    onChange={(date) => date && setBillDate(date)}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Nhà cung cấp</Text>
                                <TouchableOpacity
                                    style={styles.pickerButton}
                                    onPress={() => setShowSupplierModal(true)}
                                >
                                    <Text style={[styles.pickerButtonText, !supplier && styles.placeholder]} numberOfLines={1}>
                                        {supplier ? supplier.name : "Chọn nhà cung cấp"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Nhóm chi phí</Text>
                                <TouchableOpacity
                                    style={styles.pickerButton}
                                    onPress={() => setShowCostGroupModal(true)}
                                >
                                    <Text style={[styles.pickerButtonText, !costGroup && styles.placeholder]} numberOfLines={1}>
                                        {costGroup ? costGroup.name : "Chọn nhóm chi phí"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Ghi chú</Text>
                                <TextInput
                                    style={styles.input}
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Ghi chú (tùy chọn)"
                                />
                            </View>
                        </View>
                    </View>

                    {/* ADDER SECTION - PREMIUM LOOK MATCHING CRM */}
                    <View style={styles.adderSection}>
                        <Text style={styles.adderTitle}>THÊM VẬT LIỆU VÀO PHIẾU</Text>
                        
                        <View style={styles.adderContent}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Vật liệu :</Text>
                                <TouchableOpacity
                                    style={styles.pickerButton}
                                    onPress={() => setShowMaterialModal(true)}
                                >
                                    <Text style={[styles.pickerButtonText, !currentItem.material && styles.placeholder]} numberOfLines={1}>
                                        {currentItem.material ? currentItem.material.name : "Chọn vật liệu..."}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.adderInputsRow}>
                                <View style={[styles.formGroup, { flex: 1.5, marginRight: 8 }]}>
                                    <Text style={styles.label}>Số lượng :</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={currentItem.quantity.toString()}
                                        onChangeText={(text) => setCurrentItem({...currentItem, quantity: parseFloat(text) || 0})}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
                                    <Text style={styles.label}>Đơn giá :</Text>
                                    <CurrencyInput
                                        value={currentItem.unit_price}
                                        onChangeText={(amount) => setCurrentItem({...currentItem, unit_price: amount})}
                                        style={{ height: 40 }}
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 2, justifyContent: 'flex-end', paddingBottom: 10 }]}>
                                    <Text style={styles.label}>Thành tiền :</Text>
                                    <Text style={styles.adderSubtotal} numberOfLines={1}>
                                        {formatCurrency(currentItem.quantity * currentItem.unit_price)}
                                    </Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.plusButton}
                                    onPress={handleAddItem}
                                >
                                    <Ionicons name="add" size={24} color="#3B82F6" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* ITEMS LIST */}
                    <View style={styles.listSection}>
                        {items.length === 0 ? (
                            <View style={styles.emptyItems}>
                                <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyItemsText}>Chưa có vật liệu</Text>
                                <Text style={styles.emptyItemsSubtext}>Chọn vật liệu ở trên và nhấn nút +</Text>
                            </View>
                        ) : (
                            items.map((item, index) => (
                                <View key={index} style={styles.itemCard}>
                                    <View style={styles.itemHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemName}>{item.material.name}</Text>
                                            <Text style={styles.itemCode}>{item.material.code} • {item.material.unit}</Text>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => handleRemoveItem(index)}
                                            style={styles.removeBtn}
                                        >
                                            <Ionicons name="close-circle" size={22} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.itemInputs}>
                                        <View style={styles.itemInputGroup}>
                                            <Text style={styles.miniLabel}>SL</Text>
                                            <TextInput
                                                style={styles.miniInput}
                                                value={item.quantity.toString()}
                                                onChangeText={(text) => handleUpdateItem(index, 'quantity', parseFloat(text) || 0)}
                                                keyboardType="decimal-pad"
                                            />
                                        </View>
                                        <View style={[styles.itemInputGroup, { flex: 2 }]}>
                                            <Text style={styles.miniLabel}>Đơn giá</Text>
                                            <CurrencyInput
                                                value={item.unit_price}
                                                onChangeText={(amount) => handleUpdateItem(index, 'unit_price', amount)}
                                                style={styles.miniInput}
                                            />
                                        </View>
                                        <View style={[styles.itemInputGroup, { flex: 1.5, alignItems: 'flex-end' }]}>
                                            <Text style={styles.miniLabel}>Thành tiền</Text>
                                            <Text style={styles.itemTotalAmount}>{formatCurrency(item.quantity * item.unit_price)}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>

                    {/* ATTACHMENT SECTION */}
                    <View style={styles.attachmentSection}>
                        <Text style={styles.label}>
                            <Ionicons name="document-text-outline" size={14} /> CHỨNG TỪ ĐÍNH KÈM (ẢNH CHỤP PHIẾU/HÓA ĐƠN)
                        </Text>
                        <TouchableOpacity style={styles.uploadBox}>
                            <View style={styles.uploadBtn}>
                                <Text style={styles.uploadBtnText}>Choose Files</Text>
                            </View>
                            <Text style={styles.uploadInfo}>No file chosen</Text>
                        </TouchableOpacity>
                        <Text style={styles.uploadNote}>Không bắt buộc đính kèm file</Text>
                    </View>

                    <View style={styles.footerSpace} />
                </ScrollView>

                <View style={styles.bottomBar}>
                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>TỔNG CỘNG:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.submitBtn, (loading || items.length === 0) && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={loading || items.length === 0}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>TẠO PHIẾU NHẬP</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Selector Modals */}
            <Modal visible={showSupplierModal} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn nhà cung cấp</Text>
                            <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
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
                                    <Text style={[styles.pickerItemText, supplier?.id === item.id && { color: '#3B82F6', fontWeight: '700' }]}>{item.name}</Text>
                                    {supplier?.id === item.id && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <Modal visible={showCostGroupModal} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn nhóm chi phí</Text>
                            <TouchableOpacity onPress={() => setShowCostGroupModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
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
                                    <Text style={[styles.pickerItemText, costGroup?.id === item.id && { color: '#3B82F6', fontWeight: '700' }]}>{item.name}</Text>
                                    {costGroup?.id === item.id && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <Modal visible={showMaterialModal} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tìm vật liệu</Text>
                            <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Gõ tên hoặc mã vật liệu..."
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
                                        onPress={() => handleSelectMaterial(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.pickerItemText}>{item.name}</Text>
                                            <Text style={styles.itemCode}>{item.code || "---"} • {item.unit}</Text>
                                        </View>
                                        <Ionicons name="add-circle" size={22} color="#3B82F6" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: '#9CA3AF' }}>Không tìm thấy vật liệu phù hợp</Text>
                                    </View>
                                }
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
        backgroundColor: "#F3F4F6",
    },
    content: {
        flex: 1,
    },
    section: {
        padding: 16,
        backgroundColor: "#FFFFFF",
        marginBottom: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    formGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 6,
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        backgroundColor: "#FFFFFF",
    },
    pickerButton: {
        height: 40,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
    },
    pickerButtonText: {
        fontSize: 14,
        color: "#1F2937",
        flex: 1,
    },
    placeholder: {
        color: "#9CA3AF",
    },
    
    // ADDER STYLES
    adderSection: {
        marginHorizontal: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    adderTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4B5563",
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    adderContent: {
        // padding: 4
    },
    adderInputsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    adderSubtotal: {
        fontSize: 14,
        fontWeight: "700",
        color: "#10B981",
        height: 40,
        lineHeight: 40,
    },
    plusButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#DBEAFE",
        marginLeft: 8,
        marginBottom: 8,
    },

    // LIST STYLES
    listSection: {
        marginTop: 12,
        paddingHorizontal: 16,
    },
    itemCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    itemName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    itemCode: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    removeBtn: {
        padding: 4,
    },
    itemInputs: {
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-end",
    },
    itemInputGroup: {
        flex: 1,
    },
    miniLabel: {
        fontSize: 11,
        color: "#9CA3AF",
        marginBottom: 4,
    },
    miniInput: {
        height: 34,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        borderRadius: 6,
        paddingHorizontal: 8,
        fontSize: 13,
        backgroundColor: "#F9FAFB",
    },
    itemTotalAmount: {
        height: 34,
        lineHeight: 34,
        fontSize: 14,
        fontWeight: "700",
        color: "#3B82F6",
    },

    emptyItems: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyItemsText: {
        color: "#9CA3AF",
        fontSize: 16,
        fontWeight: "600",
        marginTop: 12,
    },
    emptyItemsSubtext: {
        color: "#D1D5DB",
        fontSize: 13,
        marginTop: 4,
    },

    attachmentSection: {
        padding: 16,
        backgroundColor: "#FFFFFF",
        marginTop: 12,
    },
    uploadBox: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderStyle: "dashed",
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
        backgroundColor: "#F9FAFB",
    },
    uploadBtn: {
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        marginRight: 10,
    },
    uploadBtnText: {
        fontSize: 12,
        color: "#374151",
    },
    uploadInfo: {
        fontSize: 13,
        color: "#6B7280",
    },
    uploadNote: {
        fontSize: 11,
        fontStyle: "italic",
        color: "#9CA3AF",
        marginTop: 6,
    },

    footerSpace: {
        height: 120,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    totalContainer: {
        flex: 1,
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4B5563",
    },
    totalValue: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1F2937",
    },
    submitBtn: {
        backgroundColor: "#3B82F6",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        minWidth: 140,
        alignItems: "center",
    },
    submitBtnText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
    disabledBtn: {
        backgroundColor: "#D1D5DB",
    },

    // CUSTOM MODAL STYLES
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: "50%",
        maxHeight: "85%",
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1F2937",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 15,
        color: "#111827",
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
        color: "#374151",
    },
    headerSubmitBtn: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    headerSubmitText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#3B82F6",
    },
});
