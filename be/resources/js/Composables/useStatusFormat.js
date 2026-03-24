/**
 * useStatusFormat — CRM Status Formatter (Vietnamese)
 * 
 * Centralized status labels, colors, and CSS classes
 * for ALL modules across BED CRM.
 */

// ============================================================
// Project Status
// ============================================================
export const PROJECT_STATUS = {
  planning: { label: 'Lập kế hoạch', color: '#F59E0B', tag: 'crm-tag--pending' },
  in_progress: { label: 'Đang thi công', color: '#3B82F6', tag: 'crm-tag--active' },
  completed: { label: 'Hoàn thành', color: '#10B981', tag: 'crm-tag--completed' },
  suspended: { label: 'Tạm dừng', color: '#F97316', tag: 'crm-tag--pending' },
  cancelled: { label: 'Đã hủy', color: '#9CA3AF', tag: 'crm-tag--cancelled' },
}

// ============================================================
// Cost / Approval Status
// ============================================================
export const COST_STATUS = {
  draft: { label: 'Nháp', color: '#9CA3AF', tag: 'crm-tag--cancelled' },
  pending_management_approval: { label: 'Chờ BĐH duyệt', color: '#F59E0B', tag: 'crm-tag--pending' },
  pending_accountant_approval: { label: 'Chờ KT xác nhận', color: '#3B82F6', tag: 'crm-tag--active' },
  approved: { label: 'Đã duyệt', color: '#10B981', tag: 'crm-tag--completed' },
  rejected: { label: 'Từ chối', color: '#EF4444', tag: 'crm-tag--overdue' },
}

// ============================================================
// Contract Status
// ============================================================
export const CONTRACT_STATUS = {
  draft: { label: 'Nháp', color: '#9CA3AF', tag: 'crm-tag--cancelled' },
  active: { label: 'Đang hiệu lực', color: '#10B981', tag: 'crm-tag--active' },
  expired: { label: 'Hết hạn', color: '#F59E0B', tag: 'crm-tag--pending' },
  terminated: { label: 'Đã thanh lý', color: '#EF4444', tag: 'crm-tag--overdue' },
}

// ============================================================
// Task Status
// ============================================================
export const TASK_STATUS = {
  todo: { label: 'Chờ thực hiện', color: '#9CA3AF', tag: 'crm-tag--cancelled' },
  in_progress: { label: 'Đang thực hiện', color: '#3B82F6', tag: 'crm-tag--active' },
  review: { label: 'Đang xem xét', color: '#F59E0B', tag: 'crm-tag--pending' },
  done: { label: 'Hoàn thành', color: '#10B981', tag: 'crm-tag--completed' },
  cancelled: { label: 'Đã hủy', color: '#9CA3AF', tag: 'crm-tag--cancelled' },
}

// ============================================================
// KPI Status
// ============================================================
export const KPI_STATUS = {
  pending: { label: 'Đang thực hiện', color: '#3B82F6', tag: 'crm-tag--active' },
  completed: { label: 'Đã hoàn thành', color: '#F59E0B', tag: 'crm-tag--pending' },
  verified_success: { label: 'Đạt KPI', color: '#10B981', tag: 'crm-tag--completed' },
  verified_fail: { label: 'Không đạt', color: '#EF4444', tag: 'crm-tag--overdue' },
  overdue: { label: 'Quá hạn', color: '#EF4444', tag: 'crm-tag--overdue' },
}

// ============================================================
// Payment Status (Subcontractor/NCC)
// ============================================================
export const PAYMENT_STATUS = {
  pending: { label: 'Chưa thanh toán', color: '#F59E0B', tag: 'crm-tag--pending' },
  partial: { label: 'Thanh toán 1 phần', color: '#3B82F6', tag: 'crm-tag--active' },
  completed: { label: 'Đã thanh toán đủ', color: '#10B981', tag: 'crm-tag--completed' },
  overdue: { label: 'Quá hạn TT', color: '#EF4444', tag: 'crm-tag--overdue' },
}

