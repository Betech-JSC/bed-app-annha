import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, ScrollView, TextInput, Modal, FlatList, Platform, KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { assetUsageApi, AvailableAsset } from "@/api/assetUsageApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput } from "@/components";

interface UserOption { id: number; name: string; email?: string; }

export default function CreateAssetUsageScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);

    // Form
    const [selectedAsset, setSelectedAsset] = useState<AvailableAsset | null>(null);
    const [quantity, setQuantity] = useState("1");
    const [selectedReceiver, setSelectedReceiver] = useState<UserOption | null>(null);
    const [receivedDate, setReceivedDate] = useState(new Date());
    const [notes, setNotes] = useState("");

    // Selectors
    const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        loadAssets();
        loadUsers();
    }, []);

    const loadAssets = async (search = "") => {
        try {
            setLoadingData(true);
            const res = await assetUsageApi.getAvailableAssets({ search });
            if (res.success) setAvailableAssets(res.data || []);
        } catch (e) { console.error(e); } finally { setLoadingData(false); }
    };

    const loadUsers = async (search = "") => {
        try {
            const res = await projectApi.getAllUsers({ search });
            if (res.success) {
                const data = res.data?.data ?? res.data ?? [];
                setUsers(Array.isArray(data) ? data : []);
            }
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async () => {
        if (!selectedAsset) return Alert.alert("Lỗi", "Vui lòng chọn thiết bị.");
        if (!selectedReceiver) return Alert.alert("Lỗi", "Vui lòng chọn người nhận.");
        if (parseInt(quantity) <= 0) return Alert.alert("Lỗi", "Số lượng phải ≥ 1.");

        try {
            setLoading(true);
            const res = await assetUsageApi.create(id!, {
                equipment_id: selectedAsset.id,
                quantity: parseInt(quantity),
                receiver_id: selectedReceiver.id,
                received_date: receivedDate.toISOString().split("T")[0],
                notes: notes || undefined,
            });
            if (res.success) {
                Alert.alert("Thành công", "Phiếu đã được tạo (Nháp). Hãy gửi duyệt khi sẵn sàng.", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo phiếu mượn.");
        } finally { setLoading(false); }
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Mượn Thiết Bị Từ Kho"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.headerBtn, (loading || !selectedAsset || !selectedReceiver) && { opacity: 0.5 }]}
                        disabled={loading || !selectedAsset || !selectedReceiver}
                    >
                        {loading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.headerBtnText}>Lưu</Text>}
                    </TouchableOpacity>
                }
            />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THIẾT BỊ TỪ KHO</Text>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Chọn thiết bị *</Text>
                            <TouchableOpacity style={styles.picker} onPress={() => setShowAssetModal(true)}>
                                <Text style={[styles.pickerText, !selectedAsset && styles.placeholder]} numberOfLines={1}>
                                    {selectedAsset ? `[${selectedAsset.asset_code}] ${selectedAsset.name}` : "Chọn thiết bị từ kho..."}
                                </Text>
                                <Ionicons name="search" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Số lượng *</Text>
                            <TextInput
                                style={styles.input}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="number-pad"
                                placeholder="1"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THÔNG TIN MƯỢN</Text>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Người nhận *</Text>
                            <TouchableOpacity style={styles.picker} onPress={() => setShowUserModal(true)}>
                                <Text style={[styles.pickerText, !selectedReceiver && styles.placeholder]} numberOfLines={1}>
                                    {selectedReceiver?.name || "Chọn người nhận..."}
                                </Text>
                                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Ngày nhận *</Text>
                            <DatePickerInput value={receivedDate} onChange={setReceivedDate} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>GHI CHÚ</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Mục đích sử dụng, ghi chú..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Asset Selector */}
            <Modal visible={showAssetModal} transparent animationType="slide" onRequestClose={() => setShowAssetModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Chọn thiết bị từ kho</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm theo tên hoặc mã..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={(t) => { setSearchQuery(t); loadAssets(t); }}
                        />
                        {loadingData ? <ActivityIndicator style={{ paddingVertical: 20 }} /> : (
                            <FlatList
                                data={availableAssets}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={() => { setSelectedAsset(item); setShowAssetModal(false); setSearchQuery(""); }}
                                    >
                                        <View>
                                            <Text style={styles.modalItemTitle}>{item.name}</Text>
                                            <Text style={styles.modalItemSub}>{item.asset_code} • {item.category || "—"}</Text>
                                        </View>
                                        <View style={styles.stockBadge}>
                                            <Text style={styles.stockText}>
                                                Còn {item.remaining_quantity ?? item.quantity} {item.unit || 'cái'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<Text style={styles.emptyText}>Không có thiết bị nào</Text>}
                                style={{ maxHeight: 300 }}
                            />
                        )}
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setShowAssetModal(false); setSearchQuery(""); }}>
                            <Text style={styles.modalCloseBtnText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* User Selector */}
            <Modal visible={showUserModal} transparent animationType="slide" onRequestClose={() => setShowUserModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Chọn người nhận</Text>
                        <FlatList
                            data={users}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => { setSelectedReceiver(item); setShowUserModal(false); }}
                                >
                                    <Text style={styles.modalItemTitle}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy</Text>}
                            style={{ maxHeight: 300 }}
                        />
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowUserModal(false)}>
                            <Text style={styles.modalCloseBtnText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D1D5DB",
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: "#1F2937",
    },
    picker: {
        backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D1D5DB",
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    pickerText: { fontSize: 14, color: "#1F2937", flex: 1 },
    placeholder: { color: "#9CA3AF" },
    headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
    headerBtnText: { fontSize: 15, fontWeight: "600", color: "#3B82F6" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    searchInput: {
        backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 14,
        paddingVertical: 10, fontSize: 14, color: "#1F2937", marginBottom: 12,
    },
    modalItem: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    },
    modalItemTitle: { fontSize: 15, color: "#1F2937", fontWeight: "500" },
    modalItemSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    stockBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    stockText: { fontSize: 11, fontWeight: "600", color: "#059669" },
    modalCloseBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12, backgroundColor: "#F3F4F6", borderRadius: 10 },
    modalCloseBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
    emptyText: { textAlign: "center", color: "#9CA3AF", paddingVertical: 20 },
});
