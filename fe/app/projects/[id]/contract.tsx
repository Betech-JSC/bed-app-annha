import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { contractApi, Contract } from "@/api/contractApi";
import { Ionicons } from "@expo/vector-icons";

export default function ContractScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    contract_value: "",
    signed_date: "",
  });

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const response = await contractApi.getContract(id!);
      if (response.success) {
        setContract(response.data);
        if (response.data) {
          setFormData({
            contract_value: response.data.contract_value?.toString() || "",
            signed_date: response.data.signed_date || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading contract:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        contract_value: parseFloat(formData.contract_value),
        signed_date: formData.signed_date || undefined,
        status: "draft",
      };

      const response = contract
        ? await contractApi.updateContract(id!, data)
        : await contractApi.saveContract(id!, data);

      if (response.success) {
        Alert.alert("Thành công", "Hợp đồng đã được lưu.");
        setEditing(false);
        loadContract();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleApprove = async () => {
    try {
      const response = await contractApi.approveContract(id!);
      if (response.success) {
        Alert.alert("Thành công", "Hợp đồng đã được duyệt.");
        loadContract();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending_customer_approval":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "Bản nháp";
      case "pending_customer_approval":
        return "Chờ khách hàng duyệt";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giá Trị Hợp Đồng</Text>
        {contract && !editing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {contract && (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Trạng thái</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(contract.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(contract.status) },
              ]}
            >
              {getStatusText(contract.status)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Giá trị hợp đồng (VND)</Text>
          <TextInput
            style={styles.input}
            value={formData.contract_value}
            onChangeText={(text) =>
              setFormData({ ...formData, contract_value: text })
            }
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
            onChangeText={(text) =>
              setFormData({ ...formData, signed_date: text })
            }
            placeholder="YYYY-MM-DD"
            editable={editing || !contract}
          />
        </View>

        {contract && contract.attachments && contract.attachments.length > 0 && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.sectionTitle}>File đính kèm</Text>
            {contract.attachments.map((attachment: any, index: number) => (
              <TouchableOpacity key={index} style={styles.attachmentItem}>
                <Ionicons name="document-outline" size={24} color="#3B82F6" />
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.original_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {editing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                loadContract();
              }}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!contract && (
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Tạo hợp đồng</Text>
              </TouchableOpacity>
            )}
            {contract &&
              contract.status === "pending_customer_approval" && (
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={handleApprove}
                >
                  <Text style={styles.approveButtonText}>Duyệt hợp đồng</Text>
                </TouchableOpacity>
              )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  editButton: {
    padding: 4,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    color: "#6B7280",
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
  form: {
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
  approveButton: {
    backgroundColor: "#10B981",
    marginTop: 16,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
