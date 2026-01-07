import { Stack } from "expo-router";

export default function AccountingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="input-invoices" />
    </Stack>
  );
}



