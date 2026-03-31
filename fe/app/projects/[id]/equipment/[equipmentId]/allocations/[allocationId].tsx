import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentApi, Equipment, EquipmentAllocation } from "@/api/equipmentApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function EquipmentAllocationDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useTabBarHeight();
    const { id: projectId, equipmentId, allocationId } = useLocalSearchParams<{
        id: string;
        equipmentId: string;
        allocationId: string;
    }>();

    const [loading, setLoading] = useState(true);
    const [equipment, setEquipment] = useState<Equipment | null>(null);
    const [allocation, setAllocation] = useState<EquipmentAllocation | null>(null);

    useEffect(() => {
        loadData();
    }, [equipmentId, allocationId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await equipmentApi.getEquipmentItem(parseInt(equipmentId!));
            if (response.success) {
                setEquipment(response.data);
                const foundAllocation = response.data.allocations?.find(
                    (a: any) => a.id.toString() === allocationId
                );
                setAllocation(foundAllocation || null);
            }
        } catch (error) {
            console.error("Error loading allocation detail:", error);
            Alert.alert("Lỗi", "Không thể tải thông tin chi tiết");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active': return { label: 'ĐANG SỬ DỤNG', color: '#10B981', bg: '#D1FAE5' };
            case 'completed': return { label: 'ĐÃ HOÀN THÀNH', color: '#3B82F6', bg: '#DBEAFE' };
            case 'cancelled': return { label: 'ĐÃ HỦY', color: '#EF4444', bg: '#FEE2E2' };
            default: return { label: status?.toUpperCase(), color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
        );
    }

    if (!allocation || !equipment) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Phân Bổ" showBackButton />
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Không tìm thấy thông tin phân bổ</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const { label, color, bg } = getStatusInfo(allocation.status);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi Tiết Phân Bổ" showBackButton />
            
            <ScrollView 
                contentContainerStyle={[
                    styles.scrollContent, 
                    { paddingBottom: insets.bottom + tabBarHeight + 20 }
                ]}
            >
                {/* Header Info */}
                <View style={styles.headerCard}>
                    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                        <Text style={[styles.statusText, { color }]}>{label}</Text>
                    </View>
                    <Text style={styles.equipmentName}>{equipment.name}</Text>
                    <Text style={styles.equipmentCode}>{equipment.code || "Mã thiết bị: N/A"}</Text>
                    
                    <View style={styles.typeTagContainer}>
                        <View style={styles.typeTag}>
                            <Text style={styles.typeTagText}>
                                {allocation.allocation_type === "rent" ? "Hình thức: Thuê" : "Hình thức: Có sẵn"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Main Details Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>THÔNG TIN PHÂN BỔ</Text>
                    <View style={styles.detailsList}>
                        <DetailItem 
                            icon="cube-outline" 
                            label="Số lượng" 
                            value={`${allocation.quantity} ${equipment.unit || "Bộ"}`} 
                        />
                        <DetailItem 
                            icon="today-outline" 
                            label="Ngày bắt đầu" 
                            value={formatDate(allocation.start_date)} 
                        />
                        <DetailItem 
                            icon="calendar-outline" 
                            label="Ngày kết thúc (Dự kiến)" 
                            value={formatDate(allocation.end_date!)} 
                        />
                        <DetailItem 
                            icon="person-outline" 
                            label="Người quản lý/Sử dụng" 
                            value={allocation.allocatedTo?.name || allocation.manager?.name || "Chưa bàn giao"} 
                        />
                    </View>
                </View>

                {/* Financial Section (if rent) */}
                {allocation.allocation_type === "rent" && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THÔNG TIN CHI PHÍ</Text>
                        <View style={styles.detailsList}>
                            <DetailItem 
                                icon="cash-outline" 
                                label="Tổng phí thuê" 
                                value={formatCurrency(allocation.rental_fee || 0)}
                                valueStyle={styles.highlightValue}
                            />
                            {allocation.cost_id && (
                                <DetailItem 
                                    icon="receipt-outline" 
                                    label="Mã chi phí liên kết" 
                                    value={`#${allocation.cost_id}`} 
                                />
                            )}
                        </View>
                    </View>
                )}

                {/* Handover Section (if buy) */}
                {allocation.allocation_type === "buy" && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>THÔNG TIN BÀN GIAO</Text>
                        <View style={styles.detailsList}>
                            <DetailItem 
                                icon="hand-left-outline" 
                                label="Ngày bàn giao" 
                                value={formatDate(allocation.handover_date!)} 
                            />
                            <DetailItem 
                                icon="arrow-undo-outline" 
                                label="Ngày trả (Thực tế)" 
                                value={formatDate(allocation.return_date!)} 
                            />
                        </View>
                    </View>
                )}

                {/* Notes Section */}
                <View style={[styles.section, { borderBottomWidth: 0 }]}>
                    <Text style={styles.sectionTitle}>GHI CHÚ</Text>
                    <View style={styles.notesContainer}>
                        <Text style={styles.notesText}>
                            {allocation.notes || "Không có ghi chú nào."}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

function DetailItem({ icon, label, value, valueStyle }: any) {
    return (
        <View style={styles.detailItem}>
            <View style={styles.detailIconBox}>
                <Ionicons name={icon} size={20} color="#6B7280" />
            </View>
            <View style={styles.detailTextBox}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#6B7280",
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    headerCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        marginBottom: 24,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    equipmentName: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1F2937",
        textAlign: "center",
    },
    equipmentCode: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 4,
        fontWeight: "500",
    },
    typeTagContainer: {
        marginTop: 16,
    },
    typeTag: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    typeTagText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4B5563",
    },
    section: {
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#9CA3AF",
        marginBottom: 16,
        letterSpacing: 1,
    },
    detailsList: {
        gap: 16,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    detailIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    detailTextBox: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#374151",
    },
    highlightValue: {
        color: "#10B981",
    },
    notesContainer: {
        backgroundColor: "#F9FAFB",
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#3B82F6",
    },
    notesText: {
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 22,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
        textAlign: "center",
    },
    backBtn: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: "#3B82F6",
        borderRadius: 12,
    },
    backBtnText: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
});
