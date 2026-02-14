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
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, CurrencyInput, PermissionGuard, PermissionDenied } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

// Đồng bộ với BE OptionsController - trạng thái thiết bị
const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
    available: "Sẵn sàng",
    in_use: "Đang sử dụng",
    maintenance: "Bảo trì",
    retired: "Ngừng sử dụng",
};
const EQUIPMENT_STATUS_COLORS: Record<string, string> = {
    available: "#10B981",
    in_use: "#3B82F6",
    maintenance: "#F59E0B",
    retired: "#6B7280",
};

export default function ProjectEquipmentScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = useProjectPermissions(id);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
    const [loadingAllEquipment, setLoadingAllEquipment] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [allocationData, setAllocationData] = useState({
        allocation_type: "rent" as "rent" | "buy",
        quantity: "1",
        start_date: new Date(),
        end_date: undefined as Date | undefined,
        notes: "",
        // Đối với THIẾT BỊ CÓ SẴN (buy): Quản lý điều động
        manager_id: null as number | null,
        handover_date: undefined as Date | undefined,
        return_date: undefined as Date | undefined,
        // Đối với THIẾT BỊ THUÊ (rent): Như một hóa đơn chi phí
        rental_fee: 0,
    });
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showManagerPicker, setShowManagerPicker] = useState(false);
    const [selectedManager, setSelectedManager] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [equipmentStatuses, setEquipmentStatuses] = useState<Option[]>([]);
    const [equipmentTypes, setEquipmentTypes] = useState<Option[]>([]);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    useEffect(() => {
        loadEquipment(selectedStatus);
        loadEquipmentOptions();
    }, [id, searchQuery, selectedStatus]);

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

    const loadEquipment = async (status: string = selectedStatus) => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            setPermissionMessage("");

            // Map filter status to API params
            const apiParams: any = {
                search: searchQuery || undefined,
                status: status !== 'all' ? status : undefined,
            };

            const response = await equipmentApi.getEquipmentByProject(id!, apiParams);
            if (response.success) {
                setEquipment(response.data.data || []);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem thiết bị của dự án này.");
                setEquipment([]);
            } else {
                const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải danh sách thiết bị";
                Alert.alert("Lỗi", errorMessage);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status);
        // useEffect will trigger loadEquipment
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
        loadUsers();
        // Reset form
        setAllocationData({
            allocation_type: "rent",
            quantity: "1",
            start_date: new Date(),
            end_date: undefined,
            notes: "",
            manager_id: null,
            handover_date: undefined,
            return_date: undefined,
            rental_fee: 0,
        });
        setSelectedManager(null);
    };

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await projectApi.getAllUsers();
            if (response.success) {
                setUsers(response.data || []);
            }
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSelectEquipment = (equipment: Equipment) => {
        setSelectedEquipment(equipment);

        // Preserve existing settings where possible, only update type-specific defaults
        setAllocationData(prev => ({
            ...prev,
            allocation_type: equipment.type === 'rented' ? 'rent' : 'buy',
            // Don't reset other fields like manager_id, dates, notes
        }));
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

        const quantity = parseInt(allocationData.quantity) || 1;
        if (quantity < 1) {
            Alert.alert("Lỗi", "Số lượng phải lớn hơn 0");
            return;
        }

        // Removed: global quantity validation as equipment settings are simplified

        // Validation cho có sẵn
        if (allocationData.allocation_type === "buy" && !allocationData.manager_id) {
            Alert.alert("Lỗi", "Vui lòng chọn người quản lý thiết bị");
            return;
        }

        // Validation cho THUÊ (rent)
        if (allocationData.allocation_type === "rent") {
            if (!allocationData.rental_fee || allocationData.rental_fee <= 0) {
                Alert.alert("Lỗi", "Vui lòng nhập tổng phí thuê");
                return;
            }
        }

        try {
            setSubmitting(true);

            const requestData: any = {
                equipment_id: selectedEquipment.id,
                allocation_type: allocationData.allocation_type,
                quantity: quantity,
                start_date: allocationData.start_date.toISOString().split("T")[0],
                end_date: allocationData.end_date?.toISOString().split("T")[0],
                notes: allocationData.notes || undefined,
            };

            // Cho có sẵn (buy)
            if (allocationData.allocation_type === "buy") {
                requestData.manager_id = allocationData.manager_id!;
                requestData.handover_date = allocationData.handover_date?.toISOString().split("T")[0]
                    || allocationData.start_date.toISOString().split("T")[0];
                requestData.return_date = allocationData.return_date?.toISOString().split("T")[0];
            }

            // Cho THUÊ (rent)
            if (allocationData.allocation_type === "rent") {
                requestData.rental_fee = allocationData.rental_fee;
            }

            const response = await equipmentApi.createAllocation(id!, requestData);

            if (response.success) {
                Alert.alert("Thành công",
                    allocationData.allocation_type === "buy"
                        ? "Đã phân bổ thiết bị (Có sẵn) cho dự án"
                        : "Đã tạo phân bổ thiết bị (Thuê) cho dự án"
                );
                setShowAddModal(false);
                setSelectedEquipment(null);
                setAllocationData({
                    allocation_type: "rent",
                    quantity: "1",
                    start_date: new Date(),
                    end_date: undefined,
                    notes: "",
                    manager_id: null,
                    handover_date: undefined,
                    return_date: undefined,
                    rental_fee: 0,
                });
                setSelectedManager(null);
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
        return EQUIPMENT_STATUS_LABELS[status] || equipmentStatuses.find(s => s.value === status)?.label || status;
    };

    const getTypeLabel = (type: string): string => {
        const option = equipmentTypes.find(t => t.value === type);
        return option?.label || type;
    };

    const getStatusColor = (status: string) => {
        return EQUIPMENT_STATUS_COLORS[status] || equipmentStatuses.find(s => s.value === status)?.color || "#6B7280";
    };

    const EquipmentItem = ({ item }: { item: Equipment }) => {
        const [expanded, setExpanded] = useState(false);
        const projectAllocation = (item as any).project_allocation;
        const allocationsCount = (item as any).project_allocations_count || 0;
        const statusColor = getStatusColor(item.status);

        return (
            <View style={styles.card}>
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => router.push(`/equipment/${item.id}`)}
                >
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
                </TouchableOpacity>

                {expanded && (
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
                            <View style={styles.allocationCard}>
                                <View style={styles.allocationHeader}>
                                    <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                                    <Text style={styles.allocationTitle}>Thông tin phân bổ</Text>
                                </View>
                                <View style={styles.allocationInfo}>
                                    <Text style={styles.allocationText}>
                                        Từ: {formatDate(projectAllocation.start_date)}
                                    </Text>
                                    {projectAllocation.status === 'active' ? (
                                        projectAllocation.end_date ? (
                                            <Text style={styles.allocationText}>
                                                Dự kiến đến: {formatDate(projectAllocation.end_date)}
                                            </Text>
                                        ) : (
                                            <Text style={[styles.allocationText, styles.allocationActive]}>
                                                Đang sử dụng
                                            </Text>
                                        )
                                    ) : (
                                        <Text style={[styles.allocationText, { color: '#6B7280' }]}>
                                            Đã trả: {formatDate(projectAllocation.return_date || projectAllocation.end_date)}
                                        </Text>
                                    )}
                                    {projectAllocation.rental_fee && (
                                        <Text style={styles.allocationText}>
                                            Phí thuê: {formatCurrency(projectAllocation.rental_fee)}
                                        </Text>
                                    )}
                                </View>
                            </View>
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

                        <TouchableOpacity
                            style={styles.detailLink}
                            onPress={() => router.push(`/equipment/${item.id}`)}
                        >
                            <Text style={styles.detailLinkText}>Xem chi tiết đầy đủ</Text>
                            <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setExpanded(!expanded)}
                >
                    <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#6B7280"
                    />
                    <Text style={styles.expandButtonText}>
                        {expanded ? "Thu gọn" : "Xem thêm"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Thiết Bị Dự Án" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    // Hiển thị thông báo RBAC nếu không có quyền
    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Thiết Bị Dự Án" showBackButton />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Thiết Bị Dự Án"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.EQUIPMENT_CREATE} projectId={id}>
                        <TouchableOpacity onPress={handleOpenAddModal} style={styles.addButton}>
                            <Ionicons name="add" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

            <PermissionGuard permission={Permissions.EQUIPMENT_VIEW} projectId={id}>
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                        <TouchableOpacity
                            style={[styles.filterChip, selectedStatus === "all" && styles.filterChipActive]}
                            onPress={() => handleStatusFilter("all")}
                        >
                            <Text style={[styles.filterChipText, selectedStatus === "all" && styles.filterChipTextActive]}>
                                Tất cả
                            </Text>
                        </TouchableOpacity>
                        {Object.entries(EQUIPMENT_STATUS_LABELS).map(([key, label]) => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.filterChip, selectedStatus === key && styles.filterChipActive]}
                                onPress={() => handleStatusFilter(key)}
                            >
                                <Text style={[styles.filterChipText, selectedStatus === key && styles.filterChipTextActive]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={equipment}
                    renderItem={({ item }) => <EquipmentItem item={item} />}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="build-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>
                                {searchQuery
                                    ? "Không tìm thấy thiết bị phù hợp"
                                    : "Chưa có thiết bị nào trong danh sách"}
                            </Text>
                        </View>
                    }
                />
            </PermissionGuard>

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
                    <View style={[styles.modalHeader, Platform.OS === 'android' && { paddingTop: insets.top + 16 }]}>
                        <TouchableOpacity
                            onPress={() => setShowAddModal(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Phân Bổ Thiết Bị</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {!selectedEquipment ? (
                        <View style={styles.modalBody}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="search-outline" size={20} color="#3B82F6" />
                                <Text style={styles.sectionTitle}>Chọn thiết bị</Text>
                            </View>
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
                        <>
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
                                </View>

                                <View style={styles.formSection}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="options-outline" size={20} color="#3B82F6" />
                                        <Text style={styles.sectionTitle}>Thông tin phân bổ</Text>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Loại hình *</Text>
                                        <View style={styles.typeContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.typeButton,
                                                    allocationData.allocation_type === "rent" && styles.typeButtonActive,
                                                ]}
                                                onPress={() => setAllocationData({ ...allocationData, allocation_type: "rent" })}
                                            >
                                                <Ionicons
                                                    name={allocationData.allocation_type === "rent" ? "checkmark-circle" : "ellipse-outline"}
                                                    size={18}
                                                    color={allocationData.allocation_type === "rent" ? "#FFFFFF" : "#6B7280"}
                                                />
                                                <Text style={[styles.typeButtonText, allocationData.allocation_type === "rent" && styles.typeButtonTextActive]}>Thuê</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    styles.typeButton,
                                                    allocationData.allocation_type === "buy" && styles.typeButtonActive,
                                                ]}
                                                onPress={() => setAllocationData({ ...allocationData, allocation_type: "buy" })}
                                            >
                                                <Ionicons
                                                    name={allocationData.allocation_type === "buy" ? "checkmark-circle" : "ellipse-outline"}
                                                    size={18}
                                                    color={allocationData.allocation_type === "buy" ? "#FFFFFF" : "#6B7280"}
                                                />
                                                <Text style={[styles.typeButtonText, allocationData.allocation_type === "buy" && styles.typeButtonTextActive]}>Có sẵn</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Số lượng *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={allocationData.quantity}
                                            onChangeText={(text) => {
                                                setAllocationData({ ...allocationData, quantity: text });
                                            }}
                                            placeholder="Nhập số lượng"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                <View style={styles.formSection}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                                        <Text style={styles.sectionTitle}>Thời gian {allocationData.allocation_type === "rent" ? "& Chi phí" : "& Bàn giao"}</Text>
                                    </View>

                                    <DatePickerInput
                                        label="Ngày bắt đầu *"
                                        value={allocationData.start_date}
                                        onChange={(date) => {
                                            if (date) {
                                                setAllocationData({ ...allocationData, start_date: date });
                                            }
                                        }}
                                        placeholder="Chọn ngày bắt đầu"
                                        required
                                    />

                                    <DatePickerInput
                                        label="Ngày kết thúc (dự kiến)"
                                        value={allocationData.end_date || null}
                                        onChange={(date) => {
                                            setAllocationData({ ...allocationData, end_date: date || undefined });
                                        }}
                                        placeholder="Chọn ngày kết thúc"
                                        minimumDate={allocationData.start_date}
                                    />

                                    {allocationData.allocation_type === "rent" && (
                                        <CurrencyInput
                                            label="Tổng chi phí thuê (Theo hóa đơn) *"
                                            value={allocationData.rental_fee}
                                            onChangeText={(amount) => setAllocationData({ ...allocationData, rental_fee: amount })}
                                            placeholder="Nhập tổng số tiền trên hóa đơn"
                                            helperText="Chi phí sẽ được ghi nhận vào chi phí dự án"
                                        />
                                    )}

                                    {allocationData.allocation_type === "buy" && (
                                        <>
                                            <View style={styles.formGroup}>
                                                <Text style={styles.label}>Người nhận bàn giao *</Text>
                                                <TouchableOpacity
                                                    style={styles.selectButton}
                                                    onPress={() => {
                                                        loadUsers();
                                                        setShowManagerPicker(true);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.selectButtonText,
                                                            !selectedManager && styles.selectButtonPlaceholder,
                                                        ]}
                                                    >
                                                        {selectedManager
                                                            ? selectedManager.name
                                                            : "Chọn người nhận bàn giao"}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                                </TouchableOpacity>
                                            </View>

                                            <DatePickerInput
                                                label="Ngày bàn giao"
                                                value={allocationData.handover_date || allocationData.start_date}
                                                onChange={(date) => {
                                                    if (date) {
                                                        setAllocationData({ ...allocationData, handover_date: date });
                                                    }
                                                }}
                                                placeholder="Mặc định: Ngày bắt đầu"
                                            />

                                            <DatePickerInput
                                                label="Ngày hoàn trả (dự kiến)"
                                                value={allocationData.return_date || null}
                                                onChange={(date) => {
                                                    setAllocationData({ ...allocationData, return_date: date || undefined });
                                                }}
                                                placeholder="Chọn ngày hoàn trả"
                                                minimumDate={allocationData.handover_date || allocationData.start_date}
                                            />
                                        </>
                                    )}
                                </View>

                                <View style={styles.formSection}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="create-outline" size={20} color="#3B82F6" />
                                        <Text style={styles.sectionTitle}>Thông tin bổ sung</Text>
                                    </View>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.label}>Ghi chú</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={allocationData.notes}
                                            onChangeText={(text) => setAllocationData({ ...allocationData, notes: text })}
                                            placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>
                                </View>

                                {showManagerPicker && (
                                    <View style={styles.pickerModalOverlay}>
                                        <View style={styles.pickerModalContainer}>
                                            <View style={styles.pickerModalHeader}>
                                                <Text style={styles.pickerModalTitle}>Chọn Người Nhận Bàn Giao</Text>
                                                <TouchableOpacity onPress={() => setShowManagerPicker(false)}>
                                                    <Ionicons name="close" size={24} color="#1F2937" />
                                                </TouchableOpacity>
                                            </View>
                                            {loadingUsers ? (
                                                <View style={styles.pickerLoadingContainer}>
                                                    <ActivityIndicator size="large" color="#3B82F6" />
                                                </View>
                                            ) : (
                                                <FlatList
                                                    data={users}
                                                    keyExtractor={(item) => item.id.toString()}
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.pickerItem,
                                                                selectedManager?.id === item.id && styles.pickerItemActive,
                                                            ]}
                                                            onPress={() => {
                                                                setSelectedManager(item);
                                                                setAllocationData({ ...allocationData, manager_id: item.id });
                                                                setShowManagerPicker(false);
                                                            }}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.pickerItemText,
                                                                    selectedManager?.id === item.id && styles.pickerItemTextActive,
                                                                ]}
                                                            >
                                                                {item.name}
                                                            </Text>
                                                            {selectedManager?.id === item.id && (
                                                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                                            )}
                                                        </TouchableOpacity>
                                                    )}
                                                    ListEmptyComponent={
                                                        <View style={styles.pickerEmptyContainer}>
                                                            <Text style={styles.pickerEmptyText}>Không có người dùng nào</Text>
                                                        </View>
                                                    }
                                                />
                                            )}
                                        </View>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                <TouchableOpacity
                                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                    onPress={handleCreateAllocation}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Xác nhận phân bổ</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </KeyboardAvoidingView>
            </Modal>
        </View >
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
    },
    modalBody: {
        flex: 1,
        padding: 16,
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
    formSection: {
        marginBottom: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
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
    typeContainer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    typeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        backgroundColor: "#FFFFFF",
    },
    typeButtonActive: {
        borderColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
    },
    typeButtonText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#6B7280",
    },
    typeButtonTextActive: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    helperText: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 8,
        fontStyle: "italic",
    },
    selectButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
        minHeight: 48,
    },
    selectButtonText: {
        fontSize: 16,
        color: "#1F2937",
        fontWeight: "500",
    },
    selectButtonPlaceholder: {
        color: "#9CA3AF",
    },
    clearSelectionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        alignSelf: "flex-start",
    },
    clearSelectionText: {
        fontSize: 14,
        color: "#EF4444",
        fontWeight: "500",
    },
    pickerModalOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    pickerModalContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        width: "90%",
        maxHeight: "70%",
        padding: 20,
    },
    pickerModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    pickerModalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    pickerLoadingContainer: {
        padding: 40,
        alignItems: "center",
    },
    pickerItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#F9FAFB",
    },
    pickerItemActive: {
        backgroundColor: "#EFF6FF",
    },
    pickerItemText: {
        fontSize: 16,
        color: "#1F2937",
    },
    pickerItemTextActive: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    pickerEmptyContainer: {
        padding: 40,
        alignItems: "center",
    },
    pickerEmptyText: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    filterContainer: {
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    filterContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    filterChipTextActive: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    permissionDeniedContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    permissionDeniedTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#EF4444",
        marginTop: 16,
        marginBottom: 8,
    },
    permissionDeniedMessage: {
        fontSize: 16,
        color: "#4B5563",
        textAlign: "center",
        marginBottom: 8,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 4,
        marginTop: 4,
    },
    expandButtonText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    detailLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 12,
        paddingVertical: 8,
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
    },
    detailLinkText: {
        fontSize: 13,
        color: '#3B82F6',
        fontWeight: '600',
    },
});
