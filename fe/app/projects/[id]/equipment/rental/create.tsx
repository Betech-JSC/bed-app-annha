import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, ScrollView, TextInput, Modal, FlatList, Platform, KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentRentalApi } from "@/api/equipmentRentalApi";
import { equipmentApi, Equipment } from "@/api/equipmentApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, CurrencyInput, UniversalFileUploader } from "@/components";
import { UploadedFile } from "@/components/UniversalFileUploader";
import api from "@/api/api";

interface SupplierOption { id: number; name: string; }

export default function CreateEquipmentRentalScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);

    // Form
    const [equipmentName, setEquipmentName] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const [totalCost, setTotalCost] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [notes, setNotes] = useState("");
    const [attachments, setAttachments] = useState<UploadedFile[]>([]);

    useEffect(() => {
        setTotalCost(quantity * unitPrice);
    }, [quantity, unitPrice]);

    // Selectors
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadSuppliers();
    }, []);



    const loadSuppliers = async (search = "") => {
        try {
            const res = await api.get("/settings/suppliers", { params: { search, active_only: true } });
            if (res.data.success) {
                const data = res.data.data?.data ?? res.data.data ?? [];
                setSuppliers(Array.isArray(data) ? data : []);
            }
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async () => {
        if (!equipmentName.trim()) return Alert.alert("Lỗi", "Vui lòng nhập tên thiết bị.");
        if (totalCost <= 0) return Alert.alert("Lỗi", "Tổng chi phí phải lớn hơn 0.");
        if (endDate <= startDate) return Alert.alert("Lỗi", "Ngày kết thúc phải sau ngày bắt đầu.");

        try {
            setLoading(true);
            const payload: any = {
                equipment_name: equipmentName.trim(),
                supplier_id: selectedSupplier?.id,
                rental_start_date: startDate.toISOString().split("T")[0],
                rental_end_date: endDate.toISOString().split("T")[0],
                quantity: quantity,
                unit_price: unitPrice,
                notes: notes || undefined,
            };

            if (attachments.length > 0) {
                payload.attachment_ids = attachments
                    .map((a) => a.attachment_id || a.id)
                    .filter((aid): aid is number => !!aid);
            }

            const res = await equipmentRentalApi.create(id!, payload);
            if (res.success) {
                Alert.alert("Thành công", "Đã tạo phiếu thuê thiết bị.", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo phiếu thuê.");
        } finally {
            setLoading(false);
        }
    };

    const renderSelectorModal = (
        visible: boolean,
        onClose: () => void,
        title: string,
        data: any[],
        onSelect: (item: any) => void,
        labelKey = "name"
    ) => (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            if (title.includes("NCC")) loadSuppliers(text);
                        }}
                    />
                    <FlatList
                        data={data.filter(item =>
                            item[labelKey]?.toLowerCase().includes(searchQuery.toLowerCase())
                        )}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => { onSelect(item); onClose(); setSearchQuery(""); }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalItemText}>{item[labelKey]}</Text>
                                    {title.includes("tài sản") && item.remaining_quantity !== undefined && (
                                        <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                            Còn {item.remaining_quantity} {item.unit || "cái"}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Không tìm thấy</Text>
                        }
                        style={{ maxHeight: 300 }}
                    />
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { onClose(); setSearchQuery(""); }}>
                        <Text style={styles.modalCloseBtnText}>Đóng</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Tạo Phiếu Thuê Thiết Bị"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.headerBtn, (loading || !equipmentName.trim()) && { opacity: 0.5 }]}
                        disabled={loading || !equipmentName.trim()}
                    >
                        {loading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.headerBtnText}>Lưu</Text>}
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THÔNG TIN THIẾT BỊ</Text>



                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tên thiết bị *</Text>
                            <TextInput
                                style={styles.input}
                                value={equipmentName}
                                onChangeText={setEquipmentName}
                                placeholder="Nhập tên thiết bị cụ thể..."
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Đơn vị cho thuê (NCC)</Text>
                            <TouchableOpacity style={styles.picker} onPress={() => setShowSupplierModal(true)}>
                                <Text style={[styles.pickerText, !selectedSupplier && styles.placeholder]}>
                                    {selectedSupplier?.name || "Chọn nhà cung cấp..."}
                                </Text>
                                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THỜI GIAN THUÊ</Text>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Từ ngày *</Text>
                                <DatePickerInput value={startDate} onChange={setStartDate} />
                            </View>
                            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Đến ngày *</Text>
                                <DatePickerInput value={endDate} onChange={setEndDate} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CHI PHÍ</Text>
                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Số lượng *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={quantity.toString()}
                                    onChangeText={(t) => setQuantity(parseInt(t) || 0)}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 2, marginLeft: 8 }]}>
                                <Text style={styles.label}>Đơn giá (VNĐ) *</Text>
                                <CurrencyInput value={unitPrice} onChangeText={setUnitPrice} />
                            </View>
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Thành tiền (VNĐ)</Text>
                            <View style={[styles.input, { backgroundColor: "#F3F4F6", justifyContent: "center" }]}>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151" }}>
                                    {totalCost.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ĐÍNH KÈM BILL</Text>
                        <UniversalFileUploader
                            multiple={true}
                            onUploadComplete={setAttachments}
                            maxFiles={10}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>GHI CHÚ</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Ghi chú thêm..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {renderSelectorModal(showSupplierModal, () => setShowSupplierModal(false), "Chọn NCC cho thuê", suppliers, setSelectedSupplier)}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    content: { flex: 1, padding: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5, marginBottom: 12 },
    formGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
    input: {
        backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB",
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: "#1F2937",
    },
    picker: {
        backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB",
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    pickerText: { fontSize: 14, color: "#1F2937", flex: 1 },
    placeholder: { color: "#9CA3AF" },
    row: { flexDirection: "row" },
    headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
    headerBtnText: { fontSize: 15, fontWeight: "600", color: "#3B82F6" },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: "70%",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    searchInput: {
        backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 14,
        paddingVertical: 10, fontSize: 14, color: "#1F2937", marginBottom: 12,
    },
    modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    modalItemText: { fontSize: 15, color: "#1F2937" },
    modalCloseBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12, backgroundColor: "#F3F4F6", borderRadius: 10 },
    modalCloseBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
    emptyText: { textAlign: "center", color: "#9CA3AF", paddingVertical: 20 },
});
