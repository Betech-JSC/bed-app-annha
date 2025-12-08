// Login Screen - Professional UI/UX
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
import api from "@/api/api";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/reducers/userSlice";
import { RootState } from "@/store";
import { MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getDatabase, ref, set } from "firebase/database";
import { app } from "@/firebaseConfig";
import SocialMedia from "./components/SocialMedia";

export default function LoginScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);

  // Tất cả hooks phải được gọi trước conditional return
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Lấy Expo Push Token trước khi login
      let expoPushToken = "";

      const tokenData = await Notifications.getExpoPushTokenAsync();
      expoPushToken = tokenData.data;

      // Gửi FCM token trong request login
      const loginPayload: any = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      // Chỉ gửi fcm_token nếu có giá trị
      if (expoPushToken && expoPushToken.trim() !== "") {
        loginPayload.fcm_token = expoPushToken;
        console.log("Sending FCM token to backend:", expoPushToken);
      }

      const response = await api.post("login", loginPayload);

      if (response.status === 200 || response.data?.success) {
        const userData = response.data?.data?.user || response.data?.data;
        const token = userData?.token;

        if (!token) {
          throw new Error("Không nhận được token từ server");
        }

        const user = { ...userData };
        delete user.token;

        // Lấy role từ user data hoặc mặc định là customer
        const userRole = user.role || "customer";
        const userWithRole = {
          ...user,
          role: userRole,
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

        // Redirect theo role - sử dụng replace để không thể quay lại
        if (userWithRole.role === "sender") {
          router.replace("/(tabs)/(sender)/home");
        } else {
          router.replace("/(tabs)/(customer)/home_customer");
        }

        // Lưu user vào Redux
        dispatch(setUser(userWithRole));

        // Redirect theo role
        if (userWithRole.role === "sender") {
          router.replace("/(tabs)/(sender)/home");
        } else {
          router.replace("/(tabs)/(customer)/home_customer");
        }
      } else {
        throw new Error(response.data?.message || "Đăng nhập thất bại");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.";

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
        Alert.alert("Lỗi đăng nhập", errorMessage);
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
            <View className="items-center mb-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                <MaterialIcons name="flight" size={40} color="#2563EB" />
              </View>
              <Text className="text-3xl font-bold text-primary mb-2">SkySend</Text>
              <Text className="text-base text-center text-text-secondary dark:text-gray-400">
                Đăng nhập để tiếp tục
              </Text>
            </View>
          </View>

          {/* Form */}
          <View className="flex-1 px-6 py-4">
            <View className="gap-5">
              {/* Email */}
              <View>
                <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
                  Email <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`border rounded-2xl px-4 py-4 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${errors.email
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
                  Mật khẩu <Text className="text-red-500">*</Text>
                </Text>
                <View className="relative">
                  <TextInput
                    className={`border rounded-2xl px-4 py-4 pr-12 text-base bg-white dark:bg-slate-800 text-text-primary dark:text-white ${errors.password
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                      }`}
                    placeholder="Nhập mật khẩu"
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

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => router.push("/forgot-password")}
                className="self-end"
              >
                <Text className="text-primary text-sm font-medium">
                  Quên mật khẩu?
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className={`mt-2 py-4 rounded-2xl ${loading ? "bg-gray-400" : "bg-primary"
                  } shadow-lg`}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-center text-lg font-bold">
                    Đăng nhập
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View className="flex-row items-center gap-4 my-4">
                <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                <Text className="text-text-secondary dark:text-gray-400 text-sm">Hoặc</Text>
                <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              </View>


              {/* Register Link */}
              <View className="flex-row justify-center items-center gap-2 mt-4">
                <Text className="text-text-secondary dark:text-gray-400">
                  Chưa có tài khoản?
                </Text>
                <TouchableOpacity onPress={() => router.push("/role-selection")}>
                  <Text className="text-primary font-semibold">Đăng ký ngay</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
