import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { equipmentApi, Equipment, EquipmentAllocation, EquipmentMaintenance, CreateEquipmentData } from "@/api/equipmentApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, DatePickerInput, CurrencyInput, UniversalFileUploader, PremiumSelect } from "@/components";

const STATUS_LABELS: Record<string, string> = {
    draft: "Nháp",
    pending_management: "Chờ BĐH duyệt",
    pending_accountant: "Chờ Kế toán chi",
    available: "Trong kho",
    in_use: "Đang sử dụng",
    maintenance: "Bảo trì",
    retired: "Thanh lý",
    rejected: "Bị từ chối",
};

const TYPE_LABELS: Record<string, string> = {
    owned: "Sở hữu",
    rented: "Thuê",
};

const CATEGORY_LABELS: Record<string, string> = {
    computer: "Máy tính / Thiết bị VP",
    machinery: "Máy móc công trình",
    vehicle: "Phương tiện vận tải",
    furniture: "Nội thất",
    other: "Khác",
};

export default function EquipmentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [equipment, setEquipment] = useState<Equipment | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    type EquipmentFormData = {
        name: string;
        code: string;
        category: string;
        brand: string;
        model: string;
        serial_number: string;
        quantity: string;
        purchase_price: string;
        purchase_date: string;
        unit: string;
        useful_life_months: string;
        residual_value: string;
        notes: string;
        status: string;
        attachment_ids: number[];
    };
    const [formData, setFormData] = useState<EquipmentFormData>({
        name: "",
        code: "",
        category: "other",
        brand: "",
        model: "",
        serial_number: "",
        quantity: "1",
        purchase_price: "0",
        purchase_date: "",
        unit: "cái",
        useful_life_months: "60",
        residual_value: "0",
        notes: "",
        status: "available",
        attachment_ids: [],
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);


    useEffect(() => {
        loadEquipment();
    }, [id]);

    const loadEquipment = async () => {
        try {
            setLoading(true);
            const equipmentRes = await equipmentApi.getEquipmentItem(Number(id));
            if (equipmentRes.success) {
                setEquipment(equipmentRes.data);
                setFormData({
                    name: equipmentRes.data.name,
                    code: equipmentRes.data.code || "",
                    category: equipmentRes.data.category || "",
                    notes: equipmentRes.data.notes || "",
                    status: equipmentRes.data.status,
                    brand: equipmentRes.data.brand || "",
                    model: equipmentRes.data.model || "",
                    serial_number: equipmentRes.data.serial_number || "",
                    unit: equipmentRes.data.unit || "",
                    quantity: (equipmentRes.data.quantity || 1).toString(),
                    purchase_price: (equipmentRes.data.purchase_price || 0).toString(),
                    purchase_date: equipmentRes.data.purchase_date ? new Date(equipmentRes.data.purchase_date).toISOString().split('T')[0] : "",
                    useful_life_months: (equipmentRes.data.useful_life_months || "").toString(),
                    residual_value: (equipmentRes.data.residual_value || 0).toString(),
                });
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể tải thiết bị";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadEquipment();
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.trim() === "") {
            newErrors.name = "Tên thiết bị là bắt buộc";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdate = async () => {
        if (equipment?.status !== "draft") {
            Alert.alert("Lỗi", "Chỉ có thể chỉnh sửa thiết bị ở trạng thái Nháp");
            return;
        }

        if (!validateForm()) {
            return;
        }

        try {
            setSubmitting(true);
            const data = {
                ...formData,
                quantity: parseInt((formData as any).quantity) || 1,
                purchase_price: parseFloat((formData as any).purchase_price) || 0,
                useful_life_months: (formData as any).useful_life_months ? parseInt((formData as any).useful_life_months) : null,
                residual_value: parseFloat((formData as any).residual_value) || 0,
                attachment_ids: (formData as any).attachment_ids || [],
            };
            const response = await equipmentApi.updateEquipment(Number(id), data as any);
            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật thiết bị");
                setShowEditModal(false);
                setErrors({});
                loadEquipment();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể cập nhật thiết bị";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleWorkflowAction = async (action: "submit" | "approveManagement" | "confirmAccountant" | "reject") => {
        try {
            setSubmitting(true);
            let response;
            if (action === "reject") {
                Alert.prompt("Từ chối", "Vui lòng nhập lý do từ chối:", [
                    { text: "Hủy", style: "cancel" },
                    { text: "Từ chối", style: "destructive", onPress: async (reason) => {
                        if (!reason) return;
                        response = await equipmentApi.reject(Number(id), reason);
                        if (response.success) {
                            Alert.alert("Thành công", "Đã từ chối phiếu");
                            loadEquipment();
                        }
                    }}
                ]);
                return;
            } else if (action === "confirmAccountant") {
                Alert.alert(
                    "Xác nhận chi",
                    `Bạn có chắc chắn muốn xác nhận chi ${formatCurrency((equipment.quantity || 1) * (equipment.purchase_price || 0))} cho thiết bị này? Hệ thống sẽ tự động tạo phiếu chi tương ứng.`,
                    [
                        { text: "Hủy", style: "cancel" },
                        { 
                            text: "Xác nhận", 
                            onPress: async () => {
                                try {
                                    setSubmitting(true);
                                    const res = await equipmentApi.confirmAccountant(Number(id));
                                    if (res.success) {
                                        Alert.alert("Thành công", "Đã xác nhận chi và tạo phiếu chi công ty.");
                                        loadEquipment();
                                    }
                                } catch (err: any) {
                                    Alert.alert("Lỗi", err.response?.data?.message || "Không thể thực hiện thao tác");
                                } finally {
                                    setSubmitting(false);
                                }
                            }
                        }
                    ]
                );
                return;
            } else {
                response = await (equipmentApi as any)[action](Number(id));
            }

            if (response.success) {
                Alert.alert("Thành công", "Thao tác thành công");
                loadEquipment();
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể thực hiện thao tác");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn xóa thiết bị này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await equipmentApi.deleteEquipment(Number(id));
                            if (response.success) {
                                Alert.alert("Thành công", "Đã xóa thiết bị", [
                                    { text: "OK", onPress: () => router.back() },
                                ]);
                            }
                        } catch (error: any) {
                            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể xóa thiết bị";
                            Alert.alert("Lỗi", errorMessage);
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "available":
                return "#10B981";
            case "in_use":
                return "#3B82F6";
            case "maintenance":
                return "#F59E0B";
            case "retired":
                return "#6B7280";
            default:
                return "#6B7280";
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Chưa có";
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };



    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Hồ Sơ Thiết Bị" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    if (!equipment) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Hồ Sơ Thiết Bị" showBackButton />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>Không tìm thấy tài sản</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Hồ Sơ Thiết Bị"
                showBackButton
                rightComponent={
                    <View style={styles.headerActions}>
                        {equipment.status === "draft" && (
                            <>
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={() => setShowEditModal(true)}
                                >
                                    <Ionicons name="pencil" size={24} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={handleDelete}
                                >
                                    <Ionicons name="trash" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={onRefresh}
                        >
                            <Ionicons name="refresh" size={24} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                }
            />

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Status Card */}
                {/* Workflow Stepper */}
                {/* Status & Timeline Section */}
                <View style={styles.premiumCard}>
                    <View style={styles.cardHeaderWithBadge}>
                        <Text style={styles.premiumCardTitle}>Tiến độ phê duyệt</Text>
                        <View style={[styles.statusBadgeFull, { backgroundColor: getStatusColor(equipment.status) + "15" }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(equipment.status) }]} />
                            <Text style={[styles.statusTextFull, { color: getStatusColor(equipment.status) }]}>
                                {STATUS_LABELS[equipment.status].toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.timelineContainer}>
                        {[
                            { label: "Khởi tạo hồ sơ", desc: "Người tạo gửi phiếu mua sắm", status: true, icon: "document-text" },
                            { label: "BĐH Duyệt", desc: "Ban điều hành xem xét chi phí", status: ["pending_accountant", "available", "in_use"].includes(equipment.status), icon: "business" },
                            { label: "Kế toán Chi", desc: "Xác nhận thanh toán & chứng từ", status: ["available", "in_use"].includes(equipment.status), icon: "card" },
                            { label: "Nhập kho", desc: "Tài sản sẵn sàng sử dụng", status: ["available", "in_use"].includes(equipment.status), icon: "cube" },
                        ].map((step, index, arr) => (
                            <View key={index} style={styles.timelineItem}>
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.timelineIcon, step.status ? styles.timelineIconActive : styles.timelineIconInactive]}>
                                        <Ionicons name={step.icon as any} size={16} color={step.status ? "#FFF" : "#9CA3AF"} />
                                    </View>
                                    {index !== arr.length - 1 && <View style={[styles.timelineLine, step.status && arr[index+1].status ? styles.timelineLineActive : styles.timelineLineInactive]} />}
                                </View>
                                <View style={styles.timelineRight}>
                                    <Text style={[styles.timelineLabel, step.status ? styles.timelineLabelActive : styles.timelineLabelInactive]}>{step.label}</Text>
                                    <Text style={styles.timelineDesc}>{step.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Quick Action in Card if Draft */}
                    {equipment.status === "draft" && (
                        <TouchableOpacity style={styles.primaryActionButton} onPress={() => handleWorkflowAction("submit")}>
                            <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryActionText}>Gửi Duyệt Hồ Sơ</Text>
                        </TouchableOpacity>
                    )}

                    {/* Management Actions */}
                    {equipment.status === "pending_management" && (
                        <View style={styles.actionButtonGroup}>
                            <TouchableOpacity style={[styles.workflowBtnLarge, { backgroundColor: "#1B4F72" }]} onPress={() => handleWorkflowAction("approveManagement")}>
                                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                <Text style={styles.workflowBtnTextLarge}>Duyệt Ngay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.workflowBtnSmall, { backgroundColor: "#FEE2E2" }]} onPress={() => handleWorkflowAction("reject")}>
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Accountant Actions */}
                    {equipment.status === "pending_accountant" && (
                        <View style={styles.actionButtonGroup}>
                            <TouchableOpacity style={[styles.workflowBtnLarge, { backgroundColor: "#10B981" }]} onPress={() => handleWorkflowAction("confirmAccountant")}>
                                <Ionicons name="card" size={20} color="#FFF" />
                                <Text style={styles.workflowBtnTextLarge}>Xác Nhận Chi & Nhập Kho</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.workflowBtnSmall, { backgroundColor: "#FEE2E2" }]} onPress={() => handleWorkflowAction("reject")}>
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Procurement Info Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconCircle, { backgroundColor: "#EFF6FF" }]}>
                            <Ionicons name="layers" size={20} color="#3B82F6" />
                        </View>
                        <Text style={styles.statLabel}>Số lượng</Text>
                        <Text style={styles.statValue}>{equipment.quantity} <Text style={{ fontSize: 12, color: "#6B7280" }}>{equipment.unit || "cái"}</Text></Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconCircle, { backgroundColor: "#ECFDF5" }]}>
                            <Ionicons name="pricetag" size={20} color="#10B981" />
                        </View>
                        <Text style={styles.statLabel}>Đơn giá</Text>
                        <Text style={styles.statValueShort}>{formatCurrency(equipment.purchase_price || 0).replace(" VNĐ", "")}</Text>
                        <Text style={styles.statCurrency}>VNĐ</Text>
                    </View>
                    <View style={[styles.statBox, { flex: 1.2, backgroundColor: "#1B4F72" }]}>
                        <View style={[styles.statIconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                            <Ionicons name="wallet" size={20} color="#FFF" />
                        </View>
                        <Text style={[styles.statLabel, { color: "rgba(255,255,255,0.7)" }]}>Tổng thanh toán</Text>
                        <Text style={[styles.statValue, { color: "#FFF" }]}>{formatCurrency((equipment.quantity || 1) * (equipment.purchase_price || 0))}</Text>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.detailsContainer}>
                    {/* Document / Attachments */}
                    <View style={styles.premiumCard}>
                        <View style={styles.detailHeader}>
                            <Ionicons name="attach" size={20} color="#1B4F72" />
                            <Text style={styles.premiumCardTitle}>Chứng từ & Đính kèm</Text>
                        </View>
                        <UniversalFileUploader
                            multiple={true}
                            initialFiles={equipment.attachments || []}
                            disabled={true}
                            showPreview={true}
                            onUploadComplete={() => {}}
                        />
                    </View>

                    {/* Technical Profile */}
                    <View style={styles.premiumCard}>
                        <View style={styles.detailHeader}>
                            <Ionicons name="construct" size={20} color="#1B4F72" />
                            <Text style={styles.premiumCardTitle}>Thông tin kỹ thuật</Text>
                        </View>
                        
                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Tên thiết bị</Text>
                            <Text style={styles.premiumInfoValue}>{equipment.name}</Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Thương hiệu</Text>
                            <Text style={styles.premiumInfoValue}>{equipment.brand || "---"}</Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Model</Text>
                            <Text style={styles.premiumInfoValue}>{equipment.model || "---"}</Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Số Serial / Khung</Text>
                            <Text style={styles.premiumInfoValue}>{equipment.serial_number || "---"}</Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Mã định danh</Text>
                            <Text style={styles.premiumInfoValue}>{equipment.code || "---"}</Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Danh mục</Text>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>
                                    {CATEGORY_LABELS[equipment.category] || equipment.category || 'Khác'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Procurement Detail */}
                    <View style={styles.premiumCard}>
                        <View style={styles.detailHeader}>
                            <Ionicons name="receipt" size={20} color="#1B4F72" />
                            <Text style={styles.premiumCardTitle}>Chi tiết mua sắm</Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Ngày mua</Text>
                            <Text style={styles.premiumInfoValue}>
                                {equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString('vi-VN') : "---"}
                            </Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Đơn giá</Text>
                            <Text style={[styles.premiumInfoValue, { color: '#059669' }]}>
                                {new Intl.NumberFormat("vi-VN").format(equipment.purchase_price || 0)} <Text style={{ fontSize: 10 }}>VND</Text>
                            </Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Đơn vị tính</Text>
                            <Text style={styles.premiumInfoValue}>{equipment.unit || "Cái"}</Text>
                        </View>

                        <View style={styles.premiumInfoRow}>
                            <Text style={styles.premiumInfoLabel}>Thời gian sử dụng</Text>
                            <Text style={styles.premiumInfoValue}>{equipment.useful_life_months ? `${equipment.useful_life_months} tháng` : "---"}</Text>
                        </View>
                    </View>

                    {equipment.notes && (
                        <View style={styles.premiumCard}>
                             <View style={styles.detailHeader}>
                                <Ionicons name="document-text" size={20} color="#1B4F72" />
                                <Text style={styles.premiumCardTitle}>Ghi chú</Text>
                            </View>
                            <Text style={styles.notesContent}>{equipment.notes}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    setShowEditModal(false);
                    setErrors({});
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <ScreenHeader 
                        title="Chỉnh Sửa Thiết Bị" 
                        leftComponent={
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        }
                    />

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.formSection}>
                            <View style={styles.detailHeader}>
                                <Ionicons name="information-circle" size={20} color="#1B4F72" />
                                <Text style={styles.premiumCardTitle}>Thông tin cơ bản</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Tên thiết bị <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.name && styles.inputError]}
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    placeholder="VD: Máy xúc Hitachi 200"
                                />
                                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Mã thiết bị</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.code}
                                        onChangeText={(text) => setFormData({ ...formData, code: text })}
                                        placeholder="Mã số"
                                    />
                                </View>
                                <PremiumSelect
                                    label="Danh mục"
                                    value={formData.category}
                                    options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
                                    onSelect={(val) => setFormData({ ...formData, category: val as string })}
                                    containerStyle={{ flex: 1 }}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Thương hiệu</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={(formData as any).brand}
                                        onChangeText={(text) => setFormData({ ...formData, brand: text } as any)}
                                        placeholder="Toyota, HP..."
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Model</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={(formData as any).model}
                                        onChangeText={(text) => setFormData({ ...formData, model: text } as any)}
                                        placeholder="Tên dòng máy"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Số Serial / Số khung</Text>
                                <TextInput
                                    style={styles.input}
                                    value={(formData as any).serial_number}
                                    onChangeText={(text) => setFormData({ ...formData, serial_number: text } as any)}
                                    placeholder="SN: 123456789"
                                />
                            </View>

                            <View style={[styles.detailHeader, { marginTop: 24 }]}>
                                <Ionicons name="cart" size={20} color="#1B4F72" />
                                <Text style={styles.premiumCardTitle}>Thông tin mua sắm & Giá trị</Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Số lượng <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.input}
                                        value={(formData as any).quantity}
                                        onChangeText={(text) => setFormData({ ...formData, quantity: text } as any)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Đơn vị</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={(formData as any).unit}
                                        onChangeText={(text) => setFormData({ ...formData, unit: text } as any)}
                                        placeholder="Cái, Bộ..."
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Đơn giá (VNĐ) <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    value={(formData as any).purchase_price}
                                    onChangeText={(text) => setFormData({ ...formData, purchase_price: text } as any)}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày mua (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={(formData as any).purchase_date}
                                    onChangeText={(text) => setFormData({ ...formData, purchase_date: text } as any)}
                                    placeholder="2024-04-08"
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Số tháng sử dụng</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={(formData as any).useful_life_months}
                                        onChangeText={(text) => setFormData({ ...formData, useful_life_months: text } as any)}
                                        keyboardType="numeric"
                                        placeholder="VD: 60"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Giá trị thanh lý</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={(formData as any).residual_value}
                                        onChangeText={(text) => setFormData({ ...formData, residual_value: text } as any)}
                                        keyboardType="numeric"
                                        placeholder="Số tiền"
                                    />
                                </View>
                            </View>

                            <View style={[styles.detailHeader, { marginTop: 24 }]}>
                                <Ionicons name="attach" size={20} color="#1B4F72" />
                                <Text style={styles.premiumCardTitle}>Chứng từ & Đính kèm</Text>
                            </View>

                            <UniversalFileUploader
                                multiple={true}
                                initialFiles={equipment.attachments || []}
                                onUploadComplete={(files) => {
                                    setFormData(prev => ({ 
                                        ...prev, 
                                        attachment_ids: files.map(f => f.attachment_id || f.id).filter(id => !!id) as any 
                                    }));
                                }}
                            />

                            <View style={[styles.detailHeader, { marginTop: 24 }]}>
                                <Ionicons name="stats-chart" size={20} color="#1B4F72" />
                                <Text style={styles.premiumCardTitle}>Khác</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ghi chú</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.notes}
                                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                                    multiline
                                    placeholder="Thêm thông tin bổ sung"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Trạng thái hiện tại</Text>
                                <View style={styles.statusPicker}>
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <TouchableOpacity
                                            key={value}
                                            style={[
                                                styles.statusOption,
                                                formData.status === value && styles.statusOptionSelected,
                                            ]}
                                            onPress={() => setFormData({ ...formData, status: value as any })}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusOptionText,
                                                    formData.status === value && styles.statusOptionTextSelected,
                                                ]}
                                            >
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
                                    Lưu ý: Thay đổi trạng thái tại đây sẽ bỏ qua quy trình duyệt nếu bạn có quyền Admin.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleUpdate}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    content: {
        flex: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerButton: {
        padding: 8,
        marginLeft: 8,
    },
    errorText: {
        fontSize: 16,
        color: "#EF4444",
        marginBottom: 16,
    },
    // Premium Styles
    premiumCard: {
        backgroundColor: "#FFFFFF",
        margin: 16,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#1B4F72",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    cardHeaderWithBadge: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    premiumCardTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1B4F72",
        letterSpacing: -0.5,
    },
    statusBadgeFull: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusTextFull: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    timelineContainer: {
        marginLeft: 10,
        marginBottom: 10,
    },
    timelineItem: {
        flexDirection: "row",
        minHeight: 60,
    },
    timelineLeft: {
        alignItems: "center",
        width: 30,
    },
    timelineIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    timelineIconActive: {
        backgroundColor: "#1B4F72",
        shadowColor: "#1B4F72",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    timelineIconInactive: {
        backgroundColor: "#F3F4F6",
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginVertical: -2,
    },
    timelineLineActive: {
        backgroundColor: "#1B4F72",
    },
    timelineLineInactive: {
        backgroundColor: "#E5E7EB",
    },
    timelineRight: {
        marginLeft: 16,
        paddingBottom: 20,
        flex: 1,
    },
    timelineLabel: {
        fontSize: 15,
        fontWeight: "700",
    },
    timelineLabelActive: {
        color: "#1B4F72",
    },
    timelineLabelInactive: {
        color: "#9CA3AF",
    },
    timelineDesc: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    primaryActionButton: {
        backgroundColor: "#1B4F72",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    primaryActionText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
    actionButtonGroup: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10,
    },
    workflowBtnLarge: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    workflowBtnTextLarge: {
        color: "#FFF",
        fontSize: 15,
        fontWeight: "700",
    },
    workflowBtnSmall: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    statsGrid: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 11,
        color: "#6B7280",
        fontWeight: "600",
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "800",
        color: "#1B4F72",
    },
    statValueShort: {
        fontSize: 16,
        fontWeight: "800",
        color: "#10B981",
    },
    statCurrency: {
        fontSize: 10,
        color: "#9CA3AF",
        fontWeight: "600",
    },
    detailsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    glassCard: {
        backgroundColor: "rgba(255,255,255,0.8)",
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.5)",
    },
    detailHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 8,
    },
    detailTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1B4F72",
    },
    premiumInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    premiumInfoLabel: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    premiumInfoValue: {
        fontSize: 14,
        color: "#1F2937",
        fontWeight: "700",
    },
    categoryBadge: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryBadgeText: {
        fontSize: 12,
        color: "#4B5563",
        fontWeight: "600",
    },
    notesContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
    },
    notesLabel: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
        marginBottom: 4,
    },
    notesContent: {
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 20,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1B4F72",
    },
    modalContent: {
        padding: 20,
    },
    formSection: {
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#FFF",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: "#1F2937",
    },
    textArea: {
        minHeight: 100,
    },
    required: {
        color: "#EF4444",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        padding: 20,
        backgroundColor: "#FFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    modalButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#F3F4F6",
    },
    cancelButtonText: {
        color: "#4B5563",
        fontWeight: "700",
    },
    saveButton: {
        backgroundColor: "#1B4F72",
    },
    saveButtonText: {
        color: "#FFF",
        fontWeight: "700",
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    inputFocused: {
        borderColor: "#1B4F72",
        backgroundColor: "#F0F9FF",
    },
    inputError: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
    },
    statusPicker: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
    },
    statusOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
    },
    statusOptionSelected: {
        borderColor: "#1B4F72",
        backgroundColor: "#F0F9FF",
    },
    statusOptionText: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "600",
    },
    statusOptionTextSelected: {
        color: "#1B4F72",
    },
});

