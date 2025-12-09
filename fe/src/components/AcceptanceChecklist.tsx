import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { AcceptanceStage } from "@/api/acceptanceApi";
import { Ionicons } from "@expo/vector-icons";

interface AcceptanceChecklistProps {
  stages: AcceptanceStage[];
  onApprove?: (stageId: number, approvalType: string) => void;
  canApprove?: boolean;
}

export default function AcceptanceChecklist({
  stages,
  onApprove,
  canApprove = false,
}: AcceptanceChecklistProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "owner_approved":
        return { name: "checkmark-circle", color: "#10B981" };
      case "design_approved":
        return { name: "checkmark-circle", color: "#3B82F6" };
      case "customer_approved":
        return { name: "checkmark-circle", color: "#8B5CF6" };
      case "internal_approved":
        return { name: "checkmark-circle", color: "#F59E0B" };
      case "rejected":
        return { name: "close-circle", color: "#EF4444" };
      default:
        return { name: "ellipse-outline", color: "#9CA3AF" };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ duyệt";
      case "internal_approved":
        return "Đã duyệt nội bộ";
      case "customer_approved":
        return "Đã duyệt khách hàng";
      case "design_approved":
        return "Đã duyệt thiết kế";
      case "owner_approved":
        return "Đã duyệt chủ nhà";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const getNextApprovalType = (status: string): string | null => {
    switch (status) {
      case "pending":
        return "internal";
      case "internal_approved":
        return "customer";
      case "customer_approved":
        return "design";
      case "design_approved":
        return "owner";
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {stages.map((stage) => {
        const icon = getStatusIcon(stage.status);
        const nextApproval = getNextApprovalType(stage.status);
        const hasOpenDefects = stage.defects?.some(
          (d: any) => d.status === "open" || d.status === "in_progress"
        );

        return (
          <View key={stage.id} style={styles.stageCard}>
            <View style={styles.stageHeader}>
              <View style={styles.stageInfo}>
                <Ionicons name={icon.name as any} size={24} color={icon.color} />
                <View style={styles.stageText}>
                  <Text style={styles.stageName}>{stage.name}</Text>
                  <Text style={styles.stageStatus}>
                    {getStatusText(stage.status)}
                  </Text>
                </View>
              </View>
            </View>

            {stage.description && (
              <Text style={styles.stageDescription}>{stage.description}</Text>
            )}

            {hasOpenDefects && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color="#EF4444" />
                <Text style={styles.warningText}>
                  Còn lỗi chưa được khắc phục
                </Text>
              </View>
            )}

            {nextApproval && canApprove && !hasOpenDefects && (
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => onApprove?.(stage.id, nextApproval)}
              >
                <Text style={styles.approveButtonText}>
                  Duyệt {nextApproval === "internal"
                    ? "nội bộ"
                    : nextApproval === "customer"
                      ? "khách hàng"
                      : nextApproval === "design"
                        ? "thiết kế"
                        : "chủ nhà"}
                </Text>
              </TouchableOpacity>
            )}

            {stage.attachments && stage.attachments.length > 0 && (
              <View style={styles.attachmentsRow}>
                <Ionicons name="document-outline" size={16} color="#3B82F6" />
                <Text style={styles.attachmentsText}>
                  {stage.attachments.length} file đính kèm
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stageText: {
    marginLeft: 12,
    flex: 1,
  },
  stageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  stageStatus: {
    fontSize: 14,
    color: "#6B7280",
  },
  stageDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    color: "#EF4444",
    flex: 1,
  },
  approveButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
  },
});
