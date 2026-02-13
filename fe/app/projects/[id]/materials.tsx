import React, { useState, useEffect, useCallback } from "react";
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
import { materialApi, Material } from "@/api/materialApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionGuard, CurrencyInput, PermissionDenied } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { DatePickerInput } from "@/components";
import { costGroupApi, CostGroup } from "@/api/costGroupApi";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Permissions } from "@/constants/Permissions";

export default function ProjectMaterialsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const { hasPermission } = useProjectPermissions(id);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);
    const [loadingAllMaterials, setLoadingAllMaterials] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [transactionData, setTransactionData] = useState({
        type: "out" as "out" | "adjustment",
        quantity: "",
        transaction_date: new Date(),
        notes: "",
        cost_group_id: null as number | null,
        amount: 0,
    });
    const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
    const [showCostGroupPicker, setShowCostGroupPicker] = useState(false);
    const [selectedCostGroup, setSelectedCostGroup] = useState<CostGroup | null>(null);
    const [batchItems, setBatchItems] = useState<{
        material: Material;
        quantity: string;
        amount: number;
        notes: string;
    }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");
    const [summary, setSummary] = useState({
        total_material_cost: 0,
        total_materials_count: 0
    });

    const loadMaterials = useCallback(async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            setPermissionMessage("");
            const response = await materialApi.getMaterialsByProject(id!, {
                search: searchQuery || undefined,
            });
            if (response.success) {
                setMaterials(response.data.data || []);
                if (response.summary) {
                    setSummary(response.summary);
                }
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem vật liệu của dự án này.");
                setMaterials([]);
            } else {
                const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải danh sách vật liệu";
                Alert.alert("Lỗi", errorMessage);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, searchQuery]);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    const loadAllMaterials = async () => {
        try {
            setLoadingAllMaterials(true);
            const response = await materialApi.getMaterials({ active_only: true });
            if (response.success) {
                const all = response.data.data || [];
                // Lọc ra các materials chưa có trong project
                const projectMaterialIds = materials.map(m => m.id);
                // Also load cost groups if not loaded
                if (costGroups.length === 0) {
                    loadCostGroups();
                }
                setAllMaterials(all.filter((m: Material) => !projectMaterialIds.includes(m.id)));
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải danh sách vật liệu";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoadingAllMaterials(false);
        }
    };

    const handleOpenAddModal = () => {
        setShowAddModal(true);
        loadAllMaterials();
        loadCostGroups();
    };

    const loadCostGroups = async () => {
        try {
            const response = await costGroupApi.getCostGroups({ active_only: true });
            if (response.success) {
                const data = response.data?.data ?? response.data ?? [];
                setCostGroups(Array.isArray(data) ? data : []);
            } else {
                setCostGroups([]);
            }
        } catch (error: any) {
            console.error("Error loading cost groups:", error);
            setCostGroups([]);
            if (error.response?.status === 403) {
                Alert.alert("Không có quyền", "Bạn không có quyền xem nhóm chi phí. Vui lòng liên hệ quản trị viên.");
            }
        }
    };

    const handleSelectMaterial = (material: Material) => {
        setSelectedMaterial(material);
        // Auto calculate amount if quantity exists
        if (transactionData.quantity && material.unit_price) {
            const qty = parseFloat(transactionData.quantity);
            if (!isNaN(qty)) {
                setTransactionData(prev => ({
                    ...prev,
                    amount: qty * material.unit_price!
                }));
            }
        } else if (material.unit_price) {
            // Default amount to 0 but we know the price
            setTransactionData(prev => ({
                ...prev,
                amount: 0
            }));
        }
    };

    const handleAddToBatch = () => {
        if (!selectedMaterial) {
            Alert.alert("Lỗi", "Vui lòng chọn vật liệu");
            return;
        }

        if (!transactionData.quantity || parseFloat(transactionData.quantity) <= 0) {
            Alert.alert("Lỗi", "Vui lòng nhập số lượng hợp lệ");
            return;
        }

        if (transactionData.amount <= 0) {
            Alert.alert("Lỗi", "Vui lòng nhập chi phí cho vật liệu");
            return;
        }

        const newItem = {
            material: selectedMaterial,
            quantity: transactionData.quantity,
            amount: transactionData.amount,
            notes: transactionData.notes,
        };

        setBatchItems([...batchItems, newItem]);
        setSelectedMaterial(null);
        setTransactionData({
            ...transactionData,
            quantity: "",
            notes: "",
            amount: 0,
        });
    };

    const handleRemoveFromBatch = (index: number) => {
        const newBatch = [...batchItems];
        newBatch.splice(index, 1);
        setBatchItems(newBatch);
    };

    const handleCreateBatchTransaction = async () => {
        if (batchItems.length === 0) {
            Alert.alert("Lỗi", "Danh sách vật liệu trống");
            return;
        }

        if (!transactionData.cost_group_id) {
            Alert.alert("Lỗi", "Vui lòng chọn nhóm chi phí");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                transaction_date: transactionData.transaction_date.toISOString().split("T")[0],
                cost_group_id: transactionData.cost_group_id,
                items: batchItems.map(item => ({
                    material_id: item.material.id,
                    quantity: parseFloat(item.quantity),
                    amount: item.amount,
                    notes: item.notes || undefined,
                })),
            };

            const response = await materialApi.createBatchTransactions(id!, payload);

            if (response.success) {
                Alert.alert("Thành công", "Đã ghi nhận sử dụng vật liệu và tự động sum tổng đẩy qua chi phí dự án để duyệt");
                setShowAddModal(false);
                setBatchItems([]);
                setSelectedMaterial(null);
                setSelectedCostGroup(null);
                setTransactionData({
                    type: "out",
                    quantity: "",
                    transaction_date: new Date(),
                    notes: "",
                    cost_group_id: null,
                    amount: 0,
                });
                loadMaterials();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tạo giao dịch batch";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const totalBatchAmount = batchItems.reduce((sum, item) => sum + item.amount, 0);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadMaterials();
    }, [loadMaterials]);

    const formatQuantity = (quantity: number, unit: string | undefined) => {
        const formattedQuantity = new Intl.NumberFormat("vi-VN").format(quantity);
        return unit ? `${formattedQuantity} ${unit}` : formattedQuantity;
    };

    const renderItem = ({ item }: { item: Material }) => {
        const projectUsage = (item as any).project_usage || 0;
        const projectTotalAmount = (item as any).project_total_amount || 0;
        const transactionsCount = (item as any).project_transactions_count || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/materials/${item.id}`)}
            >
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={styles.materialIcon}>
                            <Ionicons name="cube" size={20} color="#3B82F6" />
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                            {item.code && <Text style={styles.cardCode}>Mã: {item.code}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Sử dụng</Text>
                                <Text style={styles.statValue}>
                                    {new Intl.NumberFormat("vi-VN").format(Math.abs(projectUsage))} <Text style={styles.unitText}>{item.unit}</Text>
                                </Text>
                            </View>
                            <View style={[styles.statItem, styles.centerStat]}>
                                <Text style={styles.statLabel}>Lần dùng</Text>
                                <Text style={styles.statValue}>{transactionsCount}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Tổng tiền</Text>
                                <Text style={[styles.statValue, styles.costValue]}>
                                    {new Intl.NumberFormat("vi-VN").format(projectTotalAmount)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Vật Liệu Dự Án" showBackButton />
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
                <ScreenHeader title="Vật Liệu Dự Án" showBackButton />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Vật Tư Dự Án"
                showBackButton
                rightComponent={
                    <PermissionGuard permission={Permissions.MATERIAL_CREATE} projectId={id}>
                        <TouchableOpacity onPress={handleOpenAddModal} style={styles.addButton}>
                            <Ionicons name="add" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    </PermissionGuard>
                }
            />

            <PermissionGuard permission={Permissions.MATERIAL_VIEW} projectId={id}>
                <View style={styles.summaryDashboard}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Ionicons name="cart" size={24} color="#3B82F6" />
                        </View>
                        <View>
                            <Text style={styles.summaryLabel}>Vật liệu dùng</Text>
                            <Text style={styles.summaryValue}>{summary.total_materials_count}</Text>
                        </View>
                    </View>
                    <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
                        <View style={[styles.summaryIconContainer, styles.summaryIconContainerPrimary]}>
                            <Ionicons name="cash" size={24} color="#FFFFFF" />
                        </View>
                        <View>
                            <Text style={[styles.summaryLabel, styles.summaryLabelPrimary]}>Tổng chi phí</Text>
                            <Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
                                {new Intl.NumberFormat("vi-VN").format(summary.total_material_cost)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#6B7280" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm vật liệu trong dự án..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery !== "" && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                ) : (
                    <FlatList
                        data={materials}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyText}>
                                    {searchQuery
                                        ? "Không tìm thấy vật liệu phù hợp"
                                        : "Chưa có vật liệu nào được sử dụng trong dự án này"}
                                </Text>
                            </View>
                        }
                    />
                )}
            </PermissionGuard>

            {/* Add Material Modal */}
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
                        <Text style={styles.modalTitle}>Thêm Vật Liệu</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {!selectedMaterial ? (
                        <View style={styles.modalBody}>
                            <Text style={styles.sectionTitle}>Chọn vật liệu</Text>
                            {loadingAllMaterials ? (
                                <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
                            ) : (
                                <FlatList
                                    data={allMaterials}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.materialOption}
                                            onPress={() => handleSelectMaterial(item)}
                                        >
                                            <View style={styles.materialOptionInfo}>
                                                <Text style={styles.materialOptionName}>{item.name}</Text>
                                                {item.code && (
                                                    <Text style={styles.materialOptionCode}>{item.code}</Text>
                                                )}
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    )}
                                    keyExtractor={(item) => item.id.toString()}
                                    ListEmptyComponent={
                                        <Text style={styles.emptyText}>Không còn vật liệu nào để thêm</Text>
                                    }
                                    style={{ flex: 1 }}
                                />
                            )}
                        </View>
                    ) : (
                        <ScrollView style={styles.modalBody} nestedScrollEnabled={true}>
                            <View style={styles.selectedMaterialCard}>
                                <View style={styles.selectedMaterialHeader}>
                                    <Text style={styles.selectedMaterialName}>{selectedMaterial.name}</Text>
                                    <TouchableOpacity onPress={() => setSelectedMaterial(null)}>
                                        <Ionicons name="close-circle" size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>Thông tin ghi nhận</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>
                                    Số lượng{selectedMaterial.unit ? ` (${selectedMaterial.unit})` : ""}
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={transactionData.quantity}
                                    onChangeText={(text) => {
                                        const qty = parseFloat(text);
                                        const amount = !isNaN(qty) && selectedMaterial.unit_price
                                            ? qty * selectedMaterial.unit_price
                                            : transactionData.amount;
                                        setTransactionData({
                                            ...transactionData,
                                            quantity: text,
                                            amount: amount
                                        });
                                    }}
                                    placeholder="Nhập số lượng"
                                    keyboardType="decimal-pad"
                                />
                                {selectedMaterial.unit_price ? (
                                    <Text style={styles.helperText}>
                                        Đơn giá niêm yết: {new Intl.NumberFormat("vi-VN").format(selectedMaterial.unit_price)} đ/{selectedMaterial.unit}
                                    </Text>
                                ) : (
                                    <Text style={[styles.helperText, { color: '#EF4444' }]}>
                                        Chưa có đơn giá niêm yết. Vui lòng nhập tổng chi phí.
                                    </Text>
                                )}
                            </View>


                            <CurrencyInput
                                label="Chi phí (VNĐ) *"
                                value={transactionData.amount}
                                onChangeText={(amount) => setTransactionData({ ...transactionData, amount })}
                                placeholder="Nhập chi phí cho vật liệu"
                                helperText={selectedMaterial.unit_price ? "Tự động tính theo đơn giá niêm yết" : "Số tiền sẽ được đẩy qua chi phí dự án"}
                                editable={!selectedMaterial.unit_price}
                                style={selectedMaterial.unit_price ? { backgroundColor: '#F3F4F6' } : {}}
                            />

                            <DatePickerInput
                                label="Ngày giao dịch"
                                value={transactionData.transaction_date}
                                onChange={(date) => {
                                    if (date) {
                                        setTransactionData({ ...transactionData, transaction_date: date });
                                    }
                                }}
                                placeholder="Chọn ngày"
                            />

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ghi chú</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={transactionData.notes}
                                    onChangeText={(text) => setTransactionData({ ...transactionData, notes: text })}
                                    placeholder="Nhập ghi chú (tùy chọn)"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.addToBatchButton, submitting && styles.submitButtonDisabled]}
                                onPress={handleAddToBatch}
                                disabled={submitting}
                            >
                                <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
                                <Text style={styles.addToBatchButtonText}>Thêm vào danh sách</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                    {/* Batch Items List */}
                    {batchItems.length > 0 && (
                        <View style={styles.batchSection}>
                            <View style={styles.batchHeader}>
                                <Text style={styles.batchTitle}>Danh sách chờ ({batchItems.length})</Text>
                                <TouchableOpacity onPress={() => setBatchItems([])}>
                                    <Text style={styles.clearBatchText}>Xóa tất cả</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={[styles.batchList, { maxHeight: 200 }]}>
                                {batchItems.map((item, index) => (
                                    <View key={index} style={styles.batchItem}>
                                        <View style={styles.batchItemInfo}>
                                            <Text style={styles.batchItemName}>{item.material.name}</Text>
                                            <Text style={styles.batchItemDetail}>
                                                Qty: {item.quantity} {item.material.unit} - {new Intl.NumberFormat('vi-VN').format(item.amount)} đ
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveFromBatch(index)}>
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>

                            <View style={styles.batchFooter}>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Nhóm chi phí (cho cả đợt nhập) *</Text>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setShowCostGroupPicker(true)}
                                    >
                                        <Text
                                            style={[
                                                styles.selectButtonText,
                                                !selectedCostGroup && styles.selectButtonPlaceholder,
                                            ]}
                                        >
                                            {selectedCostGroup ? selectedCostGroup.name : "Chọn nhóm chi phí"}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Tổng cộng:</Text>
                                    <Text style={styles.totalValue}>{new Intl.NumberFormat('vi-VN').format(totalBatchAmount)} VNĐ</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBatchButton, submitting && styles.submitButtonDisabled]}
                                    onPress={handleCreateBatchTransaction}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
                                            <Text style={styles.submitBatchButtonText}>Xác nhận & Đẩy qua chi phí</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Cost Group Picker - Overlay bên trong Modal để tránh lỗi nested modals */}
                    {showCostGroupPicker && (
                        <View style={styles.pickerOverlay} pointerEvents="box-none">
                            <TouchableOpacity
                                style={styles.pickerOverlayBackdrop}
                                activeOpacity={1}
                                onPress={() => setShowCostGroupPicker(false)}
                            />
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
                                                setTransactionData({ ...transactionData, cost_group_id: item.id });
                                                setShowCostGroupPicker(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.pickerItemText}>{item.name}</Text>
                                            {selectedCostGroup?.id === item.id && (
                                                <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.pickerEmpty}>
                                            <Ionicons name="folder-open-outline" size={40} color="#D1D5DB" />
                                            <Text style={styles.pickerEmptyText}>Chưa có nhóm chi phí</Text>
                                            <Text style={styles.pickerEmptySubtext}>
                                                Tạo nhóm chi phí trong Cài đặt → Nhóm chi phí
                                            </Text>
                                        </View>
                                    }
                                />
                            </View>
                        </View>
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
    stockBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    stockText: {
        fontSize: 12,
        fontWeight: "600",
    },
    cardBody: {
        gap: 8,
    },
    infoRow: {
        marginBottom: 4,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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
    usageValue: {
        color: "#3B82F6",
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
    materialOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    materialOptionInfo: {
        flex: 1,
    },
    materialOptionName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    materialOptionCode: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 4,
    },
    materialOptionStock: {
        fontSize: 14,
        color: "#6B7280",
    },
    selectedMaterialCard: {
        backgroundColor: "#EFF6FF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderLeftWidth: 3,
        borderLeftColor: "#3B82F6",
    },
    selectedMaterialHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    selectedMaterialName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    selectedMaterialInfo: {
        fontSize: 14,
        color: "#6B7280",
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
    addToBatchButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EFF6FF",
        padding: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: "#3B82F6",
        marginTop: 16,
    },
    addToBatchButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#3B82F6",
    },
    batchSection: {
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        padding: 16,
    },
    batchHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    batchTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    clearBatchText: {
        fontSize: 14,
        color: "#EF4444",
        fontWeight: "500",
    },
    batchList: {
        marginBottom: 16,
    },
    batchItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    batchItemInfo: {
        flex: 1,
    },
    batchItemName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 2,
    },
    batchItemDetail: {
        fontSize: 12,
        color: "#6B7280",
    },
    batchFooter: {
        gap: 16,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
    },
    totalValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#EF4444",
    },
    submitBatchButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitBatchButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    typeButtons: {
        flexDirection: "row",
        gap: 12,
    },
    typeButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
    },
    typeButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    typeButtonTextActive: {
        color: "#FFFFFF",
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
    pickerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "flex-end",
        zIndex: 1000,
    },
    pickerOverlayBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    pickerContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "70%",
        paddingBottom: 24,
        zIndex: 1001,
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
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
        borderBottomColor: "#F3F4F6",
    },
    pickerItemText: {
        fontSize: 16,
        color: "#1F2937",
    },
    pickerEmpty: {
        padding: 32,
        alignItems: "center",
    },
    pickerEmptyText: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    pickerEmptySubtext: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 8,
        textAlign: "center",
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
    helperText: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
    },
    helperTextInline: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "400",
    },
    permissionDeniedContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    permissionDeniedTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
        marginTop: 24,
        marginBottom: 8,
    },
    permissionDeniedMessage: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 8,
        lineHeight: 24,
    },
    permissionDeniedSubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    summaryDashboard: {
        flexDirection: "row",
        padding: 16,
        gap: 12,
        backgroundColor: "#FFFFFF",
    },
    summaryCard: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        padding: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    summaryCardPrimary: {
        backgroundColor: "#3B82F6",
    },
    summaryIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E0E7FF",
        justifyContent: "center",
        alignItems: "center",
    },
    summaryIconContainerPrimary: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    summaryLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 2,
    },
    summaryLabelPrimary: {
        color: "rgba(255, 255, 255, 0.8)",
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    summaryValuePrimary: {
        color: "#FFFFFF",
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#1F2937",
    },
    cardContent: {
        padding: 16,
    },
    materialIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    statItem: {
        flex: 1,
    },
    centerStat: {
        alignItems: "center",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "#F3F4F6",
    },
    statLabel: {
        fontSize: 11,
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    unitText: {
        fontSize: 12,
        color: "#9CA3AF",
        fontWeight: "400",
    },
    costValue: {
        color: "#10B981",
        textAlign: "right",
    },
});
