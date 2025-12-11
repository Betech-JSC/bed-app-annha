import React from "react";
import { useRouter } from "expo-router";
import ProjectsListScreen from "../projects/index";

export default function ProjectsTab() {
  // Render projects list directly in tabs
  return <ProjectsListScreen />;
}
