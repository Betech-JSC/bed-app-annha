import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import api from "@/api/api";
import { permissionApi } from "@/api/permissionApi";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { setUser } from "@/reducers/userSlice";
import { setPermissions } from "@/reducers/permissionsSlice";

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const clearErrors = () => {
    setErrorMessage("");
    setFieldErrors({});
  };

  const handleRegister = async () => {
    clearErrors();

    // Client-side validation
    const errors: Record<string, boolean> = {};
    if (!name.trim()) errors.name = true;
    if (!email.trim()) errors.email = true;
    if (!password) errors.password = true;
    if (!passwordConfirmation) errors.passwordConfirmation = true;
    if (password && passwordConfirmation && password !== passwordConfirmation) {
      errors.passwordConfirmation = true;
      setErrorMessage("Xác nhận mật khẩu không khớp");
      setFieldErrors(errors);
      return;
    }
    if (password && password.length < 8) {
      errors.password = true;
      setErrorMessage("Mật khẩu phải có ít nhất 8 ký tự");
      setFieldErrors(errors);
      return;
    }

    if (Object.keys(errors).length > 0) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin bắt buộc");
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // Get push token if available
      let fcmToken = null;
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        fcmToken = tokenData.data;
      } catch (error) {
        console.log("Could not get push token:", error);
      }

      const response = await api.post("/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
        phone: phone.trim() || null,
        fcm_token: fcmToken,
      });

      if (response.data.success || response.data.status === "success") {
        const userData = response.data.data.user;

        // Auto-login: Save user to Redux
        dispatch(
          setUser({
            id: userData.id?.toString() || null,
            name: userData.name || null,
            email: userData.email || null,
            role: userData.role || null,
            phone: userData.phone || null,
            token: userData.token || null,
            password: null,
            owner: userData.owner || false,
            roles: userData.roles || [],
          })
        );

        // Get user permissions
        try {
          const permissionsResponse = await permissionApi.getMyPermissions();
          const permissions: string[] = permissionsResponse.success
            ? permissionsResponse.data || []
            : [];
          dispatch(setPermissions(permissions));
        } catch {
          dispatch(setPermissions([]));
        }

        // Navigate to main app
        router.replace("/(tabs)");
      } else {
        setErrorMessage(response.data.message || "Đăng ký thất bại");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message;
      const validationErrors = error.response?.data?.errors;

      if (validationErrors) {
        // Show first validation error
        const firstError = Object.values(validationErrors).flat()[0] as string;
        setErrorMessage(firstError || "Dữ liệu không hợp lệ");

        // Mark fields with errors
        const newFieldErrors: Record<string, boolean> = {};
        Object.keys(validationErrors).forEach((field) => {
          if (field === "password_confirmation") {
            newFieldErrors.passwordConfirmation = true;
          } else {
            newFieldErrors[field] = true;
          }
        });
        setFieldErrors(newFieldErrors);
      } else if (error.code === "ECONNABORTED" || error.message === "Network Error") {
        setErrorMessage("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
      } else if (errorMsg) {
        setErrorMessage(errorMsg);
      } else {
        setErrorMessage("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require("../assets/splash.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Tạo Tài Khoản</Text>
            <Text style={styles.subtitle}>
              Đăng ký miễn phí để bắt đầu quản lý dự án
            </Text>
          </View>

          <View style={styles.form}>
            {/* Họ và tên */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Họ và tên <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, fieldErrors.name && styles.inputError]}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={fieldErrors.name ? "#EF4444" : "#6B7280"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    clearErrors();
                  }}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, fieldErrors.email && styles.inputError]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={fieldErrors.email ? "#EF4444" : "#6B7280"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    clearErrors();
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Số điện thoại */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <View style={[styles.inputContainer, fieldErrors.phone && styles.inputError]}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={fieldErrors.phone ? "#EF4444" : "#6B7280"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại (tuỳ chọn)"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    clearErrors();
                  }}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Mật khẩu */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Mật khẩu <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, fieldErrors.password && styles.inputError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={fieldErrors.password ? "#EF4444" : "#6B7280"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Tối thiểu 8 ký tự"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearErrors();
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Xác nhận mật khẩu */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Xác nhận mật khẩu <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  fieldErrors.passwordConfirmation && styles.inputError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={fieldErrors.passwordConfirmation ? "#EF4444" : "#6B7280"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu"
                  value={passwordConfirmation}
                  onChangeText={(text) => {
                    setPasswordConfirmation(text);
                    clearErrors();
                  }}
                  secureTextEntry={!showPasswordConfirmation}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPasswordConfirmation ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error message */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Register button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>Đăng Ký</Text>
              )}
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  eyeIcon: {
    padding: 12,
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  registerButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  loginText: {
    color: "#6B7280",
    fontSize: 14,
  },
  loginLink: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
});