// ============================================================
// Notification Priority
// ============================================================
export const NOTIFICATION_PRIORITY = {
  low: { label: 'Thấp', color: '#9CA3AF', tag: 'crm-tag--cancelled' },
  normal: { label: 'Bình thường', color: '#3B82F6', tag: 'crm-tag--active' },
  high: { label: 'Cao', color: '#F59E0B', tag: 'crm-tag--pending' },
  urgent: { label: 'Khẩn cấp', color: '#EF4444', tag: 'crm-tag--overdue' },
}

// ============================================================
// Employee Status
// ============================================================
export const EMPLOYEE_STATUS = {
  active: { label: 'Đang làm việc', color: '#10B981', tag: 'crm-tag--completed' },
  on_leave: { label: 'Đang nghỉ', color: '#F59E0B', tag: 'crm-tag--pending' },
  resigned: { label: 'Đã nghỉ việc', color: '#9CA3AF', tag: 'crm-tag--cancelled' },
  suspended: { label: 'Tạm đình chỉ', color: '#EF4444', tag: 'crm-tag--overdue' },
}

// ============================================================
// Generic Formatter Functions
// ============================================================

/**
 * Get Vietnamese label for a status in the given map
 */
export function getStatusLabel(statusMap, status) {
  return statusMap[status]?.label || status || '—'
}

/**
 * Get CSS class for a status tag
 */
export function getStatusTag(statusMap, status) {
  return statusMap[status]?.tag || ''
}

/**
 * Get hex color for a status
 */
export function getStatusColor(statusMap, status) {
  return statusMap[status]?.color || '#9CA3AF'
}

// ============================================================
// COMPOSABLE: useStatusFormat
// ============================================================
export function useStatusFormat() {
  // --- Project ---
  const projectStatusLabel = (s) => getStatusLabel(PROJECT_STATUS, s)
  const projectStatusTag = (s) => getStatusTag(PROJECT_STATUS, s)
  const projectStatusColor = (s) => getStatusColor(PROJECT_STATUS, s)

  // --- Cost ---
  const costStatusLabel = (s) => getStatusLabel(COST_STATUS, s)
  const costStatusTag = (s) => getStatusTag(COST_STATUS, s)
  const costStatusColor = (s) => getStatusColor(COST_STATUS, s)

  // --- KPI ---
  const kpiStatusLabel = (s) => getStatusLabel(KPI_STATUS, s)
  const kpiStatusTag = (s) => getStatusTag(KPI_STATUS, s)
  const kpiStatusColor = (s) => getStatusColor(KPI_STATUS, s)

  // --- Task ---
  const taskStatusLabel = (s) => getStatusLabel(TASK_STATUS, s)
  const taskStatusTag = (s) => getStatusTag(TASK_STATUS, s)

  // --- Payment ---
  const paymentStatusLabel = (s) => getStatusLabel(PAYMENT_STATUS, s)
  const paymentStatusTag = (s) => getStatusTag(PAYMENT_STATUS, s)

  // --- Employee ---
  const employeeStatusLabel = (s) => getStatusLabel(EMPLOYEE_STATUS, s)
  const employeeStatusTag = (s) => getStatusTag(EMPLOYEE_STATUS, s)

  return {
    // Maps
    PROJECT_STATUS, COST_STATUS, KPI_STATUS, TASK_STATUS, PAYMENT_STATUS, EMPLOYEE_STATUS, NOTIFICATION_PRIORITY, CONTRACT_STATUS,
    // Project
    projectStatusLabel, projectStatusTag, projectStatusColor,
    // Cost / Approval
    costStatusLabel, costStatusTag, costStatusColor,
    // KPI
    kpiStatusLabel, kpiStatusTag, kpiStatusColor,
    // Task
    taskStatusLabel, taskStatusTag,
    // Payment
    paymentStatusLabel, paymentStatusTag,
    // Employee
    employeeStatusLabel, employeeStatusTag,
    // Generic
    getStatusLabel, getStatusTag, getStatusColor,
  }
}
