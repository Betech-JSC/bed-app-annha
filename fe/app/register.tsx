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
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import api from "@/api/api";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { setUser } from "@/reducers/userSlice";

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "admin" as "admin",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    // Đăng ký đã bị vô hiệu hóa - chỉ cho phép super admin
    Alert.alert(
      "Đăng ký đã bị vô hiệu hóa",
      "Chức năng đăng ký tài khoản đã bị vô hiệu hóa. Chỉ Super Admin mới có thể truy cập ứng dụng. Vui lòng liên hệ quản trị viên để được cấp tài khoản.",
      [
        {
          text: "Quay lại đăng nhập",
          onPress: () => router.replace("/login"),
        },
      ]
    );
    return;

    // Code cũ đã được comment
    /*
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      // Get FCM token if available
      let fcmToken = null;
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        fcmToken = tokenData.data;
      } catch (error) {
        console.log("Could not get FCM token:", error);
      }

      const response = await api.post("/register", {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        role: formData.role,
        fcm_token: fcmToken,
      });

      if (response.data.success && response.data.data?.user) {
        const userData = response.data.data.user;

        // Save user to Redux
        dispatch(
          setUser({
            id: userData.id?.toString() || null,
            name: userData.name || null,
            email: userData.email || null,
            role: userData.role || null,
            phone: userData.phone || null,
            token: userData.token || null,
            password: null,
          })
        );

        Alert.alert("Thành công", "Đăng ký thành công!", [
          {
            text: "OK",
            onPress: () => router.replace("/hr"),
          },
        ]);
      } else {
        Alert.alert("Lỗi", response.data.message || "Đăng ký thất bại");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
    */
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Đăng Ký</Text>
            <Text style={styles.subtitle}>Tạo tài khoản mới</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email"
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại"
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                  value={formData.password}
                  onChangeText={(text) =>
                    setFormData({ ...formData, password: text })
                  }
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChangeText={(text) =>
                    setFormData({ ...formData, confirmPassword: text })
                  }
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-outline" : "eye-off-outline"
                    }
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vai trò</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === "customer" && styles.roleButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, role: "customer" })}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      formData.role === "customer" &&
                      styles.roleButtonTextActive,
                    ]}
                  >
                    Khách hàng
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === "sender" && styles.roleButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, role: "sender" })}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      formData.role === "sender" && styles.roleButtonTextActive,
                    ]}
                  >
                    Người gửi
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginLinkText}>
                Đã có tài khoản? Đăng nhập
              </Text>
            </TouchableOpacity>
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
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  backButton: {
    marginBottom: 16,
    padding: 4,
    alignSelf: "flex-start",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
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
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
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
  roleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  registerButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
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
  loginLink: {
    padding: 16,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
});
