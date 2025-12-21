import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from "react-native";
import { Defect } from "@/api/defectApi";
import { Ionicons } from "@expo/vector-icons";

interface DefectItemProps {
  defect: Defect;
  onPress?: () => void;
  onUpdate?: (defectId: number, status: string) => void;
  canEdit?: boolean;
}

export default function DefectItem({
  defect,
  onPress,
  onUpdate,
  canEdit = false,
}: DefectItemProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F97316";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "critical":
        return "Nghiêm trọng";
      case "high":
        return "Cao";
      case "medium":
        return "Trung bình";
      case "low":
        return "Thấp";
      default:
        return severity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "#10B981";
      case "fixed":
        return "#3B82F6";
      case "in_progress":
        return "#F59E0B";
      default:
        return "#EF4444";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Mở";
      case "in_progress":
        return "Đang xử lý";
      case "fixed":
        return "Đã sửa";
      case "verified":
        return "Đã xác nhận";
      default:
        return status;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.severityBadge}>
          <View
            style={[
              styles.severityDot,
              { backgroundColor: getSeverityColor(defect.severity) },
            ]}
          />
          <Text
            style={[
              styles.severityText,
              { color: getSeverityColor(defect.severity) },
            ]}
          >
            {getSeverityText(defect.severity)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(defect.status) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(defect.status) },
            ]}
          >
            {getStatusText(defect.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{defect.description}</Text>

      {defect.acceptance_stage_id && (
        <TouchableOpacity
          style={styles.stageInfo}
          onPress={() => {
            // Navigate to acceptance stage if onPress is provided
            if (onPress) {
              onPress();
            }
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
          <Text style={styles.stageText}>
            Giai đoạn nghiệm thu #{defect.acceptance_stage_id}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
        </TouchableOpacity>
      )}

      {/* Before Images */}
      {defect.attachments && defect.attachments.filter((a: any) => a.description === 'before').length > 0 && (
        <View style={styles.imageSection}>
          <Text style={styles.imageSectionTitle}>Hình ảnh lỗi (Trước khi khắc phục)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesRow}
          >
            {defect.attachments
              .filter((a: any) => a.description === 'before')
              .map((attachment: any, index: number) => (
                <Image
                  key={attachment.id || index}
                  source={{ uri: attachment.file_url }}
                  style={styles.image}
                />
              ))}
          </ScrollView>
        </View>
      )}

      {/* After Images */}
      {defect.attachments && defect.attachments.filter((a: any) => a.description === 'after').length > 0 && (
        <View style={styles.imageSection}>
          <Text style={styles.imageSectionTitle}>Hình ảnh sau khi khắc phục</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesRow}
          >
            {defect.attachments
              .filter((a: any) => a.description === 'after')
              .map((attachment: any, index: number) => (
                <Image
                  key={attachment.id || index}
                  source={{ uri: attachment.file_url }}
                  style={styles.image}
                />
              ))}
          </ScrollView>
        </View>
      )}

      {canEdit && defect.status === "open" && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onUpdate?.(defect.id, "in_progress")}
        >
          <Text style={styles.actionButtonText}>Bắt đầu xử lý</Text>
        </TouchableOpacity>
      )}

      {canEdit && defect.status === "in_progress" && (
        <View>
          <Text style={styles.helperText}>
            Vui lòng upload hình ảnh sau khi khắc phục trước khi đánh dấu đã sửa
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onUpdate?.(defect.id, "fixed")}
          >
            <Text style={styles.actionButtonText}>Đánh dấu đã sửa</Text>
          </TouchableOpacity>
        </View>
      )}

      {canEdit && defect.status === "fixed" && (
        <TouchableOpacity
          style={[styles.actionButton, styles.verifyButton]}
          onPress={() => onUpdate?.(defect.id, "verified")}
        >
          <Text style={styles.verifyButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 12,
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  stageText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
    flex: 1,
  },
  imageSection: {
    marginBottom: 12,
  },
  imageSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  imagesRow: {
    flexDirection: "row",
    gap: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 8,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  moreImages: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  moreImagesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  actionButton: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: "#10B981",
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
