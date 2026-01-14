// Export all project management components
export { default as ProjectCard } from "./ProjectCard";
export { default as ContractForm } from "./ContractForm";
export { default as PaymentSchedule } from "./PaymentSchedule";
export { default as ProgressChart } from "./ProgressChart";
export { default as AcceptanceChecklist } from "./AcceptanceChecklist";
export { default as DefectItem } from "./DefectItem";
// File Upload Components
// UniversalFileUploader is the recommended component for all file uploads
export { default as UniversalFileUploader } from "./UniversalFileUploader";
export type { UploadedFile } from "./UniversalFileUploader";

// Legacy components - deprecated, use UniversalFileUploader instead
/** @deprecated Use UniversalFileUploader instead */
export { default as FileUploader } from "./FileUploader";
/** @deprecated Use UniversalFileUploader instead */
export { default as ImagePicker } from "./ImagePicker";
/** @deprecated Use UniversalFileUploader instead - ImagePickerField now uses UniversalFileUploader internally */
export { default as ImagePickerField } from "./ImagePickerField";
/** @deprecated Use UploadedFile from UniversalFileUploader instead */
export type { ImageItem } from "./ImagePicker";
/** @deprecated Use UniversalFileUploader instead */
export { default as MultiMediaUploader } from "./MultiMediaUploader";
/** @deprecated Use UploadedFile from UniversalFileUploader instead */
export type { MediaItem } from "./MultiMediaUploader";

export { ScreenHeader } from "./ScreenHeader";
export { PermissionGuard } from "./PermissionGuard";
export { default as CustomTabBar } from "./CustomTabBar";

// Export HR management components
export { default as CheckInOutButton } from "./CheckInOutButton";
export { default as PayrollCard } from "./PayrollCard";
export { default as BonusForm } from "./BonusForm";
export { default as CalendarView } from "./CalendarView";
export { default as SalaryConfigForm } from "./SalaryConfigForm";
export { default as ExportButtons } from "./ExportButtons";
export { default as LogoutButton } from "./LogoutButton";
export { default as GanttChart } from "./GanttChart";
export { default as GanttTaskBar } from "./GanttTaskBar";
export { default as PhaseSection } from "./PhaseSection";
export { default as AcceptanceItemForm } from "./AcceptanceItemForm";
export { default as AcceptanceItemList } from "./AcceptanceItemList";
export { default as DatePickerInput } from "./DatePickerInput";
export { NotificationItem } from "./NotificationItem";
export { NotificationBadge } from "./NotificationBadge";
