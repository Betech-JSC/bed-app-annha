import React from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Contract } from "@/api/contractApi";
import { Ionicons } from "@expo/vector-icons";

interface ContractFormProps {
  contract?: Contract | null;
  formData: {
    contract_value: string;
    signed_date: string;
  };
  onChange: (data: { contract_value: string; signed_date: string }) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  editing?: boolean;
}

export default function ContractForm({
  contract,
  formData,
  onChange,
  onSubmit,
  onCancel,
  editing = false,
}: ContractFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Giá trị hợp đồng (VND)</Text>
        <TextInput
          style={styles.input}
          value={formData.contract_value}
          onChangeText={(text) => onChange({ ...formData, contract_value: text })}
          placeholder="Nhập giá trị hợp đồng"
          keyboardType="numeric"
          editable={editing || !contract}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ngày ký hợp đồng</Text>
        <TextInput
          style={styles.input}
          value={formData.signed_date}
          onChangeText={(text) => onChange({ ...formData, signed_date: text })}
          placeholder="YYYY-MM-DD"
          editable={editing || !contract}
        />
      </View>

      {contract && contract.attachments && contract.attachments.length > 0 && (
        <View style={styles.attachmentsSection}>
          <Text style={styles.sectionTitle}>File đính kèm</Text>
          {contract.attachments.map((attachment: any, index: number) => (
            <View key={index} style={styles.attachmentItem}>
              <Ionicons name="document-outline" size={24} color="#3B82F6" />
              <Text style={styles.attachmentName} numberOfLines={1}>
                {attachment.original_name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {editing ? (
        <View style={styles.buttonRow}>
          {onCancel && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={onSubmit}
          >
            <Text style={styles.saveButtonText}>Lưu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        !contract && (
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={onSubmit}
          >
            <Text style={styles.saveButtonText}>Tạo hợp đồng</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  attachmentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
});
