import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { workScheduleApi } from "@/api/workScheduleApi";
import { Ionicons } from "@expo/vector-icons";

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any>({});

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const response = await workScheduleApi.getCalendar({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });
      if (response.success) {
        setSchedules(response.data.data || {});
      }
    } catch (error) {
      console.error("Error loading calendar:", error);
    } finally {
      setLoading(false);
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
      <Text style={styles.title}>Lịch Làm Việc</Text>
      <Text style={styles.emptyText}>Calendar view sẽ được tích hợp sau</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
  },
});
