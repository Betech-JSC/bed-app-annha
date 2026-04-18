import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    SafeAreaView,
    Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { paymentApi, ProjectPayment } from "@/api/paymentApi";
import { ScreenHeader, PermissionDenied } from "@/components";
import ImageViewer from "@/components/ImageViewer";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Permissions } from "@/constants/Permissions";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentDetailScreen() {
    const router = useRouter();
    const { id, paymentId } = useLocalSearchParams<{ id: string; paymentId: string }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();
    const [payment, setPayment] = useState<ProjectPayment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    useEffect(() => {
        console.log('[PaymentDetail] Loading payment:', { id, paymentId });
        loadPaymentDetail();
    }, [paymentId]);

    const loadPaymentDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            setPermissionDenied(false);
            setPermissionMessage("");
            console.log('[PaymentDetail] Fetching payment:', { id, paymentId });
            const response = await paymentApi.getPaymentById(Number(id), Number(paymentId));
            console.log('[PaymentDetail] Response:', response);

            if (response.success && response.data) {
                setPayment(response.data);
                console.log('[PaymentDetail] Payment loaded successfully');
            } else {
                const errorMsg = "Không tìm thấy thông tin thanh toán";
                console.error('[PaymentDetail] No data in response');
                setError(errorMsg);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setPermissionDenied(true);
                setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem chi tiết thanh toán này.");
            } else {
                console.error('[PaymentDetail] Error loading payment detail:', error);
                console.error('[PaymentDetail] Error response:', error.response);
                const errorMsg = error.response?.data?.message || "Không thể tải thông tin thanh toán";
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("vi-VN");
    };

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleString("vi-VN");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
            case "paid":
                return "#10B981";
            case "customer_paid":
                return "#8B5CF6";
            case "customer_pending_approval":
                return "#F59E0B";
            case "customer_approved":
                return "#3B82F6";
            case "overdue":
                return "#EF4444";
            default:
                return "#6B7280";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "pending":
                return "Chờ thanh toán";
            case "customer_pending_approval":
                return "Chờ khách hàng duyệt";
            case "customer_approved":
                return "Khách hàng đã duyệt";
            case "customer_paid":
                return "Khách hàng đã thanh toán";
            case "confirmed":
            case "paid":
                return "Đã xác nhận";
            case "overdue":
                return "Quá hạn";
            default:
                return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "confirmed":
            case "paid":
                return "checkmark-circle";
            case "customer_paid":
                return "card";
            case "customer_pending_approval":
                return "time";
            case "customer_approved":
                return "thumbs-up";
            case "overdue":
                return "alert-circle";
            default:
                return "ellipse";
        }
    };

    const imageAttachments = payment?.attachments?.filter(a => a.mime_type?.startsWith("image/")) || [];
    const viewerImages = imageAttachments.map(a => ({
        uri: a.file_url,
        name: a.original_name || a.file_name
    }));

    const handleAttachmentPress = (attachment: any) => {
        if (attachment.mime_type?.startsWith("image/")) {
            const imgIndex = imageAttachments.findIndex(a => (a.id === attachment.id && a.id !== undefined) || a.file_url === attachment.file_url);
            if (imgIndex !== -1) {
                setViewerIndex(imgIndex);
                setViewerVisible(true);
            }
        } else {
            Alert.alert("Thông báo", "Hệ thống chỉ hỗ trợ xem ảnh trực tiếp. Các định dạng khác vui lòng tải về.");
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi tiết thanh toán" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            </View>
        );
    }

    if (permissionDenied) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi tiết thanh toán" showBackButton />
                <PermissionDenied message={permissionMessage} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi tiết thanh toán" showBackButton />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                    <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={loadPaymentDetail}
                    >
                        <Ionicons name="refresh" size={20} color="#FFFFFF" />
                        <Text style={styles.retryButtonText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }


    if (!payment) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Chi tiết thanh toán" showBackButton />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Không tìm thấy thông tin thanh toán</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={loadPaymentDetail}
                    >
                        <Ionicons name="refresh" size={20} color="#FFFFFF" />
                        <Text style={styles.retryButtonText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <PermissionGuard permission={Permissions.PAYMENT_VIEW} projectId={id}>
            <View style={styles.container}>
                <ScreenHeader title="Chi tiết thanh toán" showBackButton />

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
                >
                    {/* Status Card */}
                    <View style={styles.statusCard}>
                        <View style={styles.statusHeader}>
                            <Ionicons
                                name={getStatusIcon(payment.status) as any}
                                size={48}
                                color={getStatusColor(payment.status)}
                            />
                            <View style={styles.statusInfo}>
                                <Text style={styles.statusLabel}>Trạng thái</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(payment.status) + "20" },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: getStatusColor(payment.status) },
                                        ]}
                                    >
                                        {getStatusText(payment.status)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Payment Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Thông tin thanh toán</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Đợt thanh toán</Text>
                            <Text style={styles.infoValue}>Đợt {payment.payment_number}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Số tiền</Text>
                            <Text style={[styles.infoValue, styles.amountText]}>
                                {formatCurrency(payment.amount)}
                            </Text>
                        </View>

                        {payment.notes && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Nội dung</Text>
                                <Text style={styles.infoValueMultiline}>{payment.notes}</Text>
                            </View>
                        )}

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.iconLabel}>
                                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                                <Text style={styles.infoLabel}>Hạn thanh toán</Text>
                            </View>
                            <Text style={styles.infoValue}>{formatDate(payment.due_date)}</Text>
                        </View>

                        {payment.paid_date && (
                            <View style={styles.infoRow}>
                                <View style={styles.iconLabel}>
                                    <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                                    <Text style={styles.infoLabel}>Ngày thanh toán</Text>
                                </View>
                                <Text style={styles.infoValue}>{formatDate(payment.paid_date)}</Text>
                            </View>
                        )}
                    </View>

                    {/* Approval Info Card */}
                    {(payment.customer_approved_at || payment.payment_proof_uploaded_at || payment.confirmed_at) && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Lịch sử duyệt</Text>

                            {payment.payment_proof_uploaded_at && (
                                <View style={styles.timelineItem}>
                                    <View style={styles.timelineDot} />
                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineHeader}>
                                            <Ionicons name="image-outline" size={20} color="#F59E0B" />
                                            <Text style={styles.timelineTitle}>Upload chứng từ</Text>
                                        </View>
                                        <Text style={styles.timelineDate}>
                                            {formatDateTime(payment.payment_proof_uploaded_at)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {payment.customer_approved_at && (
                                <View style={styles.timelineItem}>
                                    <View style={styles.timelineDot} />
                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineHeader}>
                                            <Ionicons name="person-outline" size={20} color="#8B5CF6" />
                                            <Text style={styles.timelineTitle}>Khách hàng xác nhận</Text>
                                        </View>
                                        <Text style={styles.timelineDate}>
                                            {formatDateTime(payment.customer_approved_at)}
                                        </Text>
                                        {payment.customer_approver && (
                                            <Text style={styles.timelineUser}>
                                                Bởi: {payment.customer_approver.name}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {payment.confirmed_at && (
                                <View style={styles.timelineItem}>
                                    <View style={[styles.timelineDot, { backgroundColor: "#10B981" }]} />
                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineHeader}>
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                            <Text style={styles.timelineTitle}>Kế toán xác nhận</Text>
                                        </View>
                                        <Text style={styles.timelineDate}>
                                            {formatDateTime(payment.confirmed_at)}
                                        </Text>
                                        {payment.confirmer && (
                                            <Text style={styles.timelineUser}>
                                                Bởi: {payment.confirmer.name}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Attachments Card */}
                    {payment.attachments && payment.attachments.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>
                                Chứng từ đính kèm ({payment.attachments.length})
                            </Text>

                            <View style={styles.attachmentsGrid}>
                                {payment.attachments.map((attachment, index) => (
                                    <TouchableOpacity
                                        key={attachment.id || index}
                                        style={styles.attachmentCard}
                                        onPress={() => handleAttachmentPress(attachment)}
                                    >
                                        {attachment.mime_type?.startsWith("image/") ? (
                                            <Image
                                                source={{ uri: attachment.file_url }}
                                                style={styles.attachmentImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.attachmentPlaceholder}>
                                                <Ionicons name="document-text-outline" size={32} color="#3B82F6" />
                                            </View>
                                        )}
                                        <Text style={styles.attachmentName} numberOfLines={2}>
                                            {attachment.original_name || attachment.file_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {(payment.status === "pending" || payment.status === "overdue") && (
                        <PermissionGuard permission={Permissions.PAYMENT_UPDATE} projectId={id}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    router.push(`/projects/${id}/payments/${paymentId}/mark-paid` as any);
                                }}
                            >
                                <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Thanh toán</Text>
                            </TouchableOpacity>
                        </PermissionGuard>
                    )}

                    {payment.status === "customer_paid" && (
                        <PermissionGuard permission={Permissions.PAYMENT_CONFIRM} projectId={id}>
                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.confirmButton]}
                                    onPress={() => {
                                        // TODO: Navigate to confirm screen
                                        Alert.alert("Thông báo", "Chức năng đang phát triển");
                                    }}
                                >
                                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>Xác nhận</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.rejectButton]}
                                    onPress={() => {
                                        setRejectionReason("");
                                        setShowRejectModal(true);
                                    }}
                                >
                                    <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>Từ chối</Text>
                                </TouchableOpacity>
                            </View>
                        </PermissionGuard>
                    )}

                    {(payment.status === "confirmed" || payment.status === "paid") && (
                        <PermissionGuard permission={Permissions.PAYMENT_REVERT} projectId={id}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#F59E0B', shadowColor: '#F59E0B' }]}
                                onPress={() => {
                                    Alert.alert(
                                        "X\u00e1c nh\u1eadn ho\u00e0n duy\u1ec7t",
                                        "B\u1ea1n c\u00f3 ch\u1eafc ch\u1eafn mu\u1ed1n \u0111\u01b0a thanh to\u00e1n n\u00e0y v\u1ec1 tr\u1ea1ng th\u00e1i ch\u1edd?",
                                        [
                                            { text: "H\u1ee7y", style: "cancel" },
                                            {
                                                text: "Ho\u00e0n duy\u1ec7t",
                                                style: "destructive",
                                                onPress: async () => {
                                                    try {
                                                        const response = await paymentApi.revertPaymentToPending(id!, paymentId);
                                                        if (response.success) {
                                                            Alert.alert("Th\u00e0nh c\u00f4ng", "\u0110\u00e3 \u0111\u01b0a thanh to\u00e1n v\u1ec1 tr\u1ea1ng th\u00e1i ch\u1edd");
                                                            loadPaymentDetail();
                                                        }
                                                    } catch (error: any) {
                                                        Alert.alert("L\u1ed7i", error.response?.data?.message || "Kh\u00f4ng th\u1ec3 ho\u00e0n duy\u1ec7t");
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                }}
                            >
                                <Ionicons name="arrow-undo-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Ho\u00e0n duy\u1ec7t</Text>
                            </TouchableOpacity>
                        </PermissionGuard>
                    )}
                </ScrollView>

                {/* Reject Modal */}
                <Modal
                    visible={showRejectModal}
                    animationType="slide"
                    transparent={true}
                    presentationStyle="overFullScreen"
                    onRequestClose={() => {
                        setShowRejectModal(false);
                        setRejectionReason("");
                    }}
                >
                    <SafeAreaView style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, tabBarHeight) + 16 }]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Từ Chối Thanh Toán</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowRejectModal(false);
                                        setRejectionReason("");
                                    }}
                                >
                                    <Ionicons name="close" size={24} color="#1F2937" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtitle}>
                                Vui lòng nhập lý do từ chối:
                            </Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={rejectionReason}
                                onChangeText={setRejectionReason}
                                placeholder="Nhập lý do từ chối..."
                                multiline
                                numberOfLines={4}
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => {
                                        setShowRejectModal(false);
                                        setRejectionReason("");
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.rejectButton]}
                                    onPress={async () => {
                                        if (!rejectionReason.trim()) {
                                            Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
                                            return;
                                        }
                                        try {
                                            const response = await paymentApi.rejectPayment(id!, paymentId, rejectionReason);
                                            if (response.success) {
                                                Alert.alert("Thành công", "Đã từ chối thanh toán");
                                                setShowRejectModal(false);
                                                loadPaymentDetail();
                                            }
                                        } catch (error: any) {
                                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể từ chối thanh toán");
                                        }
                                    }}
                                >
                                    <Text style={[styles.saveButtonText, { color: "#FFFFFF" }]}>Từ Chối</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
                </Modal>

                <ImageViewer
                    images={viewerImages}
                    visible={viewerVisible}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerVisible(false)}
                />
            </View>
        </PermissionGuard>
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
        padding: 32,
    },
    scrollView: {
        flex: 1,
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
        textAlign: "center",
    },
    loadingText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
        textAlign: "center",
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    errorText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 8,
        marginBottom: 24,
        textAlign: "center",
        paddingHorizontal: 32,
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#3B82F6",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    statusCard: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        marginBottom: 12,
    },
    statusHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignSelf: "flex-start",
    },
    statusText: {
        fontSize: 14,
        fontWeight: "700",
    },
    card: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    infoRow: {
        marginBottom: 16,
    },
    infoLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    infoValueMultiline: {
        fontSize: 15,
        color: "#1F2937",
        lineHeight: 22,
    },
    amountText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#3B82F6",
    },
    iconLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
    },
    divider: {
        height: 1,
        backgroundColor: "#E5E7EB",
        marginVertical: 16,
    },
    timelineItem: {
        flexDirection: "row",
        marginBottom: 20,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#3B82F6",
        marginTop: 4,
        marginRight: 12,
    },
    timelineContent: {
        flex: 1,
    },
    timelineHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    timelineTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    timelineDate: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 2,
    },
    timelineUser: {
        fontSize: 13,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    attachmentsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    attachmentCard: {
        width: "48%",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    attachmentImage: {
        width: "100%",
        height: 120,
        backgroundColor: "#E5E7EB",
    },
    attachmentPlaceholder: {
        width: "100%",
        height: 120,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    attachmentName: {
        padding: 8,
        fontSize: 12,
        color: "#1F2937",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 8,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    actionButtonsRow: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        marginTop: 8,
    },
    confirmButton: {
        flex: 1,
        backgroundColor: "#10B981",
        shadowColor: "#10B981",
    },
    rejectButton: {
        flex: 1,
        backgroundColor: "#EF4444",
        shadowColor: "#EF4444",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        width: "90%",
        maxWidth: 400,
        maxHeight: "80%",
        padding: 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: "#1F2937",
        backgroundColor: "#FFFFFF",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#F3F4F6",
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4B5563",
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
