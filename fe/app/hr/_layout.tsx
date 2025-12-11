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
      <Stack.Screen name="check-in-out" />
      <Stack.Screen name="time-tracking" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="bonuses" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="personnel-roles" />
      <Stack.Screen name="role-permissions" />
      <Stack.Screen name="user-permissions" />
    </Stack>
  );
}
