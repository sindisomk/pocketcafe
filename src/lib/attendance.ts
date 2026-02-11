/**
 * Lateness and No-Show calculation utilities
 * Compares clock-in times against scheduled shift starts.
 * Uses UK timezone (Europe/London) for consistent behaviour.
 */
import { parseShiftDateTimeUK, nowInUK } from '@/lib/datetime';

export interface LatenessResult {
  isLate: boolean;
  lateMinutes: number;
  graceApplied: boolean;
}

/**
 * Calculate if a clock-in is late compared to scheduled shift start (UK time).
 */
export function calculateLateness(
  clockInTime: Date,
  scheduledStartTime: string,  // e.g., "08:00" or "08:00:00"
  shiftDate: string,           // e.g., "2026-02-05"
  graceMinutes: number = 5
): LatenessResult {
  if (!scheduledStartTime || !shiftDate) {
    return { isLate: false, lateMinutes: 0, graceApplied: false };
  }

  const scheduledDateTime = parseShiftDateTimeUK(shiftDate, scheduledStartTime);
  const diffMs = clockInTime.getTime() - scheduledDateTime.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes <= graceMinutes) {
    return { isLate: false, lateMinutes: 0, graceApplied: diffMinutes > 0 };
  }

  return {
    isLate: true,
    lateMinutes: diffMinutes,
    graceApplied: false,
  };
}

/**
 * Check if staff is a no-show based on threshold (UK time).
 * @returns true if staff is past the no-show threshold and hasn't clocked in
 */
export function isNoShow(
  scheduledStartTime: string,
  shiftDate: string,
  currentTime: Date,
  thresholdMinutes: number = 30
): boolean {
  if (!scheduledStartTime || !shiftDate) {
    return false;
  }

  const scheduledDateTime = parseShiftDateTimeUK(shiftDate, scheduledStartTime);
  const diffMs = currentTime.getTime() - scheduledDateTime.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  return diffMinutes >= thresholdMinutes;
}

/** Get current time in UK for use in lateness/no-show (e.g. when caller doesn't pass a time) */
export function getNowUK(): Date {
  return nowInUK();
}

/**
 * Format late minutes for display
 */
export function formatLateMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
