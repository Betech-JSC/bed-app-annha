import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
    employmentContractApi,
    EmploymentContract,
    CreateEmploymentContractData,
} from "@/api/employmentContractApi";
import { employeesApi } from "@/api/employeesApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
    probation: "Thử việc",
    fixed_term: "Có thời hạn",
    indefinite: "Không thời hạn",
    part_time: "Bán thời gian",
    internship: "Thực tập",
};

export default function EmploymentContractsScreen() {
    const router = useRouter();
    const [contracts, setContracts] = useState<EmploymentContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingContract, setEditingContract] = useState<EmploymentContract | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [formData, setFormData] = useState<Partial<CreateEmploymentContractData>>({
        user_id: undefined,
        contract_type: "fixed_term",
        start_date: new Date().toISOString().split("T")[0],
        end_date: undefined,
        base_salary: 0,
        job_title: "",
        job_description: "",
        benefits: "",
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showEmployeePicker, setShowEmployeePicker] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadContracts();
        loadEmployees();
    }, []);

    const loadContracts = async () => {
        try {
            setLoading(true);
            const response = await employmentContractApi.getContracts();
            if (response.success) {
                setContracts(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading contracts:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const response = await employeesApi.getEmployees({ page: 1, per_page: 1000 });
            if (response.success) {
                setEmployees(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading employees:", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadContracts();
    };

    const handleCreate = async () => {
        if (!formData.user_id || !formData.start_date || !formData.base_salary) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            setSubmitting(true);
            const response = editingContract
                ? await employmentContractApi.updateContract(editingContract.id, formData as any)
                : await employmentContractApi.createContract(formData as CreateEmploymentContractData);

            if (response.success) {
                Alert.alert("Thành công", editingContract ? "Đã cập nhật hợp đồng" : "Đã tạo hợp đồng thành công");
                setShowCreateModal(false);
                resetForm();
                loadContracts();
            }
        } catch (error: any) {
            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể thực hiện thao tác";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (contract: EmploymentContract) => {
        setEditingContract(contract);
        setFormData({
            user_id: contract.user_id,
            contract_type: contract.contract_type,
            start_date: contract.start_date.split("T")[0],
            end_date: contract.end_date ? contract.end_date.split("T")[0] : undefined,
            base_salary: contract.base_salary,
            job_title: contract.job_title || "",
            job_description: contract.job_description || "",
            benefits: contract.benefits || "",
        });
        const employee = employees.find((e) => e.id === contract.user_id);
        if (employee) {
            setSelectedEmployee(employee);
        }
        setShowCreateModal(true);
    };

    const handleRenew = async (contract: EmploymentContract) => {
        Alert.prompt(
            "Gia hạn hợp đồng",
            "Nhập ngày kết thúc mới (YYYY-MM-DD):",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Gia hạn",
                    onPress: async (endDate) => {
                        if (!endDate) {
                            Alert.alert("Lỗi", "Vui lòng nhập ngày kết thúc");
                            return;
                        }
                        try {
                            const response = await employmentContractApi.renewContract(contract.id, {
                                end_date: endDate,
                            });
                            if (response.success) {
                                Alert.alert("Thành công", "Đã gia hạn hợp đồng");
                                loadContracts();
                            }
                        } catch (error: any) {
                            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể gia hạn hợp đồng";
                            Alert.alert("Lỗi", errorMessage);
                        }
                    },
                },
            ],
            "plain-text"
        );
    };

    const handleTerminate = async (contract: EmploymentContract) => {
        Alert.prompt(
            "Chấm dứt hợp đồng",
            "Nhập lý do chấm dứt:",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Chấm dứt",
                    onPress: async (reason) => {
                        if (!reason) {
                            Alert.alert("Lỗi", "Vui lòng nhập lý do chấm dứt");
                            return;
                        }
                        try {
                            const response = await employmentContractApi.terminateContract(contract.id, {
                                termination_reason: reason,
                                terminated_date: new Date().toISOString().split("T")[0],
                            });
                            if (response.success) {
                                Alert.alert("Thành công", "Đã chấm dứt hợp đồng");
                                loadContracts();
                            }
                        } catch (error: any) {
                            const errorMessage = error.userMessage || error.response?.data?.message || "Không thể chấm dứt hợp đồng";
                            Alert.alert("Lỗi", errorMessage);
                        }
                    },
                },
            ],
            "plain-text"
        );
    };

    const resetForm = () => {
        setEditingContract(null);
        setSelectedEmployee(null);
        setFormData({
            user_id: undefined,
            contract_type: "fixed_term",
            start_date: new Date().toISOString().split("T")[0],
            end_date: undefined,
            base_salary: 0,
            job_title: "",
            job_description: "",
            benefits: "",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "#10B981";
            case "expired":
                return "#F59E0B";
            case "terminated":
                return "#EF4444";
            default:
                return "#6B7280";
        }
    };

    const renderItem = ({ item }: { item: EmploymentContract }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>
                        {item.user?.name || `Hợp đồng #${item.id}`}
                    </Text>
                    <Text style={styles.cardType}>
                        {CONTRACT_TYPE_LABELS[item.contract_type]}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + "20" },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status === "active"
                            ? "Đang hiệu lực"
                            : item.status === "expired"
                                ? "Hết hạn"
                                : item.status === "terminated"
                                    ? "Đã chấm dứt"
                                    : "Nháp"}
                    </Text>
                </View>
            </View>
            <Text style={styles.salaryText}>{formatCurrency(item.base_salary)}</Text>
            <Text style={styles.dateText}>
                {new Date(item.start_date).toLocaleDateString("vi-VN")}
                {item.end_date && ` - ${new Date(item.end_date).toLocaleDateString("vi-VN")}`}
            </Text>
            {item.job_title && <Text style={styles.jobTitleText}>{item.job_title}</Text>}
            <View style={styles.cardActions}>
                {item.status === "active" && (
                    <>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleRenew(item)}
                        >
                            <Ionicons name="refresh" size={18} color="#3B82F6" />
                            <Text style={styles.actionText}>Gia hạn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.terminateButton]}
                            onPress={() => handleTerminate(item)}
                        >
                            <Ionicons name="close-circle" size={18} color="#EF4444" />
                            <Text style={[styles.actionText, styles.terminateText]}>Chấm dứt</Text>
                        </TouchableOpacity>
                    </>
                )}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(item)}
                >
                    <Ionicons name="pencil" size={18} color="#3B82F6" />
                    <Text style={styles.actionText}>Sửa</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Hợp Đồng Lao Động"
                showBackButton
                rightComponent={
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                    >
                        <Ionicons name="add" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={contracts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Chưa có hợp đồng</Text>
                        </View>
                    }
                />
            )}

            {/* Create/Edit Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalContainer}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingContract ? "Sửa Hợp Đồng" : "Tạo Hợp Đồng"}
                            </Text>
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
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Nhân viên *</Text>
                                <TouchableOpacity
                                    style={styles.selectInput}
                                    onPress={() => setShowEmployeePicker(true)}
                                >
                                    <Text style={selectedEmployee ? {} : styles.placeholderText}>
                                        {selectedEmployee ? selectedEmployee.name : "Chọn nhân viên"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showEmployeePicker && (
                                    <Modal
                                        visible={showEmployeePicker}
                                        transparent={true}
                                        animationType="slide"
                                        onRequestClose={() => setShowEmployeePicker(false)}
                                    >
                                        <View style={styles.pickerOverlay}>
                                            <View style={styles.pickerContent}>
                                                <View style={styles.pickerHeader}>
                                                    <Text style={styles.pickerTitle}>Chọn nhân viên</Text>
                                                    <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
                                                        <Ionicons name="close" size={24} color="#1F2937" />
                                                    </TouchableOpacity>
                                                </View>
                                                <FlatList
                                                    data={employees}
                                                    keyExtractor={(item) => item.id.toString()}
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity
                                                            style={styles.pickerItem}
                                                            onPress={() => {
                                                                setSelectedEmployee(item);
                                                                setFormData({ ...formData, user_id: item.id });
                                                                setShowEmployeePicker(false);
                                                            }}
                                                        >
                                                            <Text>{item.name}</Text>
                                                            {selectedEmployee?.id === item.id && (
                                                                <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                                            )}
                                                        </TouchableOpacity>
                                                    )}
                                                />
                                            </View>
                                        </View>
                                    </Modal>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Loại hợp đồng *</Text>
                                <View style={styles.typeContainer}>
                                    {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.typeButton,
                                                formData.contract_type === key && styles.typeButtonActive,
                                            ]}
                                            onPress={() => setFormData({ ...formData, contract_type: key as any })}
                                        >
                                            <Text
                                                style={[
                                                    styles.typeButtonText,
                                                    formData.contract_type === key && styles.typeButtonTextActive,
                                                ]}
                                            >
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Ngày bắt đầu *</Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <Text>{formData.start_date}</Text>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                                {showStartDatePicker && (
                                    <DateTimePicker
                                        value={new Date(formData.start_date || new Date())}
                                        mode="date"
                                        display="default"
                                        onChange={(event, date) => {
                                            setShowStartDatePicker(false);
                                            if (date) {
                                                setFormData({
                                                    ...formData,
                                                    start_date: date.toISOString().split("T")[0],
                                                });
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {formData.contract_type !== "indefinite" && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Ngày kết thúc</Text>
                                    <TouchableOpacity
                                        style={styles.dateInput}
                                        onPress={() => setShowEndDatePicker(true)}
                                    >
                                        <Text>{formData.end_date || "Chọn ngày"}</Text>
                                        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                    {showEndDatePicker && (
                                        <DateTimePicker
                                            value={
                                                formData.end_date
                                                    ? new Date(formData.end_date)
                                                    : new Date(formData.start_date || new Date())
                                            }
                                            mode="date"
                                            display="default"
                                            minimumDate={new Date(formData.start_date || new Date())}
                                            onChange={(event, date) => {
                                                setShowEndDatePicker(false);
                                                if (date) {
                                                    setFormData({
                                                        ...formData,
                                                        end_date: date.toISOString().split("T")[0],
                                                    });
                                                }
                                            }}
                                        />
                                    )}
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Lương cơ bản *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={formData.base_salary?.toString()}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, base_salary: parseFloat(text) || 0 })
                                    }
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Chức danh</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập chức danh"
                                    value={formData.job_title}
                                    onChangeText={(text) => setFormData({ ...formData, job_title: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Mô tả công việc</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Nhập mô tả công việc"
                                    value={formData.job_description}
                                    onChangeText={(text) => setFormData({ ...formData, job_description: text })}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Phúc lợi</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Nhập phúc lợi"
                                    value={formData.benefits}
                                    onChangeText={(text) => setFormData({ ...formData, benefits: text })}
                                    multiline
                                    numberOfLines={3}
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
                                    <Text style={styles.submitButtonText}>
                                        {editingContract ? "Cập Nhật" : "Tạo Mới"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
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
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
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
    cardType: {
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
    salaryText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#3B82F6",
        marginTop: 8,
    },
    dateText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    jobTitleText: {
        fontSize: 14,
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
    terminateButton: {
        backgroundColor: "#FEE2E2",
    },
    actionText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "500",
    },
    terminateText: {
        color: "#EF4444",
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
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    selectInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFFFFF",
    },
    placeholderText: {
        color: "#9CA3AF",
    },
    typeContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    typeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    typeButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    typeButtonText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    typeButtonTextActive: {
        color: "#FFFFFF",
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
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    pickerContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "70%",
        padding: 16,
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
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
        borderBottomColor: "#E5E7EB",
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
});

