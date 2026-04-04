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
import { equipmentApi, Equipment } from "@/api/equipmentApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, CurrencyInput } from "@/components";

interface UserOption {
    id: number;
    name: string;
    email: string;
}

export default function CreateEquipmentAllocationScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);

    // Form State
    const [allocationType, setAllocationType] = useState<"rent" | "buy">("rent");
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [quantity, setQuantity] = useState("1");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [notes, setNotes] = useState("");
    
    // Rent specific
    const [rentalFee, setRentalFee] = useState(0);
    
    // Buy/Owned specific
    const [allocatedTo, setAllocatedTo] = useState<UserOption | null>(null);
    const [manager, setManager] = useState<UserOption | null>(null);
    const [handoverDate, setHandoverDate] = useState(new Date());

    // Selector States
    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [loadingEquipments, setLoadingEquipments] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [showUserModal, setShowUserModal] = useState<{ visible: boolean, type: 'allocated_to' | 'manager' }>({ 
        visible: false, type: 'allocated_to' 
    });
    const [users, setUsers] = useState<UserOption[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");

    // Load Data
    const loadEquipments = async (query = "") => {
        try {
            setLoadingEquipments(true);
            const response = await equipmentApi.getEquipment({ search: query });
            if (response.success) {
                const data = response.data?.data ?? response.data ?? [];
                setEquipments(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error loading equipments:", error);
        } finally {
            setLoadingEquipments(false);
        }
    };

    const loadUsers = async (query = "") => {
        try {
            setLoadingUsers(true);
            const response = await projectApi.getAllUsers({ search: query });
            if (response.success) {
                const data = response.data?.data ?? response.data ?? [];
                setUsers(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        loadEquipments();
        loadUsers();
    }, []);

    const handleSubmit = async () => {
        if (!selectedEquipment) return Alert.alert("Lỗi", "Vui lòng chọn thiết bị.");
        if (!quantity || parseInt(quantity) <= 0) return Alert.alert("Lỗi", "Số lượng phải lớn hơn 0.");

        try {
            setLoading(true);
            const payload: any = {
                equipment_id: selectedEquipment.id,
                allocation_type: allocationType,
                quantity: parseInt(quantity),
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate ? endDate.toISOString().split("T")[0] : null,
                notes,
            };

            if (allocationType === "rent") {
                payload.rental_fee = rentalFee;
            } else {
                payload.allocated_to = allocatedTo?.id;
                payload.manager_id = manager?.id;
                payload.handover_date = handoverDate.toISOString().split("T")[0];
            }

            const response = await equipmentApi.createAllocation(id!, payload);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo phân bổ thiết bị.");
                router.replace(`/projects/${id}/equipment`); // Navigate back to list
            }
        } catch (error: any) {
            console.error("Error creating allocation:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo phân bổ.");
        } finally {
            setLoading(false);
        }
    };

    const renderTypeToggle = () => (
        <View style={styles.toggleContainer}>
            <TouchableOpacity 
                style={[styles.toggleBtn, allocationType === "rent" && styles.toggleBtnActive]}
                onPress={() => setAllocationType("rent")}
            >
                <Ionicons name="cart-outline" size={18} color={allocationType === "rent" ? "#FFFFFF" : "#6B7280"} />
                <Text style={[styles.toggleText, allocationType === "rent" && styles.toggleTextActive]}>Thuê ngoài</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.toggleBtn, allocationType === "buy" && styles.toggleBtnActive]}
                onPress={() => setAllocationType("buy")}
            >
                <Ionicons name="cube-outline" size={18} color={allocationType === "buy" ? "#FFFFFF" : "#6B7280"} />
                <Text style={[styles.toggleText, allocationType === "buy" && styles.toggleTextActive]}>Có sẵn (Kho)</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader 
                title="Thêm Thiết Bị Vào Dự Án" 
                showBackButton 
                rightComponent={
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.headerSubmitBtn, (loading || !selectedEquipment) && { opacity: 0.5 }]}
                        disabled={loading || !selectedEquipment}
                    >
                        {loading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.headerSubmitText}>Lưu</Text>}
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.headerSection}>
                        <Text style={styles.sectionTitle}>LOẠI PHÂN BỔ</Text>
                        {renderTypeToggle()}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THÔNG TIN THIẾT BỊ</Text>
                        
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Thiết bị *</Text>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowEquipmentModal(true)}
                            >
                                <Text style={[styles.pickerButtonText, !selectedEquipment && styles.placeholder]} numberOfLines={1}>
                                    {selectedEquipment ? `[${selectedEquipment.code}] ${selectedEquipment.name}` : "Chọn thiết bị..."}
                                </Text>
                                <Ionicons name="search" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Số lượng *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Đơn vị</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F9FAFB' }]}
                                    value={selectedEquipment?.unit || "---"}
                                    editable={false}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THỜI GIAN SỬ DỤNG</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <DatePickerInput
                                    label="Ngày bắt đầu *"
                                    value={startDate}
                                    onChange={(date) => date && setStartDate(date)}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <DatePickerInput
                                    label="Ngày kết thúc"
                                    value={endDate || undefined}
                                    onChange={(date) => setEndDate(date)}
                                />
                            </View>
                        </View>
                    </View>

                    {allocationType === "rent" ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>CHI PHÍ THUÊ</Text>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Tổng chi phí thuê (Dự kiến)</Text>
                                <CurrencyInput
                                    value={rentalFee}
                                    onChangeText={(amount) => setRentalFee(amount)}
                                />
                                <Text style={styles.inputHelp}>Chi phí này sẽ được tự động đưa vào mục Project Cost.</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>BÀN GIAO & QUẢN LÝ</Text>
                            
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Người nhận bàn giao</Text>
                                <TouchableOpacity
                                    style={styles.pickerButton}
                                    onPress={() => setShowUserModal({ visible: true, type: 'allocated_to' })}
                                >
                                    <Text style={[styles.pickerButtonText, !allocatedTo && styles.placeholder]} numberOfLines={1}>
                                        {allocatedTo ? allocatedTo.name : "Chọn nhân viên..."}
                                    </Text>
                                    <Ionicons name="person-outline" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Người quản lý trực tiếp</Text>
                                <TouchableOpacity
                                    style={styles.pickerButton}
                                    onPress={() => setShowUserModal({ visible: true, type: 'manager' })}
                                >
                                    <Text style={[styles.pickerButtonText, !manager && styles.placeholder]} numberOfLines={1}>
                                        {manager ? manager.name : "Chọn quản lý..."}
                                    </Text>
                                    <Ionicons name="shield-checkmark-outline" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginTop: 4 }}>
                                <DatePickerInput
                                    label="Ngày bàn giao thực tế"
                                    value={handoverDate}
                                    onChange={(date) => date && setHandoverDate(date)}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>GHI CHÚ</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Nhập ghi chú thêm nếu có..."
                            multiline
                        />
                    </View>

                    <View style={styles.footerSpace} />
                </ScrollView>

                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.submitBtn, (loading || !selectedEquipment) && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={loading || !selectedEquipment}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>XÁC NHẬN PHÂN BỔ</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Equipment Selector Modal */}
            <Modal visible={showEquipmentModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn Thiết Bị</Text>
                            <TouchableOpacity onPress={() => setShowEquipmentModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tên hoặc mã thiết bị..."
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    loadEquipments(text);
                                }}
                            />
                        </View>
                        {loadingEquipments ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color="#3B82F6" />
                        ) : (
                            <FlatList
                                data={equipments}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{ padding: 16 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.pickerItem}
                                        onPress={() => {
                                            setSelectedEquipment(item);
                                            setShowEquipmentModal(false);
                                        }}
                                    >
                                        <View style={styles.itemIconContainer}>
                                            <Ionicons name="construct" size={20} color="#3B82F6" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.pickerItemText}>{item.name}</Text>
                                            <Text style={styles.itemCodeText}>{item.code || "---"} • {item.category || "General"}</Text>
                                        </View>
                                        <View style={{ 
                                            backgroundColor: item.status === 'available' ? '#D1FAE5' : item.status === 'in_use' ? '#DBEAFE' : '#FEF3C7',
                                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 
                                        }}>
                                            <Text style={{ 
                                                fontSize: 10, fontWeight: '600',
                                                color: item.status === 'available' ? '#059669' : item.status === 'in_use' ? '#2563EB' : '#D97706'
                                            }}>
                                                {item.status === 'available' ? 'Sẵn sàng' : item.status === 'in_use' ? 'Đang dùng' : item.status === 'maintenance' ? 'Bảo trì' : item.status}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.modalEmpty}>
                                        <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
                                        <Text style={styles.modalEmptyText}>Không tìm thấy thiết bị nào</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* User Selector Modal */}
            <Modal visible={showUserModal.visible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn Nhân Viên</Text>
                            <TouchableOpacity onPress={() => setShowUserModal({ ...showUserModal, visible: false })}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm theo tên hoặc email..."
                                value={userSearchQuery}
                                onChangeText={(text) => {
                                    setUserSearchQuery(text);
                                    loadUsers(text);
                                }}
                            />
                        </View>
                        {loadingUsers ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color="#3B82F6" />
                        ) : (
                            <FlatList
                                data={users}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{ padding: 16 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.pickerItem}
                                        onPress={() => {
                                            if (showUserModal.type === 'allocated_to') setAllocatedTo(item);
                                            else setManager(item);
                                            setShowUserModal({ ...showUserModal, visible: false });
                                        }}
                                    >
                                        <View style={[styles.itemIconContainer, { backgroundColor: '#F3F4F6' }]}>
                                            <Ionicons name="person" size={20} color="#6B7280" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.pickerItemText}>{item.name}</Text>
                                            <Text style={styles.itemCodeText}>{item.email}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
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
        backgroundColor: "#F3F4F6",
    },
    content: {
        flex: 1,
    },
    headerSection: {
        padding: 16,
        paddingTop: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    section: {
        padding: 16,
        backgroundColor: "#FFFFFF",
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4B5563",
        marginBottom: 16,
        letterSpacing: 1,
    },
    row: {
        flexDirection: "row",
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 8,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 15,
        color: "#1F2937",
        backgroundColor: "#FFFFFF",
    },
    inputHelp: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 6,
        fontStyle: 'italic',
    },
    pickerButton: {
        height: 44,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
    },
    pickerButtonText: {
        fontSize: 15,
        color: "#1F2937",
        flex: 1,
    },
    placeholder: {
        color: "#9CA3AF",
    },
    toggleContainer: {
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    toggleBtnActive: {
        backgroundColor: "#3B82F6",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    toggleTextActive: {
        color: "#FFFFFF",
    },
    headerSubmitBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    headerSubmitText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#3B82F6",
    },
    bottomBar: {
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingBottom: Platform.OS === "ios" ? 34 : 16,
    },
    submitBtn: {
        backgroundColor: "#3B82F6",
        height: 50,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    submitBtnText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    disabledBtn: {
        backgroundColor: "#9CA3AF",
        shadowOpacity: 0,
    },
    footerSpace: {
        height: 40,
    },
    
    // MODAL STYLES
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        margin: 16,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: "#1F2937",
    },
    pickerItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        paddingHorizontal: 20,
        gap: 12,
    },
    itemIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    pickerItemText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
    },
    itemCodeText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    modalEmpty: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    modalEmptyText: {
        fontSize: 15,
        color: "#9CA3AF",
        marginTop: 12,
    }
});
