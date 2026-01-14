import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  showZero?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: "small" | "medium" | "large";
}

export function NotificationBadge({
  count,
  maxCount = 99,
  showZero = false,
  style,
  textStyle,
  size = "medium",
}: NotificationBadgeProps) {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const sizeStyles = {
    small: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      fontSize: 10,
      paddingHorizontal: 4,
    },
    medium: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      fontSize: 12,
      paddingHorizontal: 6,
    },
    large: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      fontSize: 14,
      paddingHorizontal: 8,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[styles.badge, currentSize, style]}>
      <Text style={[styles.text, { fontSize: currentSize.fontSize }, textStyle]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: -8,
    right: -8,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
});
