import { Redirect } from "expo-router";

export default function TabsIndex() {
  // Redirect to projects tab by default
  return <Redirect href="/(tabs)/projects" />;
}
