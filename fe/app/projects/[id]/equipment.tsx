import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentApi, Equipment } from "@/api/equipmentApi";
import { optionsApi, Option } from "@/api/optionsApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ProjectEquipmentScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
    const [loadingAllEquipment, setLoadingAllEquipment] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [allocationData, setAllocationData] = useState({
        start_date: new Date(),
        end_date: undefined as Date | undefined,
        daily_rate: "",
        notes: "",
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [equipmentStatuses, setEquipmentStatuses] = useState<Option[]>([]);
    const [equipmentTypes, setEquipmentTypes] = useState<Option[]>([]);

    useEffect(() => {
        loadEquipment();
        loadEquipmentOptions();
    }, [id, searchQuery]);

    const loadEquipmentOptions = async () => {
        try {
            const [statuses, types] = await Promise.all([
                optionsApi.getEquipmentStatuses(),
                optionsApi.getEquipmentTypes(),
            ]);
            setEquipmentStatuses(statuses);
            setEquipmentTypes(types);
        } catch (error) {
            console.error("Error loading equipment options:", error);
        }
    };

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const response = await equipmentApi.getEquipmentByProject(id!, {
                search: searchQuery || undefined,
            });
            if (response.success) {
                setEquipment(response.data.data || []);
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải danh sách thiết bị";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadAllEquipment = async () => {
        try {
            setLoadingAllEquipment(true);
            const response = await equipmentApi.getEquipment({ active_only: true });
            if (response.success) {
                const all = response.data.data || [];
                // Lọc ra các equipment chưa có trong project hoặc có status available
                const projectEquipmentIds = equipment.map(e => e.id);
                setAllEquipment(all.filter((e: Equipment) =>
                    !projectEquipmentIds.includes(e.id) &&
                    (e.status === "available" || e.status === "in_use")
                ));
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải danh sách thiết bị";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoadingAllEquipment(false);
        }
    };

    const handleOpenAddModal = () => {
        setShowAddModal(true);
        loadAllEquipment();
    };

    const handleSelectEquipment = (equipment: Equipment) => {
        setSelectedEquipment(equipment);
    };

    const handleCreateAllocation = async () => {
        if (!selectedEquipment) {
            Alert.alert("Lỗi", "Vui lòng chọn thiết bị");
            return;
        }

        if (selectedEquipment.status !== "available" && selectedEquipment.status !== "in_use") {
            Alert.alert("Lỗi", "Thiết bị không khả dụng");
            return;
        }

        try {
            setSubmitting(true);
            const response = await equipmentApi.createAllocation(id!, {
                equipment_id: selectedEquipment.id,
                start_date: allocationData.start_date.toISOString().split("T")[0],
                end_date: allocationData.end_date?.toISOString().split("T")[0],
                daily_rate: allocationData.daily_rate ? parseFloat(allocationData.daily_rate) : undefined,
                notes: allocationData.notes || undefined,
            });

            if (response.success) {
                Alert.alert("Thành công", "Đã phân bổ thiết bị cho dự án");
                setShowAddModal(false);
                setSelectedEquipment(null);
                setAllocationData({
                    start_date: new Date(),
                    end_date: undefined,
                    daily_rate: "",
                    notes: "",
                });
                loadEquipment();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tạo phân bổ";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadEquipment();
    };

    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined || amount === null) return "N/A";
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    const getStatusLabel = (status: string): string => {
        const option = equipmentStatuses.find(s => s.value === status);
        return option?.label || status;
    };

    const getTypeLabel = (type: string): string => {
        const option = equipmentTypes.find(t => t.value === type);
        return option?.label || type;
    };

    const getStatusColor = (status: string) => {
        const option = equipmentStatuses.find(s => s.value === status);
        return option?.color || "#6B7280";
    };

    const renderItem = ({ item }: { item: Equipment }) => {
        const projectAllocation = (item as any).project_allocation;
        const allocationsCount = (item as any).project_allocations_count || 0;
        const statusColor = getStatusColor(item.status);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/equipment/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        {item.code && (
                            <Text style={styles.cardCode}>{item.code}</Text>
                        )}
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: statusColor + "20" },
                        ]}
                    >
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {getStatusLabel(item.status)}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                            <Text style={styles.infoLabel}>Loại:</Text>
                            <Text style={styles.infoValue}>{getTypeLabel(item.type)}</Text>
                        </View>
                        {item.category && (
                            <View style={styles.infoItem}>
                                <Ionicons name="grid-outline" size={16} color="#6B7280" />
                                <Text style={styles.infoLabel}>Danh mục:</Text>
                                <Text style={styles.infoValue}>{item.category}</Text>
                            </View>
                        )}
                    </View>

                    {projectAllocation && (
                        <>
                            <View style={styles.allocationCard}>
                                <View style={styles.allocationHeader}>
                                    <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                                    <Text style={styles.allocationTitle}>Phân bổ hiện tại</Text>
                                </View>
                                <View style={styles.allocationInfo}>
                                    <Text style={styles.allocationText}>
                                        Từ: {formatDate(projectAllocation.start_date)}
                                    </Text>
                                    {projectAllocation.end_date ? (
                                        <Text style={styles.allocationText}>
                                            Đến: {formatDate(projectAllocation.end_date)}
                                        </Text>
                                    ) : (
                                        <Text style={[styles.allocationText, styles.allocationActive]}>
                                            Đang sử dụng
                                        </Text>
                                    )}
                                    {projectAllocation.daily_rate && (
                                        <Text style={styles.allocationText}>
                                            Giá thuê: {formatCurrency(projectAllocation.daily_rate)}/ngày
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </>
                    )}

                    {allocationsCount > 0 && !projectAllocation && (
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Ionicons name="time-outline" size={16} color="#6B7280" />
                                <Text style={styles.infoLabel}>Số lần phân bổ:</Text>
                                <Text style={styles.infoValue}>{allocationsCount}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Thiết Bị Dự Án"
                showBackButton
                rightComponent={
                    <TouchableOpacity onPress={handleOpenAddModal} style={styles.addButton}>
                        <Ionicons name="add" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={equipment}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="build-outline" size={64} color="#9CA3AF" />
                        <Text style={styles.emptyText}>
                            {searchQuery
                                ? "Không tìm thấy thiết bị phù hợp"
                                : "Chưa có thiết bị nào được phân bổ cho dự án này"}
                        </Text>
                    </View>
                }
            />

            {/* Add Equipment Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Phân Bổ Thiết Bị</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {!selectedEquipment ? (
                        <View style={styles.modalBody}>
                            <Text style={styles.sectionTitle}>Chọn thiết bị</Text>
                            {loadingAllEquipment ? (
                                <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
                            ) : (
                                <FlatList
                                    data={allEquipment}
                                    renderItem={({ item }) => {
                                        const statusColor = getStatusColor(item.status);
                                        return (
                                            <TouchableOpacity
                                                style={styles.equipmentOption}
                                                onPress={() => handleSelectEquipment(item)}
                                            >
                                                <View style={styles.equipmentOptionInfo}>
                                                    <Text style={styles.equipmentOptionName}>{item.name}</Text>
                                                    {item.code && (
                                                        <Text style={styles.equipmentOptionCode}>{item.code}</Text>
                                                    )}
                                                    <View style={styles.equipmentOptionMeta}>
                                                        <Text style={styles.equipmentOptionType}>
                                                            {getTypeLabel(item.type)}
                                                        </Text>
                                                        <View
                                                            style={[
                                                                styles.equipmentStatusBadge,
                                                                { backgroundColor: statusColor + "20" },
                                                            ]}
                                                        >
                                                            <Text style={[styles.equipmentStatusText, { color: statusColor }]}>
                                                                {getStatusLabel(item.status)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                                            </TouchableOpacity>
                                        );
                                    }}
                                    keyExtractor={(item) => item.id.toString()}
                                    ListEmptyComponent={
                                        <Text style={styles.emptyText}>Không còn thiết bị nào để phân bổ</Text>
                                    }
                                    style={{ flex: 1 }}
                                />
                            )}
                        </View>
                    ) : (
                        <ScrollView style={styles.modalBody} nestedScrollEnabled={true}>
                            <View style={styles.selectedEquipmentCard}>
                                <View style={styles.selectedEquipmentHeader}>
                                    <Text style={styles.selectedEquipmentName}>{selectedEquipment.name}</Text>
                                    <TouchableOpacity onPress={() => setSelectedEquipment(null)}>
                                        <Ionicons name="close-circle" size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.selectedEquipmentInfo}>
                                    Loại: {getTypeLabel(selectedEquipment.type)} • {getStatusLabel(selectedEquipment.status)}
                                </Text>
                                {selectedEquipment.rental_rate_per_day && (
                                    <Text style={styles.selectedEquipmentInfo}>
                                        Giá thuê: {formatCurrency(selectedEquipment.rental_rate_per_day)}/ngày
                                    </Text>
                                )}
                            </View>

                            <Text style={styles.sectionTitle}>Thông tin phân bổ</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày bắt đầu *</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <Text style={styles.dateButtonText}>
                                        {allocationData.start_date.toLocaleDateString("vi-VN")}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showStartDatePicker && (
                                    <DateTimePicker
                                        value={allocationData.start_date}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowStartDatePicker(false);
                                            if (date) {
                                                setAllocationData({ ...allocationData, start_date: date });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày kết thúc (tùy chọn)</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setShowEndDatePicker(true)}
                                >
                                    <Text style={styles.dateButtonText}>
                                        {allocationData.end_date
                                            ? allocationData.end_date.toLocaleDateString("vi-VN")
                                            : "Chọn ngày kết thúc"}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {allocationData.end_date && (
                                    <TouchableOpacity
                                        style={styles.clearDateButton}
                                        onPress={() => setAllocationData({ ...allocationData, end_date: undefined })}
                                    >
                                        <Text style={styles.clearDateText}>Xóa ngày kết thúc</Text>
                                    </TouchableOpacity>
                                )}
                                {showEndDatePicker && (
                                    <DateTimePicker
                                        value={allocationData.end_date || new Date()}
                                        mode="date"
                                        display="default"
                                        minimumDate={allocationData.start_date}
                                        onChange={(event, date) => {
                                            setShowEndDatePicker(false);
                                            if (date) {
                                                setAllocationData({ ...allocationData, end_date: date });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {selectedEquipment.type === "rented" && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Giá thuê/ngày (VNĐ)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={allocationData.daily_rate}
                                        onChangeText={(text) => setAllocationData({ ...allocationData, daily_rate: text })}
                                        placeholder={selectedEquipment.rental_rate_per_day
                                            ? `Mặc định: ${formatCurrency(selectedEquipment.rental_rate_per_day)}`
                                            : "Nhập giá thuê"}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ghi chú</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={allocationData.notes}
                                    onChangeText={(text) => setAllocationData({ ...allocationData, notes: text })}
                                    placeholder="Nhập ghi chú (tùy chọn)"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                onPress={handleCreateAllocation}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Phân bổ thiết bị</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </KeyboardAvoidingView>
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
        backgroundColor: "#F9FAFB",
    },
    addButton: {
        padding: 4,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
        marginBottom: 12,
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
    cardCode: {
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
    cardBody: {
        gap: 12,
    },
    infoRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 4,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    infoLabel: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    infoValue: {
        fontSize: 14,
        color: "#1F2937",
        fontWeight: "600",
    },
    allocationCard: {
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#3B82F6",
    },
    allocationHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    allocationTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#3B82F6",
    },
    allocationInfo: {
        gap: 4,
    },
    allocationText: {
        fontSize: 13,
        color: "#4B5563",
    },
    allocationActive: {
        color: "#10B981",
        fontWeight: "600",
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
        textAlign: "center",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
        textAlign: "center",
        marginLeft: -24,
    },
    modalBody: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 16,
        marginTop: 8,
    },
    equipmentOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    equipmentOptionInfo: {
        flex: 1,
    },
    equipmentOptionName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    equipmentOptionCode: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 8,
    },
    equipmentOptionMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    equipmentOptionType: {
        fontSize: 14,
        color: "#6B7280",
    },
    equipmentStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    equipmentStatusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    selectedEquipmentCard: {
        backgroundColor: "#EFF6FF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderLeftWidth: 3,
        borderLeftColor: "#3B82F6",
    },
    selectedEquipmentHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    selectedEquipmentName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    selectedEquipmentInfo: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 4,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 12,
    },
    dateButtonText: {
        fontSize: 16,
        color: "#1F2937",
    },
    clearDateButton: {
        marginTop: 8,
        alignSelf: "flex-start",
    },
    clearDateText: {
        fontSize: 14,
        color: "#EF4444",
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
        marginBottom: 32,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
