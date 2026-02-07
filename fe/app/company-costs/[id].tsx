import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { companyCostApi, CompanyCost } from '@/api/companyCostApi';
import { ScreenHeader, PermissionGuard } from '@/components';
import { Permissions } from '@/constants/Permissions';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function CompanyCostDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const costId = parseInt(params.id as string);
    const tabBarHeight = useTabBarHeight();

    const [cost, setCost] = useState<CompanyCost | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadCost();
    }, []);

    const loadCost = async () => {
        try {
            setLoading(true);
            const response = await companyCostApi.getCompanyCost(costId);
            if (response.success) {
                setCost(response.data);
            }
        } catch (error: any) {
            console.error('Error loading cost:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin chi phí');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        Alert.alert(
            'Xác nhận',
            'Gửi chi phí này để ban điều hành duyệt?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Gửi duyệt',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await companyCostApi.submitCompanyCost(costId);
                            if (response.success) {
                                Alert.alert('Thành công', 'Đã gửi chi phí để duyệt');
                                loadCost();
                            }
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể gửi duyệt');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleApproveByManagement = async () => {
        Alert.alert(
            'Xác nhận',
            'Duyệt chi phí này (Ban điều hành)?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Duyệt',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await companyCostApi.approveByManagement(costId);
                            if (response.success) {
                                Alert.alert('Thành công', 'Đã duyệt chi phí');
                                loadCost();
                            }
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể duyệt');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleApproveByAccountant = async () => {
        Alert.alert(
            'Xác nhận',
            'Xác nhận chi phí này (Kế toán)?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await companyCostApi.approveByAccountant(costId);
                            if (response.success) {
                                Alert.alert('Thành công', 'Đã xác nhận chi phí');
                                loadCost();
                            }
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xác nhận');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối');
            return;
        }

        try {
            setActionLoading(true);
            const response = await companyCostApi.rejectCompanyCost(costId, rejectReason.trim());
            if (response.success) {
                Alert.alert('Thành công', 'Đã từ chối chi phí');
                setShowRejectModal(false);
                setRejectReason('');
                loadCost();
            }
        } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa chi phí này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            const response = await companyCostApi.deleteCompanyCost(costId);
                            if (response.success) {
                                Alert.alert('Thành công', 'Đã xóa chi phí', [
                                    {
                                        text: 'OK',
                                        onPress: () => router.back(),
                                    },
                                ]);
                            }
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft':
                return '#6B7280';
            case 'pending_management_approval':
            case 'pending_accountant_approval':
                return '#F59E0B';
            case 'approved':
                return '#10B981';
            case 'rejected':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'draft':
                return 'Nháp';
            case 'pending_management_approval':
                return 'Chờ BĐH duyệt';
            case 'pending_accountant_approval':
                return 'Chờ KT xác nhận';
            case 'approved':
                return 'Đã duyệt';
            case 'rejected':
                return 'Từ chối';
            default:
                return status;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!cost) {
        return (
            <View style={styles.centerContainer}>
                <Text>Không tìm thấy chi phí</Text>
            </View>
        );
    }

    const canEdit = cost.status === 'draft' || cost.status === 'rejected';
    const canDelete = cost.status === 'draft' || cost.status === 'rejected';
    const canSubmit = cost.status === 'draft';
    const canApproveManagement = cost.status === 'pending_management_approval';
    const canApproveAccountant = cost.status === 'pending_accountant_approval';
    const canReject = cost.status === 'pending_management_approval' || cost.status === 'pending_accountant_approval';

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Chi Tiết Chi Phí"
                showBackButton
                rightComponent={
                    canEdit ? (
                        <PermissionGuard permission={Permissions.COST_UPDATE}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => router.push(`/company-costs/create?id=${costId}` as any)}
                            >
                                <Ionicons name="create-outline" size={24} color="#3B82F6" />
                            </TouchableOpacity>
                        </PermissionGuard>
                    ) : undefined
                }
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: tabBarHeight + 100 }}>
                {/* Status Badge */}
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(cost.status) + '20' },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(cost.status) }]}>
                        {getStatusText(cost.status)}
                    </Text>
                </View>

                {/* Main Info */}
                <View style={styles.card}>
                    <Text style={styles.costName}>{cost.name}</Text>
                    <Text style={styles.costAmount}>{formatCurrency(cost.amount)}</Text>
                </View>

                {/* Details */}
                <View style={styles.card}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nhóm chi phí:</Text>
                        <Text style={styles.detailValue}>{cost.cost_group?.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Ngày chi phí:</Text>
                        <Text style={styles.detailValue}>{formatDate(cost.cost_date)}</Text>
                    </View>
                    {cost.quantity && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Số lượng:</Text>
                            <Text style={styles.detailValue}>
                                {cost.quantity} {cost.unit || ''}
                            </Text>
                        </View>
                    )}
                    {cost.supplier && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Nhà cung cấp:</Text>
                            <Text style={styles.detailValue}>{cost.supplier.name}</Text>
                        </View>
                    )}
                    {cost.input_invoice && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Hóa đơn:</Text>
                            <Text style={styles.detailValue}>
                                {cost.input_invoice.invoice_number || `HD-${cost.input_invoice.id}`}
                            </Text>
                        </View>
                    )}
                    {cost.description && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Mô tả:</Text>
                            <Text style={styles.detailValue}>{cost.description}</Text>
                        </View>
                    )}
                </View>

                {/* Creator Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Thông tin tạo</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Người tạo:</Text>
                        <Text style={styles.detailValue}>{cost.creator?.name || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Ngày tạo:</Text>
                        <Text style={styles.detailValue}>{formatDate(cost.created_at)}</Text>
                    </View>
                </View>

                {/* Approval Info */}
                {(cost.management_approver || cost.accountant_approver) && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Thông tin duyệt</Text>
                        {cost.management_approver && (
                            <>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>BĐH duyệt:</Text>
                                    <Text style={styles.detailValue}>{cost.management_approver.name}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Ngày duyệt:</Text>
                                    <Text style={styles.detailValue}>
                                        {cost.management_approved_at ? formatDate(cost.management_approved_at) : 'N/A'}
                                    </Text>
                                </View>
                            </>
                        )}
                        {cost.accountant_approver && (
                            <>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>KT xác nhận:</Text>
                                    <Text style={styles.detailValue}>{cost.accountant_approver.name}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Ngày xác nhận:</Text>
                                    <Text style={styles.detailValue}>
                                        {cost.accountant_approved_at ? formatDate(cost.accountant_approved_at) : 'N/A'}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* Rejected Reason */}
                {cost.status === 'rejected' && cost.rejected_reason && (
                    <View style={[styles.card, styles.rejectedCard]}>
                        <Text style={styles.rejectedTitle}>Lý do từ chối</Text>
                        <Text style={styles.rejectedReason}>{cost.rejected_reason}</Text>
                    </View>
                )}

                {/* Attachments */}
                {cost.attachments && cost.attachments.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Tài liệu đính kèm ({cost.attachments.length})</Text>
                        {cost.attachments.map((attachment) => (
                            <TouchableOpacity key={attachment.id} style={styles.attachmentItem}>
                                <Ionicons name="document-outline" size={20} color="#3B82F6" />
                                <Text style={styles.attachmentName} numberOfLines={1}>
                                    {attachment.original_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionBar}>
                {canSubmit && (
                    <PermissionGuard permission={Permissions.COST_SUBMIT}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.submitButton]}
                            onPress={handleSubmit}
                            disabled={actionLoading}
                        >
                            <Text style={styles.actionButtonText}>Gửi Duyệt</Text>
                        </TouchableOpacity>
                    </PermissionGuard>
                )}

                {canApproveManagement && (
                    <PermissionGuard permission={Permissions.COST_APPROVE_MANAGEMENT}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={handleApproveByManagement}
                            disabled={actionLoading}
                        >
                            <Text style={styles.actionButtonText}>Duyệt (BĐH)</Text>
                        </TouchableOpacity>
                    </PermissionGuard>
                )}

                {canApproveAccountant && (
                    <PermissionGuard permission={Permissions.COST_APPROVE_ACCOUNTANT}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={handleApproveByAccountant}
                            disabled={actionLoading}
                        >
                            <Text style={styles.actionButtonText}>Xác Nhận (KT)</Text>
                        </TouchableOpacity>
                    </PermissionGuard>
                )}

                {canReject && (
                    <PermissionGuard permission={Permissions.COST_REJECT}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => setShowRejectModal(true)}
                            disabled={actionLoading}
                        >
                            <Text style={styles.actionButtonText}>Từ Chối</Text>
                        </TouchableOpacity>
                    </PermissionGuard>
                )}

                {canDelete && (
                    <PermissionGuard permission={Permissions.COST_DELETE}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={handleDelete}
                            disabled={actionLoading}
                        >
                            <Text style={styles.actionButtonText}>Xóa</Text>
                        </TouchableOpacity>
                    </PermissionGuard>
                )}
            </View>

            {/* Reject Modal */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContentContainer}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalIconContainer}>
                                        <Ionicons name="alert-circle" size={32} color="#EF4444" />
                                    </View>
                                    <Text style={styles.modalTitle}>Từ chối chi phí</Text>
                                    <Text style={styles.modalSubtitle}>
                                        Vui lòng nhập lý do từ chối để người tạo có thể chỉnh sửa lại.
                                    </Text>
                                </View>

                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Nhập lý do từ chối (bắt buộc)..."
                                    placeholderTextColor="#9CA3AF"
                                    value={rejectReason}
                                    onChangeText={setRejectReason}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    autoFocus
                                />

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.modalCancelButton]}
                                        onPress={() => {
                                            setShowRejectModal(false);
                                            setRejectReason('');
                                        }}
                                        disabled={actionLoading}
                                    >
                                        <Text style={styles.modalCancelText}>Hủy bỏ</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.modalButton,
                                            styles.modalConfirmButton,
                                            (!rejectReason.trim() || actionLoading) && styles.modalButtonDisabled
                                        ]}
                                        onPress={handleReject}
                                        disabled={!rejectReason.trim() || actionLoading}
                                    >
                                        {actionLoading ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <Text style={styles.modalConfirmText}>Xác nhận từ chối</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    editButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    costName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    costAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: '#10B981',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    rejectedCard: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    rejectedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
        marginBottom: 8,
    },
    rejectedReason: {
        fontSize: 14,
        color: '#991B1B',
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    attachmentName: {
        fontSize: 14,
        color: '#1F2937',
        flex: 1,
    },
    actionBar: {
        flexDirection: 'row',
        gap: 8,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: '#3B82F6',
    },
    approveButton: {
        backgroundColor: '#10B981',
    },
    rejectButton: {
        backgroundColor: '#EF4444',
    },
    deleteButton: {
        backgroundColor: '#6B7280',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCancelButton: {
        backgroundColor: '#F3F4F6',
    },
    modalConfirmButton: {
        backgroundColor: '#EF4444',
    },
    modalCancelText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    modalConfirmText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // New Styles for Enhanced Modal
    modalContentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalButtonDisabled: {
        opacity: 0.5,
    },
});
