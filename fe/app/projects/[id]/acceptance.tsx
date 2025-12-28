import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { acceptanceApi, AcceptanceStage } from "@/api/acceptanceApi";
import { Ionicons } from "@expo/vector-icons";
import { AcceptanceChecklist, ScreenHeader } from "@/components";

export default function AcceptanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stages, setStages] = useState<AcceptanceStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStages();
  }, [id]);

  const loadStages = async () => {
    try {
      setLoading(true);
      const response = await acceptanceApi.getStages(id!);
      if (response.success) {
        setStages(response.data || []);
      }
    } catch (error) {
      console.error("Error loading stages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (stageId: number, approvalType: string) => {
    try {
      const response = await acceptanceApi.approveStage(id!, stageId, approvalType as any);
      if (response.success) {
        Alert.alert("Thành công", "Giai đoạn nghiệm thu đã được duyệt.");
        loadStages();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
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
    <View style={styles.container}>
      <ScreenHeader title="Nghiệm Thu" showBackButton />

      <AcceptanceChecklist
        stages={stages}
        onApprove={handleApprove}
        canApprove={true}
        projectId={id}
        isProjectManager={true}
        onRefresh={loadStages}
        onNavigateToDefects={() => router.push(`/projects/${id}/defects`)}
      />
    </View>
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
});
