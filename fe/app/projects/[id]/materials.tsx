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
import { materialApi, Material } from "@/api/materialApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ProjectMaterialsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);
    const [loadingAllMaterials, setLoadingAllMaterials] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [transactionData, setTransactionData] = useState({
        type: "out" as "in" | "out" | "adjustment",
        quantity: "",
        transaction_date: new Date(),
        notes: "",
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadMaterials();
    }, [id, searchQuery]);

    const loadMaterials = async () => {
        try {
            setLoading(true);
            const response = await materialApi.getMaterialsByProject(id!, {
                search: searchQuery || undefined,
            });
            if (response.success) {
                setMaterials(response.data.data || []);
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải danh sách vật liệu";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadAllMaterials = async () => {
        try {
            setLoadingAllMaterials(true);
            const response = await materialApi.getMaterials({ active_only: true });
            if (response.success) {
                const all = response.data.data || [];
                // Lọc ra các materials chưa có trong project
                const projectMaterialIds = materials.map(m => m.id);
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
    };

    const handleSelectMaterial = (material: Material) => {
        setSelectedMaterial(material);
    };

    const handleCreateTransaction = async () => {
        if (!selectedMaterial) {
            Alert.alert("Lỗi", "Vui lòng chọn vật liệu");
            return;
        }

        if (!transactionData.quantity || parseFloat(transactionData.quantity) <= 0) {
            Alert.alert("Lỗi", "Vui lòng nhập số lượng hợp lệ");
            return;
        }

        try {
            setSubmitting(true);
            const response = await materialApi.createTransaction(id!, {
                material_id: selectedMaterial.id,
                type: transactionData.type,
                quantity: parseFloat(transactionData.quantity),
                transaction_date: transactionData.transaction_date.toISOString().split("T")[0],
                notes: transactionData.notes || undefined,
            });

            if (response.success) {
                Alert.alert("Thành công", "Đã thêm vật liệu vào dự án");
                setShowAddModal(false);
                setSelectedMaterial(null);
                setTransactionData({
                    type: "out",
                    quantity: "",
                    transaction_date: new Date(),
                    notes: "",
                });
                loadMaterials();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tạo giao dịch";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadMaterials();
    };

    const formatQuantity = (quantity: number, unit: string) => {
        return `${new Intl.NumberFormat("vi-VN").format(quantity)} ${unit}`;
    };

    const getStockStatus = (material: Material) => {
        if (material.current_stock <= material.min_stock_level) {
            return { color: "#EF4444", text: "Thấp" };
        }
        return { color: "#10B981", text: "Đủ" };
    };

    const renderItem = ({ item }: { item: Material }) => {
        const stockStatus = getStockStatus(item);
        const projectUsage = (item as any).project_usage || 0;
        const transactionsCount = (item as any).project_transactions_count || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/materials/${item.id}`)}
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
                            styles.stockBadge,
                            { backgroundColor: stockStatus.color + "20" },
                        ]}
                    >
                        <Text style={[styles.stockText, { color: stockStatus.color }]}>
                            {stockStatus.text}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="cube-outline" size={16} color="#6B7280" />
                            <Text style={styles.infoLabel}>Tồn kho:</Text>
                            <Text style={styles.infoValue}>
                                {formatQuantity(item.current_stock, item.unit)}
                            </Text>
                        </View>
                    </View>

                    {projectUsage !== 0 && (
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Ionicons name="arrow-forward-outline" size={16} color="#3B82F6" />
                                <Text style={styles.infoLabel}>Đã sử dụng:</Text>
                                <Text style={[styles.infoValue, styles.usageValue]}>
                                    {formatQuantity(Math.abs(projectUsage), item.unit)}
                                </Text>
                            </View>
                        </View>
                    )}

                    {transactionsCount > 0 && (
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Ionicons name="swap-horizontal-outline" size={16} color="#6B7280" />
                                <Text style={styles.infoLabel}>Số giao dịch:</Text>
                                <Text style={styles.infoValue}>{transactionsCount}</Text>
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
                title="Vật Liệu Dự Án"
                showBackButton
                rightComponent={
                    <TouchableOpacity onPress={handleOpenAddModal} style={styles.addButton}>
                        <Ionicons name="add" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={materials}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
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
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
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
                                                <Text style={styles.materialOptionStock}>
                                                    Tồn kho: {formatQuantity(item.current_stock, item.unit)}
                                                </Text>
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
                                <Text style={styles.selectedMaterialInfo}>
                                    Tồn kho: {formatQuantity(selectedMaterial.current_stock, selectedMaterial.unit)}
                                </Text>
                            </View>

                            <Text style={styles.sectionTitle}>Thông tin giao dịch</Text>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Loại giao dịch</Text>
                                <View style={styles.typeButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            transactionData.type === "out" && styles.typeButtonActive,
                                        ]}
                                        onPress={() => setTransactionData({ ...transactionData, type: "out" })}
                                    >
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                transactionData.type === "out" && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Xuất kho
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            transactionData.type === "in" && styles.typeButtonActive,
                                        ]}
                                        onPress={() => setTransactionData({ ...transactionData, type: "in" })}
                                    >
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                transactionData.type === "in" && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Nhập kho
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Số lượng ({selectedMaterial.unit})</Text>
                                <TextInput
                                    style={styles.input}
                                    value={transactionData.quantity}
                                    onChangeText={(text) => setTransactionData({ ...transactionData, quantity: text })}
                                    placeholder="Nhập số lượng"
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày giao dịch</Text>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.dateButtonText}>
                                        {transactionData.transaction_date.toLocaleDateString("vi-VN")}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={transactionData.transaction_date}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowDatePicker(false);
                                            if (date) {
                                                setTransactionData({ ...transactionData, transaction_date: date });
                                            }
                                        }}
                                    />
                                )}
                            </View>

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
                                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                onPress={handleCreateTransaction}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Thêm vào dự án</Text>
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
});
