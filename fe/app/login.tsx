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
import { setUser } from "@/reducers/userSlice";
import { setPermissions } from "@/reducers/permissionsSlice";

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("superadmin@skysend.com");
  const [password, setPassword] = useState("superadmin123");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu");
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

      const response = await api.post("/login", {
        email,
        password,
        fcm_token: fcmToken,
      });

      if (response.data.status === "success") {
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
            owner: userData.owner || false,
            roles: userData.roles || [],
          })
        );

        // Get user permissions and save to Redux
        try {
          const permissionsResponse = await permissionApi.getMyPermissions();
          const permissions: string[] = permissionsResponse.success
            ? permissionsResponse.data || []
            : [];

          // Save permissions to Redux
          dispatch(setPermissions(permissions));

          // Redirect to tabs layout (main app)
          router.replace("/(tabs)");
        } catch (error) {
          console.error("Error getting permissions:", error);
          // Fallback: clear permissions and redirect
          dispatch(setPermissions([]));
          // Redirect to tabs layout
          router.replace("/(tabs)/projects");
        }
      } else {
        Alert.alert("Lỗi", response.data.message || "Đăng nhập thất bại");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại."
      );
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
            <Text style={styles.title}>Đăng Nhập</Text>
            <Text style={styles.subtitle}>
              Chào mừng bạn trở lại!
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChangeText={setPassword}
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

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push("/forgot-password")}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Đăng Nhập</Text>
              )}
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
    width: 120,
    height: 120,
    marginBottom: 24,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
