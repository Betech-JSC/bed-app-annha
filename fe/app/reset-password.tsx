// Reset Password Screen
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MaterialIcons } from "@expo/vector-icons";
import api from "@/api/api";

export default function ResetPasswordScreen() {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.user);
    const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();

    // Tất cả hooks phải được gọi trước conditional return
    const [formData, setFormData] = useState({
        email: email || "",
        password: "",
        confirmPassword: "",
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);

    // Redirect nếu đã đăng nhập (trừ khi có token reset password từ email)
    useEffect(() => {
        // Nếu có token reset password từ email, cho phép truy cập
        if (token) {
            return;
        }
        
        if (user?.token && user?.role) {
            if (user.role === "sender") {
                router.replace("/(tabs)/(sender)/home");
            } else if (user.role === "customer") {
                router.replace("/(tabs)/(customer)/home_customer");
            }
        }
    }, [user, router, token]);

    // Nếu đang check auth và không có token reset, hiển thị loading
    if (user?.token && user?.role && !token) {
        return (
            <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.email.trim()) {
            newErrors.email = "Vui lòng nhập email";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Email không hợp lệ";
        }

        if (!formData.password) {
            newErrors.password = "Vui lòng nhập mật khẩu mới";
        } else if (formData.password.length < 8) {
            newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
        }

        if (!token) {
            Alert.alert("Lỗi", "Token không hợp lệ. Vui lòng yêu cầu link đặt lại mật khẩu mới.");
            return false;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/reset-password", {
                token: token,
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                password_confirmation: formData.confirmPassword,
            });

            if (response.data?.success || response.status === 200) {
                setSuccess(true);
                Alert.alert(
                    "Thành công",
                    "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.",
                    [
                        {
                            text: "Đăng nhập",
                            onPress: () => router.replace("/login"),
                        },
                    ]
                );
            } else {
                throw new Error(response.data?.message || "Không thể đặt lại mật khẩu");
            }
        } catch (error: any) {
            console.error("Reset password error:", error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Không thể đặt lại mật khẩu. Token có thể đã hết hạn. Vui lòng yêu cầu link mới.";

            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                const newErrors: { [key: string]: string } = {};
                Object.keys(backendErrors).forEach((key) => {
                    newErrors[key] = Array.isArray(backendErrors[key])
                        ? backendErrors[key][0]
                        : backendErrors[key];
                });
                setErrors(newErrors);
            } else {
                Alert.alert("Lỗi", errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <View className="flex-1 items-center justify-center px-6">
                    <MaterialIcons name="error-outline" size={64} color="#EF4444" />
                    <Text className="text-xl font-bold text-text-primary dark:text-white mb-2 mt-4 text-center">
                        Token không hợp lệ
                    </Text>
                    <Text className="text-base text-center text-text-secondary dark:text-gray-400 mb-6">
                        Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/forgot-password")}
                        className="bg-primary rounded-2xl px-6 py-3"
                    >
                        <Text className="text-white font-semibold">Yêu cầu link mới</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View className="px-6 pt-6 pb-4">
                        <TouchableOpacity onPress={() => router.back()} className="mb-4">
                            <MaterialIcons name="arrow-back" size={28} color="#1F2937" className="dark:text-white" />
                        </TouchableOpacity>
                        <View className="items-center mb-6">
                            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                                <MaterialIcons name="lock-open" size={40} color="#2563EB" />
                            </View>
                            <Text className="text-3xl font-bold text-text-primary dark:text-white mb-2">
                                Đặt lại mật khẩu
                            </Text>
                            <Text className="text-base text-center text-text-secondary dark:text-gray-400 max-w-xs">
                                Nhập mật khẩu mới của bạn
                            </Text>
                        </View>
                    </View>

                    {/* Form */}
                    <View className="flex-1 px-6 py-4">
                        {success ? (
                            <View className="items-center justify-center flex-1">
                                <View className="h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                                    <MaterialIcons name="check-circle" size={48} color="#10B981" />
                                </View>
                                <Text className="text-xl font-bold text-text-primary dark:text-white mb-2 text-center">
                                    Mật khẩu đã được đặt lại!
                                </Text>
                                <Text className="text-base text-center text-text-secondary dark:text-gray-400 max-w-xs mb-6">
                                    Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.replace("/login")}
                                    className="bg-primary rounded-2xl px-6 py-3"
                                >
                                    <Text className="text-white font-semibold">Đăng nhập ngay</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="gap-5">
                                {/* Email */}
                                <View>
                                    <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                                        Email <Text className="text-red-500">*</Text>
                                    </Text>
                                    <TextInput
                                        className={`border rounded-2xl px-4 py-4 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${
                                            errors.email
                                                ? "border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}
                                        placeholder="example@email.com"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={formData.email}
                                        onChangeText={(value) => {
                                            setFormData({ ...formData, email: value });
                                            if (errors.email) setErrors({ ...errors, email: "" });
                                        }}
                                        editable={!loading}
                                    />
                                    {errors.email && (
                                        <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>
                                    )}
                                </View>

                                {/* Password */}
                                <View>
                                    <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                                        Mật khẩu mới <Text className="text-red-500">*</Text>
                                    </Text>
                                    <View className="relative">
                                        <TextInput
                                            className={`border rounded-2xl px-4 py-4 pr-12 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${
                                                errors.password
                                                    ? "border-red-500"
                                                    : "border-gray-300 dark:border-gray-600"
                                            }`}
                                            placeholder="Ít nhất 8 ký tự"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showPassword}
                                            value={formData.password}
                                            onChangeText={(value) => {
                                                setFormData({ ...formData, password: value });
                                                if (errors.password) setErrors({ ...errors, password: "" });
                                            }}
                                            editable={!loading}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-4"
                                        >
                                            <MaterialIcons
                                                name={showPassword ? "visibility" : "visibility-off"}
                                                size={24}
                                                color="#6B7280"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {errors.password && (
                                        <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>
                                    )}
                                </View>

                                {/* Confirm Password */}
                                <View>
                                    <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                                        Xác nhận mật khẩu <Text className="text-red-500">*</Text>
                                    </Text>
                                    <View className="relative">
                                        <TextInput
                                            className={`border rounded-2xl px-4 py-4 pr-12 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${
                                                errors.confirmPassword
                                                    ? "border-red-500"
                                                    : "border-gray-300 dark:border-gray-600"
                                            }`}
                                            placeholder="Nhập lại mật khẩu"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showConfirmPassword}
                                            value={formData.confirmPassword}
                                            onChangeText={(value) => {
                                                setFormData({ ...formData, confirmPassword: value });
                                                if (errors.confirmPassword)
                                                    setErrors({ ...errors, confirmPassword: "" });
                                            }}
                                            editable={!loading}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-4"
                                        >
                                            <MaterialIcons
                                                name={showConfirmPassword ? "visibility" : "visibility-off"}
                                                size={24}
                                                color="#6B7280"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {errors.confirmPassword && (
                                        <Text className="text-red-500 text-xs mt-1">
                                            {errors.confirmPassword}
                                        </Text>
                                    )}
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    className={`mt-4 py-4 rounded-2xl ${
                                        loading ? "bg-gray-400" : "bg-primary"
                                    } shadow-lg`}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text className="text-white text-center text-lg font-bold">
                                            Đặt lại mật khẩu
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

