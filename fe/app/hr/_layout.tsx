import { Stack } from "expo-router";

export default function HRLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="time-tracking" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="bonuses" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="calendar" />
    </Stack>
  );
}
