// Register Screen - Professional UI/UX
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
import { MaterialIcons } from "@expo/vector-icons";
import api from "@/api/api";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/reducers/userSlice";
import { RootState } from "@/store";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getDatabase, ref, set } from "firebase/database";
import { app } from "@/firebaseConfig";

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const { role } = useLocalSearchParams<{ role?: string }>();

  // Tất cả hooks phải được gọi trước conditional return
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập họ tên";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Họ tên phải có ít nhất 2 ký tự";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (formData.phone.trim() && !/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Lấy Expo Push Token trước khi register
      let expoPushToken = "";
      try {
        if (Constants.isDevice) {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === "granted") {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            expoPushToken = tokenData.data;
            console.log("Expo Push Token:", expoPushToken);
          }
        }
      } catch (error) {
        console.warn("Không lấy được push token:", error);
      }

      // Gửi FCM token trong request register
      const registerPayload: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        password: formData.password,
        role: role || 'customer', // Send role to backend
      };

      // Chỉ gửi fcm_token nếu có giá trị
      if (expoPushToken && expoPushToken.trim() !== "") {
        registerPayload.fcm_token = expoPushToken;
        console.log("Sending FCM token to backend:", expoPushToken);
      }

      const response = await api.post("/register", registerPayload);

      if (response.data?.success || response.status === 200) {
        const userData = response.data?.data?.user || response.data?.data;
        const token = userData?.token;

        if (!token) {
          throw new Error("Không nhận được token từ server");
        }

        const user = { ...userData };
        delete user.token;

        // Gán role từ param
        const userWithRole = {
          ...user,
          role: role === "sender" ? "sender" : "customer",
          token: token,
        };

        // Lưu token lên Firebase (backup)
        if (expoPushToken && user.id) {
          try {
            const db = getDatabase(app);
            await set(ref(db, `users/${user.id}/expo_push_token`), expoPushToken);
          } catch (error) {
            console.warn("Không thể lưu push token vào Firebase:", error);
          }
        }

        // Lưu user vào Redux
        dispatch(setUser(userWithRole));

        // Redirect theo role
        Alert.alert("Thành công", "Đăng ký thành công!", [
          {
            text: "OK",
            onPress: () => {
              if (userWithRole.role === "sender") {
                router.replace("/(tabs)/(sender)/home");
              } else {
                router.replace("/(tabs)/(customer)/home_customer");
              }
            },
          },
        ]);
      } else {
        throw new Error(response.data?.message || "Đăng ký thất bại");
      }
    } catch (error: any) {
      console.error("Register error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Đăng ký thất bại. Vui lòng thử lại.";

      // Xử lý validation errors từ backend
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

  const selectedRole = role === "sender" ? "Người gửi hàng" : "Hành khách";

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
            <Text className="text-3xl font-bold text-text-primary dark:text-white mb-2">
              Tạo tài khoản
            </Text>
            <Text className="text-base text-text-secondary dark:text-gray-400">
              Vai trò: <Text className="font-semibold text-primary">{selectedRole}</Text>
            </Text>
          </View>

          {/* Form */}
          <View className="flex-1 px-6 py-4">
            <View className="gap-5">
              {/* Name */}
              <View>
                <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                  Họ và tên <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`border rounded-2xl px-4 py-4 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    }`}
                  placeholder="Nhập họ và tên của bạn"
                  placeholderTextColor="#9CA3AF"
                  value={formData.name}
                  onChangeText={(value) => {
                    setFormData({ ...formData, name: value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  editable={!loading}
                />
                {errors.name && (
                  <Text className="text-red-500 text-xs mt-1">{errors.name}</Text>
                )}
              </View>

              {/* Email */}
              <View>
                <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                  Email <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`border rounded-2xl px-4 py-4 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
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

              {/* Phone */}
              <View>
                <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                  Số điện thoại <Text className="text-gray-400">(Tùy chọn)</Text>
                </Text>
                <TextInput
                  className={`border rounded-2xl px-4 py-4 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    }`}
                  placeholder="0901234567"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(value) => {
                    setFormData({ ...formData, phone: value.replace(/\D/g, "") });
                    if (errors.phone) setErrors({ ...errors, phone: "" });
                  }}
                  editable={!loading}
                />
                {errors.phone && (
                  <Text className="text-red-500 text-xs mt-1">{errors.phone}</Text>
                )}
              </View>

              {/* Password */}
              <View>
                <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                  Mật khẩu <Text className="text-red-500">*</Text>
                </Text>
                <View className="relative">
                  <TextInput
                    className={`border rounded-2xl px-4 py-4 pr-12 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${errors.password
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
                    className={`border rounded-2xl px-4 py-4 pr-12 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${errors.confirmPassword
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
                onPress={handleRegister}
                disabled={loading}
                className={`mt-4 py-4 rounded-2xl ${loading ? "bg-gray-400" : "bg-primary"
                  } shadow-lg`}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-center text-lg font-bold">
                    Đăng ký
                  </Text>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <View className="flex-row justify-center items-center gap-2 mt-4">
                <Text className="text-text-secondary dark:text-gray-400">
                  Đã có tài khoản?
                </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text className="text-primary font-semibold">Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
