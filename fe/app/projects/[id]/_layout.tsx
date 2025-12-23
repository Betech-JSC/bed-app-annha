import { Stack } from "expo-router";

export default function ProjectDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="contract" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="additional-costs" />
      <Stack.Screen name="costs" />
      <Stack.Screen name="revenue" />
      <Stack.Screen name="personnel" />
      <Stack.Screen name="subcontractors" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="acceptance" />
      <Stack.Screen name="defects" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="construction-plan" />
    </Stack>
  );
}
