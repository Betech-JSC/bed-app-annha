// Forgot Password Screen
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
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MaterialIcons } from "@expo/vector-icons";
import api from "@/api/api";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.user);

    // Tất cả hooks phải được gọi trước conditional return
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Redirect nếu đã đăng nhập
    useEffect(() => {
        if (user?.token && user?.role) {
            if (user.role === "sender") {
                router.replace("/(tabs)/(sender)/home");
            } else if (user.role === "customer") {
                router.replace("/(tabs)/(customer)/home_customer");
            }
        }
    }, [user, router]);

    // Nếu đang check auth, hiển thị loading
    if (user?.token && user?.role) {
        return (
            <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async () => {
        setError("");

        if (!email.trim()) {
            setError("Vui lòng nhập email của bạn");
            return;
        }

        if (!validateEmail(email)) {
            setError("Email không hợp lệ");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/forgot-password", {
                email: email.trim().toLowerCase(),
            });

            if (response.data?.success || response.status === 200) {
                setSuccess(true);
                Alert.alert(
                    "Thành công",
                    "Chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư và làm theo hướng dẫn.",
                    [
                        {
                            text: "OK",
                            onPress: () => router.back(),
                        },
                    ]
                );
            } else {
                throw new Error(response.data?.message || "Không thể gửi email");
            }
        } catch (error: any) {
            console.error("Forgot password error:", error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.";

            if (error.response?.data?.errors) {
                const backendErrors = error.response.data.errors;
                if (backendErrors.email) {
                    setError(
                        Array.isArray(backendErrors.email)
                            ? backendErrors.email[0]
                            : backendErrors.email
                    );
                } else {
                    setError(errorMessage);
                }
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

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
                                <MaterialIcons name="lock-reset" size={40} color="#2563EB" />
                            </View>
                            <Text className="text-3xl font-bold text-text-primary dark:text-white mb-2">
                                Quên mật khẩu?
                            </Text>
                            <Text className="text-base text-center text-text-secondary dark:text-gray-400 max-w-xs">
                                Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu
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
                                    Email đã được gửi!
                                </Text>
                                <Text className="text-base text-center text-text-secondary dark:text-gray-400 max-w-xs mb-6">
                                    Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.back()}
                                    className="bg-primary rounded-2xl px-6 py-3"
                                >
                                    <Text className="text-white font-semibold">Quay lại đăng nhập</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="gap-5">
                                {/* Email Input */}
                                <View>
                                    <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                                        Email <Text className="text-red-500">*</Text>
                                    </Text>
                                    <TextInput
                                        className={`border rounded-2xl px-4 py-4 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${
                                            error
                                                ? "border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}
                                        placeholder="example@email.com"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={(value) => {
                                            setEmail(value);
                                            if (error) setError("");
                                        }}
                                        editable={!loading}
                                    />
                                    {error && (
                                        <Text className="text-red-500 text-xs mt-1">{error}</Text>
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
                                            Gửi link đặt lại mật khẩu
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {/* Back to Login */}
                                <View className="flex-row justify-center items-center gap-2 mt-4">
                                    <Text className="text-text-secondary dark:text-gray-400">
                                        Nhớ mật khẩu?
                                    </Text>
                                    <TouchableOpacity onPress={() => router.back()}>
                                        <Text className="text-primary font-semibold">Đăng nhập</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

