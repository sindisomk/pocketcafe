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
  staffYTDHours: (staffId: string) => ['staff-ytd-hours', staffId] as const,

  // Notifications
  notifications: ['notifications'] as const,

  // Settings
  settingsWorkHours: ['settings', 'work_hours'] as const,
  settingsShiftTimes: ['settings', 'shift_times'] as const,

  // No-shows, history, kiosk
  noShows: (date: string) => ['no-shows', date] as const,
  noShowsForDates: (dateStrings: string[]) => ['no-shows', 'range', ...dateStrings] as const,
  attendanceHistory: (start: string, end: string) => ['attendance-history', start, end] as const,
  leaveBalancesAll: ['leave-balances', 'all'] as const,
  kioskStaff: ['kiosk-staff'] as const,
} as const;

// Helper type for query key
export type QueryKeys = typeof queryKeys;
