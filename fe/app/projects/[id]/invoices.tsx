import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
    AlertButton,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { invoiceApi, Invoice, CreateInvoiceData, CostGroupSummary } from "@/api/invoiceApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, CurrencyInput, UniversalFileUploader, PermissionDenied, PermissionGuard } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";
import api from "@/api/api";

export default function InvoicesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateInvoiceData>>({
        invoice_date: new Date().toISOString().split("T")[0],
        cost_group_id: undefined,
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        description: "",
        notes: "",
        attachment_ids: [],
    });
    const [costGroups, setCostGroups] = useState<any[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportData, setReportData] = useState<CostGroupSummary[]>([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const { hasPermission, loading: loadingPermissions } = useProjectPermissions(id!);
    const canCreate = hasPermission(Permissions.INVOICE_CREATE);
    const canView = hasPermission(Permissions.INVOICE_VIEW);

    useEffect(() => {
        loadInvoices();
        if (canCreate) {
            loadCostGroups();
        }
    }, [id, canCreate]);

    // Reload data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadInvoices();
        }, [id])
    );

    const loadInvoices = async () => {
        try {
            setLoading(true);
            setPermissionDenied(false);
            setPermissionMessage("");
            const response = await invoiceApi.getInvoices(Number(id));
            if (response.success) {
                setInvoices(response.data.data || []);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem hóa đơn của dự án này.");
                setInvoices([]);
            } else {
                console.error("Error loading invoices:", error);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadCostGroups = async () => {
        try {
            const response = await api.get("/settings/cost-groups?active_only=true");
            if (response.data.success) {
                const data = response.data.data;
                // Handle both paginated and non-paginated responses
                setCostGroups(Array.isArray(data) ? data : (data?.data || []));
            }
        } catch (error: any) {
            // Silence 403 errors as they are expected for some users
            if (error.response?.status !== 403) {
                console.error("Error loading cost groups:", error);
            }
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInvoices();
    };

    const handleShowReport = async () => {
        setShowReportModal(true);
        setLoadingReport(true);
        try {
            const response = await invoiceApi.getSummaryByCostGroup(Number(id));
            if (response.success) {
                setReportData(response.data || []);
            }
        } catch (error) {
            Alert.alert("Lỗi", "Không thể tải báo cáo");
        } finally {
            setLoadingReport(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.invoice_date || !formData.subtotal || !formData.cost_group_id) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc (Ngày, Danh mục, Số tiền)");
            return;
        }

        try {
            setSubmitting(true);
            // Extract attachment IDs from uploaded files
            const attachmentIds = uploadedFiles
                .filter(f => f.attachment_id || f.id)
                .map(f => f.attachment_id || f.id);

            const dataToSubmit = {
                ...formData,
                attachment_ids: attachmentIds,
            };

            const response = await invoiceApi.createInvoice(Number(id), dataToSubmit as CreateInvoiceData);
            if (response.success) {
                Alert.alert("Thành công", "Đã tạo hóa đơn thành công");
                setShowCreateModal(false);
                resetForm();
                setUploadedFiles([]);
                loadInvoices();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo hóa đơn");
        } finally {
            setSubmitting(false);
        }
    };



    const resetForm = () => {
        setFormData({
            invoice_date: new Date().toISOString().split("T")[0],
            cost_group_id: undefined,
            subtotal: 0,
            tax_amount: 0,
            discount_amount: 0,
            description: "",
            notes: "",
            attachment_ids: [],
        });
        setUploadedFiles([]);
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return "0 VNĐ";
        }
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };



    const renderItem = ({ item }: { item: Invoice }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/projects/${id}/invoices/${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{item.invoice_number || `HĐ #${item.id}`}</Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.invoice_date).toLocaleDateString("vi-VN")}
                    </Text>
                </View>
                {item.cost_group && (
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.cost_group.name}</Text>
                    </View>
                )}
            </View>
            <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
            {item.attachments && item.attachments.length > 0 && (
                <View style={styles.attachmentInfo}>
                    <Ionicons name="attach" size={14} color="#6B7280" />
                    <Text style={styles.attachmentText}>
                        {item.attachments.length} file đính kèm
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading || loadingPermissions) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Hóa Đơn" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (!canView || permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Hóa Đơn" showBackButton />
                <PermissionDenied
                    message={permissionMessage || "Bạn không có quyền xem hóa đơn của dự án này."}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Hóa Đơn"
                showBackButton
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleShowReport}
                        >
                            <Ionicons name="stats-chart" size={24} color="#3B82F6" />
                        </TouchableOpacity>

                        {canCreate && (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => {
                                    resetForm();
                                    setShowCreateModal(true);
                                }}
                            >
                                <Ionicons name="add" size={24} color="#3B82F6" />
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            <FlatList
                data={invoices}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: tabBarHeight }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
                        <Text style={styles.emptyText}>Chưa có hóa đơn</Text>
                    </View>
                }
            />

            {/* Create Invoice Modal - only accessible if canCreate is true */}
            {canCreate && (
                <Modal
                    visible={showCreateModal}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={() => setShowCreateModal(false)}
                >
                    <KeyboardAvoidingView
                        style={styles.modalContainer}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Tạo Hóa Đơn</Text>
                                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                    <Ionicons name="close" size={24} color="#1F2937" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.modalBody}
                                contentContainerStyle={styles.modalBodyContent}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                            >
                                <DatePickerInput
                                    label="Ngày hóa đơn *"
                                    value={formData.invoice_date}
                                    onDateChange={(date) => {
                                        setFormData({
                                            ...formData,
                                            invoice_date: date,
                                        });
                                    }}
                                    placeholder="Chọn ngày"
                                    required
                                />

                                {/* Cost Group Selector */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Danh mục chi phí *</Text>
                                    <View style={styles.pickerContainer}>
                                        <TouchableOpacity
                                            style={styles.pickerButton}
                                            onPress={() => {
                                                Alert.alert(
                                                    "Chọn danh mục",
                                                    "",
                                                    costGroups.map(cg => ({
                                                        text: cg.name,
                                                        onPress: () => setFormData({ ...formData, cost_group_id: cg.id })
                                                    } as any)).concat([{ text: "Hủy", onPress: () => { }, style: "cancel" }])
                                                );
                                            }}
                                        >
                                            <Text style={formData.cost_group_id ? styles.pickerText : styles.pickerPlaceholder}>
                                                {formData.cost_group_id
                                                    ? costGroups.find(cg => cg.id === formData.cost_group_id)?.name
                                                    : "Chọn danh mục"}
                                            </Text>
                                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <CurrencyInput
                                    label="Tổng tiền (chưa VAT) *"
                                    value={formData.subtotal || 0}
                                    onChangeText={(amount) =>
                                        setFormData({ ...formData, subtotal: amount })
                                    }
                                    placeholder="0"
                                />

                                <CurrencyInput
                                    label="VAT"
                                    value={formData.tax_amount || 0}
                                    onChangeText={(amount) =>
                                        setFormData({ ...formData, tax_amount: amount })
                                    }
                                    placeholder="0"
                                />

                                <CurrencyInput
                                    label="Giảm giá"
                                    value={formData.discount_amount || 0}
                                    onChangeText={(amount) =>
                                        setFormData({ ...formData, discount_amount: amount })
                                    }
                                    placeholder="0"
                                />

                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Mô tả</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Nhập mô tả"
                                        value={formData.description}
                                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>

                                {/* File Upload */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Chứng từ đính kèm</Text>
                                    <UniversalFileUploader
                                        onUploadComplete={(files) => setUploadedFiles(files)}
                                        multiple={true}
                                        accept="all"
                                        maxFiles={10}
                                        initialFiles={uploadedFiles}
                                        label="Chọn file chứng từ"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                    onPress={handleCreate}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Tạo Hóa Đơn</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            )}

            {/* Report Modal */}
            <Modal
                visible={showReportModal}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowReportModal(false)}
            >
                <View style={styles.reportModalContainer}>
                    <ScreenHeader
                        title="Thống Kê Chi Phí"
                        showBackButton={true}
                        onBackPress={() => setShowReportModal(false)}
                    />

                    {loadingReport ? (
                        <View style={styles.reportLoadingContainer}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                            <Text style={styles.loadingText}>Đang tổng hợp dữ liệu...</Text>
                        </View>
                    ) : reportData.length > 0 ? (
                        <ScrollView
                            style={styles.reportScrollView}
                            contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
                        >
                            {/* Summary Card */}
                            <View style={styles.reportSummaryCard}>
                                <View style={styles.reportSummaryHeader}>
                                    <View style={styles.reportSummaryIcon}>
                                        <Ionicons name="calculator" size={24} color="#3B82F6" />
                                    </View>
                                    <View>
                                        <Text style={styles.reportSummaryLabel}>Tổng chi phí hóa đơn</Text>
                                        <Text style={styles.reportSummaryValue}>
                                            {formatCurrency(reportData.reduce((sum, item) => sum + Number(item.total_amount), 0))}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.reportSummarySubtext}>
                                    Dựa trên {reportData.reduce((sum, item) => sum + Number(item.invoice_count || 0), 0)} hóa đơn đã ghi nhận
                                </Text>
                            </View>

                            <Text style={styles.reportSectionTitle}>Chi phí theo danh mục</Text>

                            <View style={styles.reportList}>
                                {(() => {
                                    const total = reportData.reduce((sum, item) => sum + Number(item.total_amount), 0);
                                    return reportData.map((item, index) => {
                                        const amount = Number(item.total_amount);
                                        const percentage = total > 0 ? (amount / total) * 100 : 0;
                                        // Generate a color based on index for variety
                                        const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
                                        const color = colors[index % colors.length];

                                        return (
                                            <View key={item.cost_group_id || index} style={styles.reportItem}>
                                                <View style={styles.reportItemHeader}>
                                                    <View style={styles.reportItemLabelGroup}>
                                                        <View style={[styles.reportColorDot, { backgroundColor: color }]} />
                                                        <Text style={styles.reportItemLabel} numberOfLines={1}>
                                                            {item.cost_group?.name || "Chưa phân loại"}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.reportItemValue}>{formatCurrency(amount)}</Text>
                                                </View>
                                                <View style={styles.progressBarBg}>
                                                    <View
                                                        style={[
                                                            styles.progressBarFill,
                                                            { width: `${percentage}%`, backgroundColor: color }
                                                        ]}
                                                    />
                                                </View>
                                                <View style={styles.reportItemFooter}>
                                                    <Text style={styles.reportItemPercentage}>{percentage.toFixed(1)}%</Text>
                                                    <Text style={styles.reportItemCount}>{item.invoice_count || 0} hóa đơn</Text>
                                                </View>
                                            </View>
                                        );
                                    });
                                })()}
                            </View>
                        </ScrollView>
                    ) : (
                        <View style={styles.reportEmptyContainer}>
                            <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.reportEmptyText}>Chưa có dữ liệu thống kê chi phí cho dự án này</Text>
                        </View>
                    )}
                </View>
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
    },
    addButton: {
        padding: 4,
    },
    card: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
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
        marginBottom: 8,
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
    cardDate: {
        fontSize: 13,
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
    amountText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#3B82F6",
        marginTop: 8,
    },
    dueDateText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    cardActions: {
        flexDirection: "row",
        marginTop: 12,
        gap: 12,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
    },
    actionText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "500",
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
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        paddingTop: 40,
    },
    modalContent: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalBody: {
        flex: 1,
    },
    modalBodyContent: {
        paddingBottom: Platform.OS === "ios" ? 100 : 80,
        paddingHorizontal: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        backgroundColor: "#FFFFFF",
        color: "#1F2937",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        padding: 20,
    },
    reportModalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    reportLoadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: "#6B7280",
    },
    reportScrollView: {
        flex: 1,
    },
    reportSummaryCard: {
        backgroundColor: "#FFFFFF",
        margin: 16,
        padding: 20,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    reportSummaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    reportSummaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    reportSummaryLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    reportSummaryValue: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1F2937",
    },
    reportSummarySubtext: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 16,
        fontStyle: "italic",
    },
    reportSectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginHorizontal: 16,
        marginBottom: 12,
        marginTop: 8,
    },
    reportList: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    reportItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    reportItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    reportItemLabelGroup: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 12,
    },
    reportColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    reportItemLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    reportItemValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
    },
    reportItemFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    reportItemPercentage: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6B7280",
    },
    reportItemCount: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    progressBarBg: {
        height: 8,
        backgroundColor: "#F3F4F6",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    reportEmptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    reportEmptyText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 16,
        lineHeight: 24,
    },

    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
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
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: "#EEF2FF",
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#4F46E5",
    },
    attachmentInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        gap: 4,
    },
    attachmentText: {
        fontSize: 13,
        color: "#6B7280",
    },
    pickerContainer: {
        marginBottom: 0,
    },
    pickerButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
    },
    pickerText: {
        fontSize: 14,
        color: "#1F2937",
    },
    pickerPlaceholder: {
        fontSize: 14,
        color: "#9CA3AF",
    },
});

