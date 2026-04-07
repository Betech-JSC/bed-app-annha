import React, { useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, ScrollView, TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentPurchaseApi, EquipmentPurchaseItem } from "@/api/equipmentPurchaseApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, CurrencyInput, UniversalFileUploader } from "@/components";
import { UploadedFile } from "@/components/UniversalFileUploader";

const formatCurrency = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";

export default function CreateEquipmentPurchaseScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState<EquipmentPurchaseItem[]>([
        { name: "", code: "", quantity: 1, unit_price: 0, total_price: 0 }
    ]);
    const [notes, setNotes] = useState("");
    const [attachments, setAttachments] = useState<UploadedFile[]>([]);

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        if (field === "quantity" || field === "unit_price") {
            newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { name: "", code: "", quantity: 1, unit_price: 0, total_price: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) return Alert.alert("", "Phiếu mua phải có ít nhất 1 thiết bị.");
        setItems(items.filter((_, i) => i !== index));
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const handleSubmit = async () => {
        const invalid = items.find(i => !i.name.trim());
        if (invalid) return Alert.alert("Lỗi", "Vui lòng nhập tên cho tất cả thiết bị.");
        if (items.some(i => i.quantity <= 0)) return Alert.alert("Lỗi", "Số lượng phải ≥ 1.");

        try {
            setLoading(true);
            const payload: any = {
                notes: notes || undefined,
                items: items.map(i => ({
                    name: i.name.trim(),
                    code: i.code || undefined,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                })),
            };
            if (attachments.length > 0) {
                payload.attachment_ids = attachments.map(a => a.attachment_id || a.id).filter(Boolean);
            }

            const res = await equipmentPurchaseApi.create(id!, payload);
            if (res.success) {
                Alert.alert("Thành công", "Đã tạo phiếu mua thiết bị.", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo phiếu mua.");
        } finally { setLoading(false); }
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Tạo Phiếu Mua Thiết Bị"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.headerBtn, loading && { opacity: 0.5 }]}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.headerBtnText}>Lưu</Text>}
                    </TouchableOpacity>
                }
            />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DANH SÁCH THIẾT BỊ</Text>

                        {items.map((item, index) => (
                            <View key={index} style={styles.itemCard}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemIndex}>#{index + 1}</Text>
                                    {items.length > 1 && (
                                        <TouchableOpacity onPress={() => removeItem(index)}>
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Tên thiết bị *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={item.name}
                                        onChangeText={(v) => updateItem(index, "name", v)}
                                        placeholder="Nhập tên thiết bị..."
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Mã thiết bị</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={item.code || ""}
                                        onChangeText={(v) => updateItem(index, "code", v)}
                                        placeholder="VD: TB-001"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.label}>Số lượng *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={String(item.quantity)}
                                            onChangeText={(v) => updateItem(index, "quantity", Math.max(1, parseInt(v) || 1))}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 2, marginLeft: 8 }]}>
                                        <Text style={styles.label}>Đơn giá (VNĐ) *</Text>
                                        <CurrencyInput
                                            value={item.unit_price}
                                            onChangeText={(v) => updateItem(index, "unit_price", v)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Thành tiền:</Text>
                                    <Text style={styles.totalValue}>{formatCurrency(item.quantity * item.unit_price)}</Text>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                            <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                            <Text style={styles.addItemText}>Thêm thiết bị</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Summary */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>TỔNG CỘNG ({items.length} thiết bị)</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ĐÍNH KÈM</Text>
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
                            placeholder="Ghi chú..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    content: { flex: 1, padding: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5, marginBottom: 12 },
    formGroup: { marginBottom: 12 },
    label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
    input: {
        backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D1D5DB",
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: "#1F2937",
    },
    row: { flexDirection: "row" },
    headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
    headerBtnText: { fontSize: 15, fontWeight: "600", color: "#3B82F6" },
    itemCard: {
        backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: "#E5E7EB",
    },
    itemHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10,
    },
    itemIndex: { fontSize: 13, fontWeight: "700", color: "#3B82F6" },
    totalRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6",
    },
    totalLabel: { fontSize: 13, color: "#6B7280" },
    totalValue: { fontSize: 15, fontWeight: "700", color: "#059669" },
    addItemBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 12, borderWidth: 1, borderColor: "#3B82F6",
        borderStyle: "dashed", borderRadius: 10,
    },
    addItemText: { fontSize: 14, fontWeight: "600", color: "#3B82F6" },
    summaryCard: {
        backgroundColor: "#EFF6FF", borderRadius: 12, padding: 16, marginBottom: 20,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderWidth: 1, borderColor: "#BFDBFE",
    },
    summaryLabel: { fontSize: 13, fontWeight: "600", color: "#1E40AF" },
    summaryValue: { fontSize: 18, fontWeight: "800", color: "#1E40AF" },
});
