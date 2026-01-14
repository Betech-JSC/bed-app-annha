import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { budgetApi, CreateBudgetData } from "@/api/budgetApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditBudgetScreen() {
    const router = useRouter();
    const { id, budgetId } = useLocalSearchParams<{ id: string; budgetId: string }>();
    const tabBarHeight = useTabBarHeight();
    const insets = useSafeAreaInsets();
    const [formData, setFormData] = useState<Partial<CreateBudgetData>>({
        name: "",
        version: "",
        budget_date: "",
        notes: "",
        items: [],
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBudget();
    }, [id, budgetId]);

    useFocusEffect(
        React.useCallback(() => {
            if (budgetId) {
                loadBudget();
            }
        }, [id, budgetId])
    );

    const loadBudget = async () => {
        try {
            setLoading(true);
            const response = await budgetApi.getBudget(Number(id), Number(budgetId));
            if (response.success) {
                const budget = response.data;
                setFormData({
                    name: budget.name || "",
                    version: budget.version || "",
                    budget_date: budget.budget_date || "",
                    notes: budget.notes || "",
                    items: budget.items || [],
                });
            }
        } catch (error) {
            console.error("Error loading budget:", error);
            Alert.alert("Lỗi", "Không thể tải thông tin ngân sách");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        // Validate
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) {
            newErrors.name = "Vui lòng nhập tên ngân sách";
        }
        if (!formData.budget_date) {
            newErrors.budget_date = "Vui lòng chọn ngày lập ngân sách";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            setSubmitting(true);
            const response = await budgetApi.updateBudget(Number(id), Number(budgetId), formData as CreateBudgetData);
            if (response.success) {
                Alert.alert("Thành công", "Đã cập nhật ngân sách thành công", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || "Không thể cập nhật ngân sách";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Sửa Ngân Sách" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Sửa Ngân Sách"
                showBackButton
            />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(insets.bottom + tabBarHeight + 40, 100) }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                >
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <View style={styles.labelContainer}>
                                <Text style={styles.label}>Tên ngân sách</Text>
                                <Text style={styles.required}>*</Text>
                            </View>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedField === "name" && styles.inputFocused,
                                    errors.name && styles.inputError,
                                ]}
                                placeholder="Nhập tên ngân sách"
                                placeholderTextColor="#9CA3AF"
                                value={formData.name}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, name: text });
                                    if (errors.name) setErrors({ ...errors, name: "" });
                                }}
                                onFocus={() => setFocusedField("name")}
                                onBlur={() => setFocusedField(null)}
                            />
                            {errors.name && (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                    <Text style={styles.errorText}>{errors.name}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Phiên bản</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    focusedField === "version" && styles.inputFocused,
                                ]}
                                placeholder="1.0"
                                placeholderTextColor="#9CA3AF"
                                value={formData.version}
                                onChangeText={(text) => setFormData({ ...formData, version: text })}
                                onFocus={() => setFocusedField("version")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <View style={styles.labelContainer}>
                                <Text style={styles.label}>Ngày lập ngân sách</Text>
                                <Text style={styles.required}>*</Text>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.dateInput,
                                    focusedField === "budget_date" && styles.inputFocused,
                                    errors.budget_date && styles.inputError,
                                ]}
                                onPress={() => {
                                    setShowDatePicker(true);
                                    setFocusedField("budget_date");
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={formData.budget_date ? {} : styles.placeholderText}>
                                    {formData.budget_date
                                        ? new Date(formData.budget_date).toLocaleDateString("vi-VN")
                                        : "Chọn ngày"}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={formData.budget_date ? new Date(formData.budget_date) : new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, date) => {
                                        setShowDatePicker(false);
                                        setFocusedField(null);
                                        if (date) {
                                            setFormData({
                                                ...formData,
                                                budget_date: date.toISOString().split("T")[0],
                                            });
                                            if (errors.budget_date) setErrors({ ...errors, budget_date: "" });
                                        }
                                    }}
                                />
                            )}
                            {errors.budget_date && (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                    <Text style={styles.errorText}>{errors.budget_date}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Ghi chú</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                    focusedField === "notes" && styles.inputFocused,
                                ]}
                                placeholder="Nhập ghi chú..."
                                placeholderTextColor="#9CA3AF"
                                value={formData.notes}
                                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                onFocus={() => setFocusedField("notes")}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleUpdate}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            {submitting ? (
                                <View style={styles.buttonContent}>
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                    <Text style={styles.submitButtonText}>Đang cập nhật...</Text>
                                </View>
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                    <Text style={styles.submitButtonText}>Cập Nhật</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 8,
    },
    formSection: {
        marginBottom: 24,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    formGroup: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    required: {
        fontSize: 14,
        fontWeight: "600",
        color: "#EF4444",
    },
    input: {
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        backgroundColor: "#FFFFFF",
        color: "#1F2937",
        minHeight: 48,
    },
    inputFocused: {
        borderColor: "#3B82F6",
        backgroundColor: "#F0F9FF",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputError: {
        borderColor: "#EF4444",
        backgroundColor: "#FEF2F2",
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
        paddingTop: 14,
    },
    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        backgroundColor: "#FFFFFF",
        minHeight: 48,
    },
    placeholderText: {
        color: "#9CA3AF",
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
    },
    errorText: {
        fontSize: 12,
        color: "#EF4444",
        flex: 1,
    },
    buttonContainer: {
        marginTop: 24,
        marginBottom: 16,
        paddingBottom: 8,
    },
    submitButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0.1,
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
});
