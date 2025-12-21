import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { employeesApi } from "@/api/employeesApi";
import { employeeProfileApi } from "@/api/employeeProfileApi";
import { formatVNDWithoutSymbol } from "@/utils/format";

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
    official: "Nhân sự chính thức",
    temporary: "Nhân sự thời vụ / khoán",
    contracted: "Nhân sự thuê ngoài / thầu phụ",
    engineer: "Kỹ sư – chỉ huy trưởng – giám sát",
    worker: "Công nhân theo đội / tổ / nhà thầu",
};

export default function EmployeeDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const employeeId = params.id as string;

    const [employee, setEmployee] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (employeeId) {
            loadData();
        }
    }, [employeeId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [employeeRes, profileRes, statsRes] = await Promise.all([
                employeesApi.getEmployeeById(parseInt(employeeId)),
                employeeProfileApi.getProfileByUserId(parseInt(employeeId)).catch(() => ({ success: false })),
                employeesApi.getEmployeeStats(parseInt(employeeId)).catch(() => ({ success: false })),
            ]);

            if (employeeRes.success) {
                setEmployee(employeeRes.data);
            }

            if (profileRes.success) {
                setProfile(profileRes.data);
            }

            if (statsRes.success) {
                setStats(statsRes.data);
            }
        } catch (error) {
            console.error("Error loading employee data:", error);
            Alert.alert("Lỗi", "Không thể tải thông tin nhân viên");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!employee) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Không tìm thấy nhân viên</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Chi Tiết Nhân Viên</Text>
                    <Text style={styles.headerSubtitle}>{employee.name || employee.email}</Text>
                </View>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Basic Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person" size={24} color="#3B82F6" />
                        <Text style={styles.cardTitle}>Thông Tin Cơ Bản</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Họ tên:</Text>
                        <Text style={styles.infoValue}>{employee.name || "N/A"}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{employee.email || "N/A"}</Text>
                    </View>
                    {employee.phone && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Số điện thoại:</Text>
                            <Text style={styles.infoValue}>{employee.phone}</Text>
                        </View>
                    )}
                    {employee.role && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Vai trò:</Text>
                            <Text style={styles.infoValue}>{employee.role}</Text>
                        </View>
                    )}
                </View>

                {/* Employee Profile Card */}
                {profile && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="document-text" size={24} color="#10B981" />
                            <Text style={styles.cardTitle}>Hồ Sơ Nhân Sự</Text>
                        </View>
                        {profile.employee_code && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Mã nhân sự:</Text>
                                <Text style={styles.infoValue}>{profile.employee_code}</Text>
                            </View>
                        )}
                        {profile.full_name && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Họ tên đầy đủ:</Text>
                                <Text style={styles.infoValue}>{profile.full_name}</Text>
                            </View>
                        )}
                        {profile.cccd && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>CCCD:</Text>
                                <Text style={styles.infoValue}>{profile.cccd}</Text>
                            </View>
                        )}
                        {profile.date_of_birth && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Ngày sinh:</Text>
                                <Text style={styles.infoValue}>
                                    {new Date(profile.date_of_birth).toLocaleDateString("vi-VN")}
                                </Text>
                            </View>
                        )}
                        {profile.place_of_birth && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Quê quán:</Text>
                                <Text style={styles.infoValue}>{profile.place_of_birth}</Text>
                            </View>
                        )}
                        {profile.emergency_contact_name && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Người liên hệ khẩn cấp:</Text>
                                <Text style={styles.infoValue}>
                                    {profile.emergency_contact_name}
                                    {profile.emergency_contact_phone && ` - ${profile.emergency_contact_phone}`}
                                </Text>
                            </View>
                        )}
                        {profile.education_level && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Trình độ học vấn:</Text>
                                <Text style={styles.infoValue}>{profile.education_level}</Text>
                            </View>
                        )}
                        {profile.skills && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tay nghề:</Text>
                                <Text style={styles.infoValue}>{profile.skills}</Text>
                            </View>
                        )}
                        {profile.employee_type && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Loại nhân sự:</Text>
                                <Text style={styles.infoValue}>
                                    {EMPLOYEE_TYPE_LABELS[profile.employee_type] || profile.employee_type}
                                </Text>
                            </View>
                        )}
                        {profile.team_name && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Đội/Tổ/Nhà thầu:</Text>
                                <Text style={styles.infoValue}>{profile.team_name}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Statistics Card */}
                {stats && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="stats-chart" size={24} color="#F59E0B" />
                            <Text style={styles.cardTitle}>Thống Kê</Text>
                        </View>
                        {stats.time_tracking && (
                            <>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Tổng giờ làm việc (tháng này):</Text>
                                    <Text style={styles.infoValue}>
                                        {(stats.time_tracking.total_hours || 0).toFixed(1)} giờ
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Tổng ngày làm việc (tháng này):</Text>
                                    <Text style={styles.infoValue}>
                                        {stats.time_tracking.total_days || 0} ngày
                                    </Text>
                                </View>
                            </>
                        )}
                        {stats.payroll && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tổng lương (tháng này):</Text>
                                <Text style={styles.infoValue}>
                                    {formatVNDWithoutSymbol(stats.payroll.total_salary || 0)}
                                </Text>
                            </View>
                        )}
                        {stats.bonuses && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tổng thưởng (tháng này):</Text>
                                <Text style={styles.infoValue}>
                                    {formatVNDWithoutSymbol(stats.bonuses.total || 0)} ({stats.bonuses.count || 0} lần)
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/hr/user-permissions?id=${employeeId}`)}
                    >
                        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                        <Text style={styles.actionButtonText}>Quản lý quyền</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/hr/employee-profiles`)}
                    >
                        <Ionicons name="document-text" size={20} color="#3B82F6" />
                        <Text style={[styles.actionButtonText, { color: "#3B82F6" }]}>Hồ sơ nhân sự</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    errorText: {
        fontSize: 16,
        color: "#EF4444",
        marginBottom: 16,
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
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 2,
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    infoLabel: {
        fontSize: 14,
        color: "#6B7280",
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        flex: 2,
        textAlign: "right",
    },
    actionsContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#10B981",
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#3B82F6",
    },
});

