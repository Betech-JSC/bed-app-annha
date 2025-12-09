import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface CalendarViewProps {
  schedules?: any;
  month?: number;
  year?: number;
}

export default function CalendarView({
  schedules,
  month,
  year,
}: CalendarViewProps) {
  // Placeholder for calendar component
  // Will be implemented with react-native-calendars when dependency is installed
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        Calendar view sẽ được tích hợp với react-native-calendars
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  placeholder: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
  },
});
