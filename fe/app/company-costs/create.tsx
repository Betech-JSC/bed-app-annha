import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { companyCostApi, CreateCompanyCostData, CompanyCost } from '@/api/companyCostApi';
import { costGroupApi, CostGroup } from '@/api/costGroupApi';
import { supplierApi } from '@/api/supplierApi';
import { inputInvoiceApi } from '@/api/inputInvoiceApi';
import { ScreenHeader } from '@/components';
import UniversalFileUploader, { UploadedFile } from '@/components/UniversalFileUploader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function CreateCompanyCostScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const costId = params.id ? parseInt(params.id as string) : null;
    const isEditing = !!costId;
    const tabBarHeight = useTabBarHeight();

    const [loading, setLoading] = useState(isEditing);
    const [submitting, setSubmitting] = useState(false);
    const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    // Form data
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [costGroupId, setCostGroupId] = useState<number | null>(null);
    const [supplierId, setSupplierId] = useState<number | null>(null);
    const [invoiceId, setInvoiceId] = useState<number | null>(null);
    const [costDate, setCostDate] = useState(new Date());
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadCostGroups();
        loadSuppliers();
        loadInvoices();
        if (isEditing) {
            loadCost();
        }
    }, []);

    const loadCostGroups = async () => {
        try {
            const response = await costGroupApi.getCostGroups();
            if (response.success && response.data) {
                // Handle both array and paginated response
                const groups = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || [];
                setCostGroups(groups);
            } else if (Array.isArray(response)) {
                // Direct array response
                setCostGroups(response);
            }
        } catch (error) {
            console.error('Error loading cost groups:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách nhóm chi phí');
        }
    };

    const loadSuppliers = async () => {
        try {
            const response = await supplierApi.getSuppliers({ active_only: true });
            if (response.success && response.data) {
                const supplierList = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || [];
                setSuppliers(supplierList);
            }
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    };

    const loadInvoices = async () => {
        try {
            const response = await inputInvoiceApi.getAll({ per_page: 100 });
            if (response.success && response.data) {
                const invoiceList = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || [];
                setInvoices(invoiceList);
            }
        } catch (error) {
            console.error('Error loading invoices:', error);
        }
    };

    const loadCost = async () => {
        if (!costId) return;

        try {
            setLoading(true);
            const response = await companyCostApi.getCompanyCost(costId);
            if (response.success) {
                const cost: CompanyCost = response.data;
                setName(cost.name);
                setAmount(cost.amount.toString());
                setCostGroupId(cost.cost_group_id);
                setSupplierId(cost.supplier_id || null);
                setInvoiceId(cost.input_invoice_id || null);
                setCostDate(new Date(cost.cost_date));
                setDescription(cost.description || '');
                setQuantity(cost.quantity?.toString() || '');
                setUnit(cost.unit || '');
                if (cost.attachments) {
                    setUploadedFiles(cost.attachments.map(att => ({
                        id: att.id,
                        attachment_id: att.id,
                        file_url: att.file_url,
                        url: att.file_url,
                        original_name: att.original_name,
                        type: att.type as any,
                    })));
                }
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
        // Validation
        if (!name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên chi phí');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
            return;
        }
        if (!costGroupId) {
            Alert.alert('Lỗi', 'Vui lòng chọn nhóm chi phí');
            return;
        }

        try {
            setSubmitting(true);

            const data: CreateCompanyCostData = {
                name: name.trim(),
                amount: parseFloat(amount),
                cost_group_id: costGroupId,
                cost_date: costDate.toISOString().split('T')[0],
                description: description.trim() || undefined,
                quantity: quantity ? parseFloat(quantity) : undefined,
                unit: unit.trim() || undefined,
                supplier_id: supplierId || undefined,
                input_invoice_id: invoiceId || undefined,
                attachment_ids: uploadedFiles.map(f => f.attachment_id || f.id!),
            };

            const response = isEditing
                ? await companyCostApi.updateCompanyCost(costId!, data)
                : await companyCostApi.createCompanyCost(data);

            if (response.success) {
                Alert.alert(
                    'Thành công',
                    isEditing ? 'Đã cập nhật chi phí công ty' : 'Đã tạo chi phí công ty thành công',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back(),
                        },
                    ]
                );
            }
        } catch (error: any) {
            console.error('Error saving cost:', error);
            const errorMessage = error.response?.data?.message || 'Không thể lưu chi phí';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setCostDate(selectedDate);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={isEditing ? 'Sửa Chi Phí Công Ty' : 'Tạo Chi Phí Công Ty'}
                showBackButton
            />

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: tabBarHeight + 100 }
                    ]}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Tên chi phí */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tên chi phí *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập tên chi phí"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    {/* Nhóm chi phí */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nhóm chi phí *</Text>
                        {costGroups.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>
                                    Không có nhóm chi phí. Vui lòng tạo nhóm chi phí trước.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.pickerContainer}>
                                {costGroups.map((group) => (
                                    <TouchableOpacity
                                        key={group.id}
                                        style={[
                                            styles.pickerOption,
                                            costGroupId === group.id && styles.pickerOptionSelected,
                                        ]}
                                        onPress={() => setCostGroupId(group.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.pickerOptionText,
                                                costGroupId === group.id && styles.pickerOptionTextSelected,
                                            ]}
                                        >
                                            {group.name}
                                        </Text>
                                        {costGroupId === group.id && (
                                            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Nhà cung cấp (Optional) */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nhà cung cấp (Tùy chọn)</Text>
                        <View style={styles.pickerContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    !supplierId && styles.pickerOptionSelected,
                                ]}
                                onPress={() => setSupplierId(null)}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    !supplierId && styles.pickerOptionTextSelected,
                                ]}>
                                    Không chọn
                                </Text>
                            </TouchableOpacity>
                            {suppliers.map((supplier) => (
                                <TouchableOpacity
                                    key={supplier.id}
                                    style={[
                                        styles.pickerOption,
                                        supplierId === supplier.id && styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => setSupplierId(supplier.id)}
                                >
                                    <Text style={[
                                        styles.pickerOptionText,
                                        supplierId === supplier.id && styles.pickerOptionTextSelected,
                                    ]}>
                                        {supplier.name}
                                    </Text>
                                    {supplierId === supplier.id && (
                                        <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Hóa đơn đầu vào (Optional) */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Hóa đơn đầu vào (Tùy chọn)</Text>
                        <View style={styles.pickerContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    !invoiceId && styles.pickerOptionSelected,
                                ]}
                                onPress={() => setInvoiceId(null)}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    !invoiceId && styles.pickerOptionTextSelected,
                                ]}>
                                    Không chọn
                                </Text>
                            </TouchableOpacity>
                            {invoices.map((invoice) => (
                                <TouchableOpacity
                                    key={invoice.id}
                                    style={[
                                        styles.pickerOption,
                                        invoiceId === invoice.id && styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => setInvoiceId(invoice.id)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[
                                            styles.pickerOptionText,
                                            invoiceId === invoice.id && styles.pickerOptionTextSelected,
                                        ]}>
                                            {invoice.invoice_number || `HD-${invoice.id}`}
                                        </Text>
                                        <Text style={styles.pickerOptionSubtext}>
                                            {invoice.supplier_name} - {new Date(invoice.issue_date).toLocaleDateString('vi-VN')}
                                        </Text>
                                    </View>
                                    {invoiceId === invoice.id && (
                                        <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Số tiền */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Số tiền (VNĐ) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Ngày chi phí */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Ngày chi phí *</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                            <Text style={styles.dateButtonText}>
                                {costDate.toLocaleDateString('vi-VN')}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={costDate}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                            />
                        )}
                    </View>

                    {/* Số lượng */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Số lượng</Text>
                        <View style={styles.quantityRow}>
                            <TextInput
                                style={[styles.input, styles.quantityInput]}
                                placeholder="0"
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="numeric"
                            />
                            <TextInput
                                style={[styles.input, styles.unitInput]}
                                placeholder="Đơn vị"
                                value={unit}
                                onChangeText={setUnit}
                            />
                        </View>
                    </View>

                    {/* Mô tả */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mô tả</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Nhập mô tả chi tiết"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* File upload */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tài liệu đính kèm</Text>
                        <UniversalFileUploader
                            onUploadComplete={setUploadedFiles}
                            multiple={true}
                            maxFiles={5}
                            initialFiles={uploadedFiles}
                            accept="all"
                            label="Chọn file đính kèm"
                        />
                    </View>

                    {/* Submit button */}
                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isEditing ? 'Cập Nhật' : 'Tạo Chi Phí'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
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
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        gap: 8,
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    pickerOptionSelected: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    pickerOptionText: {
        fontSize: 16,
        color: '#1F2937',
    },
    pickerOptionTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    pickerOptionSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    dateButtonText: {
        fontSize: 16,
        color: '#1F2937',
    },
    quantityRow: {
        flexDirection: 'row',
        gap: 12,
    },
    quantityInput: {
        flex: 1,
    },
    unitInput: {
        flex: 1,
    },
    submitButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyState: {
        padding: 20,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    emptyStateText: {
        fontSize: 14,
        color: '#991B1B',
        textAlign: 'center',
    },
});
