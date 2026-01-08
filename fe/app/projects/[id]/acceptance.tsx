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
import { useSelector } from "react-redux";
import type { RootState } from "@/reducers/index";
import { acceptanceApi, AcceptanceStage } from "@/api/acceptanceApi";
import { projectApi, Project } from "@/api/projectApi";
import { personnelApi } from "@/api/personnelApi";
import { Ionicons } from "@expo/vector-icons";
import { AcceptanceChecklist, ScreenHeader } from "@/components";

export default function AcceptanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSelector((state: RootState) => state.user);
  const [stages, setStages] = useState<AcceptanceStage[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    loadProject();
    loadStages();
    loadPersonnel();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await projectApi.getProject(id!);
      if (response.success) {
        setProject(response.data);
      }
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

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

  const loadPersonnel = async () => {
    if (!id || !user?.id) return;
    try {
      const response = await personnelApi.getPersonnel(id);
      if (response.success) {
        const personnel = response.data || [];
        const supervisor = personnel.find(
          (p: any) =>
            p.user_id?.toString() === user.id?.toString() &&
            (p.role === "supervisor" || p.role === "supervisor_guest")
        );
        setIsSupervisor(!!supervisor);
      }
    } catch (error) {
      console.error("Error loading personnel:", error);
    }
  };

  // Xác định role của user
  const isProjectManager = project?.project_manager_id?.toString() === user?.id?.toString();
  const isCustomer = project?.customer_id?.toString() === user?.id?.toString();


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
        projectId={id}
        isProjectManager={isProjectManager}
        isCustomer={isCustomer}
        isSupervisor={isSupervisor}
        onRefresh={loadStages}
        onNavigateToDefects={(stageId?: number) => {
          if (stageId) {
            router.push(`/projects/${id}/defects?acceptance_stage_id=${stageId}`);
          } else {
            router.push(`/projects/${id}/defects`);
          }
        }}
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
