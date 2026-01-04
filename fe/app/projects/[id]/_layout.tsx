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
      <Stack.Screen name="additional-costs/[costId]" />
      <Stack.Screen name="costs" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="budget/[budgetId]" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="invoices/[invoiceId]" />
      <Stack.Screen name="revenue" />
      <Stack.Screen name="personnel" />
      <Stack.Screen name="subcontractors" />
      <Stack.Screen name="subcontractors/contracts" />
      <Stack.Screen name="subcontractors/acceptances" />
      <Stack.Screen name="subcontractors/progress" />
      <Stack.Screen name="materials" />
      <Stack.Screen name="equipment" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="acceptance" />
      <Stack.Screen name="defects" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="construction-plan" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="reports/construction-progress" />
      <Stack.Screen name="reports/material-procurement" />
      <Stack.Screen name="reports/revenue-expense" />
      <Stack.Screen name="reports/material-usage" />
      <Stack.Screen name="reports/construction-logs" />
      <Stack.Screen name="reports/debt-payment" />
      <Stack.Screen name="evm" />
      <Stack.Screen name="risks" />
      <Stack.Screen name="risks/[riskId]" />
      <Stack.Screen name="risks/create" />
      <Stack.Screen name="change-requests" />
      <Stack.Screen name="change-requests/[changeRequestId]" />
      <Stack.Screen name="change-requests/create" />
      <Stack.Screen name="predictions" />
      <Stack.Screen name="monitoring" />
      <Stack.Screen name="summary-report" />
      <Stack.Screen name="summary-report/cost-details" />
    </Stack>
  );
}
