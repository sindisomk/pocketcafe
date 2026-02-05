/**
 * Centralized query key management for React Query
 * Use these keys consistently across all hooks for reliable cache invalidation
 */
export const queryKeys = {
  // Staff
  staff: ['staff'] as const,

  // Attendance
  attendance: (date: string) => ['attendance', date] as const,
  
  // Schedule
  shifts: (weekStart: string) => ['shifts', weekStart] as const,
  shiftsToday: (date: string) => ['shifts-today', date] as const,
  weeklySchedule: (weekStart: string) => ['weekly-schedule', weekStart] as const,
  
  // Leave
  leaveRequests: ['leave-requests'] as const,
  leaveBalance: (staffId: string) => ['leave-balance', staffId] as const,
  
  // Payroll
  payrollAttendance: (start: string, end: string) => ['payroll-attendance', start, end] as const,

  // Notifications
  notifications: ['notifications'] as const,
} as const;

// Helper type for query key
export type QueryKeys = typeof queryKeys;
