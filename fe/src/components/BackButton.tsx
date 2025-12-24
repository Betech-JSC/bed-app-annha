import React from "react";
import { TouchableOpacity, StyleSheet, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface BackButtonProps {
  onPress?: () => void;
  title?: string;
  showTitle?: boolean;
  color?: string;
}

export default function BackButton({
  onPress,
  title,
  showTitle = false,
  color = "#1F2937",
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/projects");
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color={color} />
      {showTitle && title && (
        <Text style={[styles.title, { color }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
});

