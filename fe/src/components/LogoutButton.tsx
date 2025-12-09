import React from "react";
import { TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLogout } from "@/hooks/useLogout";

interface LogoutButtonProps {
  variant?: "icon" | "button" | "text";
  showConfirm?: boolean;
}

export default function LogoutButton({
  variant = "icon",
  showConfirm = true,
}: LogoutButtonProps) {
  const { logout, logoutWithConfirm } = useLogout();

  const handlePress = () => {
    if (showConfirm) {
      logoutWithConfirm();
    } else {
      logout(false);
    }
  };

  if (variant === "icon") {
    return (
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handlePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="log-out-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    );
  }

  if (variant === "text") {
    return (
      <TouchableOpacity onPress={handlePress} style={styles.textButton}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.textButtonText}>Đăng xuất</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
      <Text style={styles.buttonText}>Đăng xuất</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  textButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  textButtonText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
