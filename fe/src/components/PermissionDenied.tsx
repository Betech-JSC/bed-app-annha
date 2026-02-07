import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PermissionDeniedProps {
    title?: string;
    message?: string;
    subtext?: string;
}

const PermissionDenied: React.FC<PermissionDeniedProps> = ({
    title = "Không có quyền truy cập",
    message = "Bạn không có quyền xem thông tin này.",
    subtext = "Vui lòng liên hệ quản trị viên để được cấp quyền truy cập.",
}) => {
    return (
        <View style={styles.permissionDeniedContainer}>
            <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={48} color="#EF4444" />
            </View>
            <Text style={styles.permissionDeniedTitle}>{title}</Text>
            <View style={styles.messageCard}>
                <Text style={styles.permissionDeniedMessage}>{message}</Text>
                <Text style={styles.permissionDeniedSubtext}>{subtext}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    permissionDeniedContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#F9FAFB",
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    permissionDeniedTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1F2937",
        marginBottom: 16,
        textAlign: "center",
    },
    messageCard: {
        backgroundColor: "#FFFFFF",
        padding: 24,
        borderRadius: 16,
        width: "100%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    permissionDeniedMessage: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4B5563",
        textAlign: "center",
        marginBottom: 12,
        lineHeight: 22,
    },
    permissionDeniedSubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 20,
    },
});

export default PermissionDenied;
