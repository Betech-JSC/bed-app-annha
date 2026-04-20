import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    RefreshControl,
    Modal,
    TextInput,
    Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { materialBillApi, MaterialBill } from "@/api/materialBillApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function MaterialBillDetailScreen() {
    const router = useRouter();
    const { id, billId } = useLocalSearchParams<{ id: string, billId: string }>();
    const tabBarHeight = useTabBarHeight();
    const [bill, setBill] = useState<MaterialBill | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Reject Modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const loadBill = useCallback(async () => {
        try {
            setLoading(true);
            const response = await materialBillApi.getBill(id!, billId!);
            if (response.success) {
                setBill(response.data);
            }
        } catch (error) {
            console.error("Error loading bill:", error);
            Alert.alert("Lỗi", "Không thể tải thông tin hóa đơn.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, billId]);

    useFocusEffect(
        useCallback(() => {
            loadBill();
        }, [loadBill])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadBill();
    };

    const handleAction = async (action: string) => {
        try {
            setSubmitting(true);
            let response;
            switch (action) {
                case 'submit':
                    response = await materialBillApi.submitBill(id!, billId!);
                    break;
                case 'approve_management':
                    response = await materialBillApi.approveManagement(id!, billId!);
                    break;
                case 'approve_accountant':
                    response = await materialBillApi.approveAccountant(id!, billId!);
                    break;
                case 'revert':
                    Alert.alert(
                        "Xác nhận hoàn duyệt",
                        "Bạn có chắc chắn muốn đưa hóa đơn này về trạng thái nháp?",
                        [
                            { text: "Hủy", style: "cancel" },
                            {
                                text: "Hoàn duyệt",
                                style: "destructive",
                                onPress: async () => {
                                    try {
                                        setSubmitting(true);
                                        const res = await materialBillApi.revertToDraft(id!, billId!);
                                        if (res.success) {
                                            Alert.alert("Thành công", res.message || "Đã đưa hóa đơn về trạng thái nháp.");
                                            loadBill();
                                        }
                                    } catch (error: any) {
                                        Alert.alert("Lỗi", error.response?.data?.message || "Không thể hoàn duyệt.");
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }
                            }
                        ]
                    );
                    return;
                case 'delete':
                    Alert.alert(
                        "Xác nhận",
                        "Bạn có chắc muốn xóa hóa đơn này?",
                        [
                            { text: "Hủy", style: "cancel" },
                            {
                                text: "Xóa",
                                style: "destructive",
                                onPress: async () => {
                                    const res = await materialBillApi.deleteBill(id!, billId!);
                                    if (res.success) {
                                        Alert.alert("Thành công", "Đã xóa hóa đơn.");
                                        router.back();
                                    }
                                }
                            }
                        ]
                    );
                    return;
            }

            if (response && response.success) {
                Alert.alert("Thành công", response.message);
                loadBill();
            }
        } catch (error: any) {
            console.error(`Error during ${action}:`, error);
            Alert.alert("Lỗi", error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối.");

        try {
            setSubmitting(true);
            const response = await materialBillApi.rejectBill(id!, billId!, rejectReason);
            if (response.success) {
                Alert.alert("Thành công", "Đã từ chối hóa đơn.");
                setShowRejectModal(false);
                loadBill();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối hóa đơn.");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusInfo = (status: MaterialBill['status']) => {
        switch (status) {
            case 'draft': return { label: 'Nháp', color: '#6B7280', bg: '#F3F4F6' };
            case 'pending_management': return { label: 'Chờ BĐH', color: '#F59E0B', bg: '#FEF3C7' };
            case 'pending_accountant': return { label: 'Chờ Kế Toán', color: '#3B82F6', bg: '#DBEAFE' };
            case 'approved': return { label: 'Đã Duyệt (Hoàn thành)', color: '#10B981', bg: '#D1FAE5' };
            case 'rejected': return { label: 'Từ Chối', color: '#EF4444', bg: '#FEE2E2' };
            default: return { label: status, color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi Tiết Hóa Đơn" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (!bill) return null;

    const { label, color, bg } = getStatusInfo(bill.status);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Chi Tiết Hóa Đơn" showBackButton />

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Information */}
                <View style={styles.section}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                            <Text style={[styles.statusText, { color }]}>{label}</Text>
                        </View>
                        <Text style={styles.createdAt}>Tạo ngày: {new Date(bill.created_at).toLocaleDateString("vi-VN")}</Text>
                    </View>

                    <Text style={styles.billTitle}>
                        {bill.bill_number ? `Số hóa đơn: ${bill.bill_number}` : `Hóa đơn mã #${bill.id}`}
                    </Text>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Nhà cung cấp</Text>
                            <Text style={styles.infoValue}>{bill.supplier?.name}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Nhóm chi phí</Text>
                            <Text style={styles.infoValue}>{bill.cost_group?.name}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Ngày hóa đơn</Text>
                            <Text style={styles.infoValue}>{new Date(bill.bill_date).toLocaleDateString("vi-VN")}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Người tạo</Text>
                            <Text style={styles.infoValue}>{bill.creator?.name}</Text>
                        </View>
                    </View>

                    {bill.notes && (
                        <View style={styles.notesBox}>
                            <Text style={styles.infoLabel}>Ghi chú</Text>
                            <Text style={styles.notesText}>{bill.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Items List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Danh sách vật liệu ({bill.items?.length})</Text>
                    {bill.items?.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.material?.name}</Text>
                                <Text style={styles.itemMeta}>
                                    {item.quantity} {item.material?.unit} x {formatCurrency(item.unit_price)}
                                </Text>
                            </View>
                            <Text style={styles.itemTotal}>{formatCurrency(item.total_price || 0)}</Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
                        <Text style={styles.totalValue}>{formatCurrency(bill.total_amount)}</Text>
                    </View>
                </View>
                
                {/* Attachments Section */}
                {bill.attachments && bill.attachments.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Hình ảnh/Chứng từ ({bill.attachments.length})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentList}>
                            {bill.attachments.map((file, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={styles.attachmentItem}
                                    onPress={() => {
                                        const url = file.file_url;
                                        if (url) {
                                            // Handle preview
                                            Alert.alert("Chứng từ", "Bạn muốn xem file này?", [
                                                { text: "Hủy", style: "cancel" },
                                                { text: "Xem", onPress: () => { /* Logic */ } }
                                            ]);
                                        }
                                    }}
                                >
                                    <Image 
                                        source={{ uri: file.file_url }} 
                                        style={styles.attachmentThumbnail} 
                                    />
                                    <Text style={styles.attachmentName} numberOfLines={1}>
                                        {file.original_name || 'Hinh_anh'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Approval History */}
                {(bill.management_approved_by || bill.accountant_approved_by || bill.status === 'rejected') && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Lịch sử phê duyệt</Text>
                        {bill.management_approved_by && (
                            <View style={styles.historyRow}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <View>
                                    <Text style={styles.historyText}>Ban Điều Hành đã duyệt</Text>
                                    <Text style={styles.historySub}>{bill.management_approver?.name} • {new Date(bill.management_approved_at!).toLocaleString("vi-VN")}</Text>
                                </View>
                            </View>
                        )}
                        {bill.accountant_approved_by && (
                            <View style={styles.historyRow}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <View>
                                    <Text style={styles.historyText}>Kế toán đã xác nhận</Text>
                                    <Text style={styles.historySub}>{bill.accountant_approver?.name} • {new Date(bill.accountant_approved_at!).toLocaleString("vi-VN")}</Text>
                                </View>
                            </View>
                        )}
                        {bill.status === 'rejected' && (
                            <View style={styles.historyRow}>
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                                <View>
                                    <Text style={styles.historyText}>Đã bị từ chối</Text>
                                    <Text style={[styles.historySub, { color: '#EF4444' }]}>Lý do: {bill.rejected_reason}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Payment Button for approved bills */}
                {bill.status === 'approved' && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.paymentButton}
                            onPress={() => {
                                router.push({
                                    pathname: `/projects/${id}/costs`,
                                    params: { 
                                        defaultCostGroup: 'material',
                                        fromBill: billId,
                                        billAmount: bill.total_amount?.toString(),
                                    }
                                });
                            }}
                        >
                            <View style={styles.paymentButtonInner}>
                                <View style={styles.paymentIconContainer}>
                                    <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.paymentButtonTitle}>Thanh toán</Text>
                                    <Text style={styles.paymentButtonSub}>Chuyển qua tab chi phí để tạo phiếu thanh toán</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: tabBarHeight + 120 }} />
            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.actionBar, { paddingBottom: Math.max(tabBarHeight, 20) }]}>
                {bill.status === 'draft' && (
                    <>
                        <PermissionGuard permission={Permissions.MATERIAL_UPDATE} projectId={id}>
                            <TouchableOpacity
                                style={[styles.btn, styles.editBtn, { marginBottom: 12 }]}
                                onPress={() => router.push(`/projects/${id}/material-bills/create?editId=${billId}` as any)}
                            >
                                <Ionicons name="create-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.btnText}>Sửa</Text>
                            </TouchableOpacity>
                        </PermissionGuard>
                        <View style={styles.actionButtonGroup}>
                            <TouchableOpacity
                                style={[styles.btn, styles.deleteBtn]}
                                onPress={() => handleAction('delete')}
                            >
                                <Text style={styles.deleteBtnText}>Xóa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, styles.submitBtn]}
                                onPress={() => handleAction('submit')}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Gửi duyệt</Text>}
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {bill.status === 'pending_management' && (
                    <PermissionGuard permission={Permissions.COST_APPROVE_MANAGEMENT} projectId={id}>
                        <View style={styles.actionButtonGroup}>
                            <TouchableOpacity
                                style={[styles.btn, styles.rejectBtn]}
                                onPress={() => setShowRejectModal(true)}
                            >
                                <Text style={styles.rejectBtnText}>Từ chối</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, styles.approveBtn]}
                                onPress={() => handleAction('approve_management')}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Duyệt (BĐH)</Text>}
                            </TouchableOpacity>
                        </View>
                    </PermissionGuard>
                )}

                {bill.status === 'pending_accountant' && (
                    <PermissionGuard permission={Permissions.COST_APPROVE_ACCOUNTANT} projectId={id}>
                        <View style={styles.actionButtonGroup}>
                            <TouchableOpacity
                                style={[styles.btn, styles.rejectBtn]}
                                onPress={() => setShowRejectModal(true)}
                            >
                                <Text style={styles.rejectBtnText}>Từ chối</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, styles.approveBtn]}
                                onPress={() => handleAction('approve_accountant')}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Xác nhận (Kế toán)</Text>}
                            </TouchableOpacity>
                        </View>
                    </PermissionGuard>
                )}

                {['pending_management', 'pending_accountant', 'rejected'].includes(bill.status) && (
                    <PermissionGuard permission={Permissions.MATERIAL_REVERT} projectId={id}>
                        <TouchableOpacity
                            style={[styles.btn, styles.revertBtn, { marginTop: 12 }]}
                            onPress={() => handleAction('revert')}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="arrow-undo-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.btnText}>Hoàn duyệt</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </PermissionGuard>
                )}

            </View>

            {/* Reject Modal */}
            <Modal visible={showRejectModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.rejectPanel}>
                        <Text style={styles.modalTitle}>Lý do từ chối</Text>
                        <TextInput
                            style={styles.rejectInput}
                            multiline
                            numberOfLines={4}
                            placeholder="Nhập lý do từ chối..."
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalBtnCancel}
                                onPress={() => setShowRejectModal(false)}
                            >
                                <Text>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnConfirm}
                                onPress={handleReject}
                                disabled={submitting}
                            >
                                <Text style={styles.confirmText}>Xác nhận</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },
    createdAt: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    billTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 16,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    infoItem: {
        width: "47%",
    },
    infoLabel: {
        fontSize: 12,
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
    },
    notesBox: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#D1D5DB",
    },
    notesText: {
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    itemName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    itemMeta: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    itemTotal: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: "#F3F4F6",
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#6B7280",
    },
    totalValue: {
        fontSize: 20,
        fontWeight: "800",
        color: "#3B82F6",
    },
    historyRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    historyText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
    },
    historySub: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    actionBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        padding: 16,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
    },
    actionButtonGroup: {
        flexDirection: "row",
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    btnText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 16,
    },
    submitBtn: {
        backgroundColor: "#3B82F6",
    },
    approveBtn: {
        backgroundColor: "#10B981",
    },
    rejectBtn: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#EF4444",
    },
    revertBtn: {
        backgroundColor: "#F59E0B",
        flexDirection: "row",
    },
    editBtn: {
        backgroundColor: "#3B82F6",
        flexDirection: "row",
    },
    rejectBtnText: {
        color: "#EF4444",
        fontWeight: "700",
    },
    deleteBtn: {
        backgroundColor: "#FEE2E2",
    },
    deleteBtnText: {
        color: "#EF4444",
        fontWeight: "700",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    rejectPanel: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 16,
    },
    rejectInput: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 12,
        height: 100,
        textAlignVertical: "top",
        backgroundColor: "#F9FAFB",
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 20,
    },
    modalBtnCancel: {
        padding: 12,
    },
    modalBtnConfirm: {
        backgroundColor: "#EF4444",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    confirmText: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
    paymentButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    paymentButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 16,
        gap: 14,
    },
    paymentIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    paymentButtonTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#065F46',
    },
    paymentButtonSub: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    attachmentList: {
        flexDirection: "row",
        marginTop: 8,
    },
    attachmentItem: {
        marginRight: 16,
        alignItems: "center",
        width: 100,
    },
    attachmentThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
    },
    attachmentName: {
        fontSize: 10,
        marginTop: 4,
        color: "#6B7280",
        textAlign: "center",
    },
});
