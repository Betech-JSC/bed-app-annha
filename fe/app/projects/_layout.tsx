import { Stack } from "expo-router";

export default function ProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/contract" />
      <Stack.Screen name="[id]/payments" />
      <Stack.Screen name="[id]/additional-costs" />
      <Stack.Screen name="[id]/costs" />
      <Stack.Screen name="[id]/personnel" />
      <Stack.Screen name="[id]/subcontractors" />
      <Stack.Screen name="[id]/documents" />
      <Stack.Screen name="[id]/logs" />
      <Stack.Screen name="[id]/acceptance" />
      <Stack.Screen name="[id]/defects" />
      <Stack.Screen name="[id]/progress" />
    </Stack>
  );
}
