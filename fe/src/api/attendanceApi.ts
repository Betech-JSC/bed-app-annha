import api from './api';

export const attendanceApi = {
  // Chấm công
  getAll: (params?: Record<string, any>) =>
    api.get('/attendance', { params }),
  checkIn: (data: { project_id?: number; latitude?: number; longitude?: number; note?: string }) =>
    api.post('/attendance/check-in', data),
  checkOut: () =>
    api.post('/attendance/check-out'),
  store: (data: any) =>
    api.post('/attendance', data),
  approve: (id: number) =>
    api.post(`/attendance/${id}/approve`),
  submit: (id: number) =>
    api.post(`/attendance/${id}/submit`),
  reject: (id: number, reason: string) =>
    api.post(`/attendance/${id}/reject`, { reason }),
  getStatistics: (params: { year: number; month: number; project_id?: number }) =>
    api.get('/attendance/statistics', { params }),

  // Phân ca
  getShifts: (params?: Record<string, any>) =>
    api.get('/shifts', { params }),
  createShift: (data: any) =>
    api.post('/shifts', data),
  updateShift: (id: number, data: any) =>
    api.put(`/shifts/${id}`, data),
  deleteShift: (id: number) =>
    api.delete(`/shifts/${id}`),

  // Phân ca nhân sự
  getAssignments: (params?: Record<string, any>) =>
    api.get('/shifts/assignments', { params }),
  assignShifts: (data: { work_shift_id: number; user_ids: number[]; dates: string[]; project_id?: number }) =>
    api.post('/shifts/assignments', data),
  removeAssignment: (id: number) =>
    api.delete(`/shifts/assignments/${id}`),
};

export const laborProductivityApi = {
  getAll: (projectId: string | number, params?: Record<string, any>) =>
    api.get(`/projects/${projectId}/labor-productivity`, { params }),
  create: (projectId: string | number, data: any) =>
    api.post(`/projects/${projectId}/labor-productivity`, data),
  update: (projectId: string | number, id: number, data: any) =>
    api.put(`/projects/${projectId}/labor-productivity/${id}`, data),
  delete: (projectId: string | number, id: number) =>
    api.delete(`/projects/${projectId}/labor-productivity/${id}`),
  dashboard: (projectId: string | number, params?: Record<string, any>) =>
    api.get(`/projects/${projectId}/labor-productivity/dashboard`, { params }),
};
