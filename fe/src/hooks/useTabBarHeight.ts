import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

/**
 * Hook để lấy chiều cao của tab bar (bao gồm safe area insets)
 * Sử dụng để thêm padding bottom vào các ScrollView/FlatList
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  // Chiều cao tab bar = paddingTop (10) + icon (26) + label (11 + 4 margin) + paddingVertical (4*2) + safe area bottom
  const tabBarContentHeight = 10 + 26 + 15 + 8; // ~59px
  const safeAreaBottom = insets.bottom;
  
  return tabBarContentHeight + safeAreaBottom + 10; // Thêm 10px padding để đảm bảo không bị che
}

