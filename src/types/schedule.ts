export type ShiftType = 'morning' | 'evening';
export type ScheduleStatus = 'draft' | 'published';

export interface WeeklySchedule {
  id: string;
  week_start_date: string;
  status: ScheduleStatus;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  schedule_id: string | null;
  staff_id: string;
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftWithStaff extends Shift {
  staff_profiles: {
    id: string;
    name: string;
    hourly_rate: number;
    profile_photo_url: string | null;
    role: string;
  };
}

// Shift time constants
export const SHIFT_TIMES = {
  morning: { start: '08:00', end: '15:00', hours: 7 },
  evening: { start: '15:00', end: '22:00', hours: 7 }, // Default to 22:00, can be 23:00 on Fri/Sat
} as const;

// Helper to check if a day is Friday or Saturday (for late evening shifts)
export function isLateNightDay(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6; // Friday = 5, Saturday = 6
}

// Get evening end time based on day
export function getEveningEndTime(date: Date): string {
  return isLateNightDay(date) ? '23:00' : '22:00';
}

// Get evening shift hours based on day
export function getEveningHours(date: Date): number {
  return isLateNightDay(date) ? 8 : 7;
}
