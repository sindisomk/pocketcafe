/** 8 hours = 1 day for leave (UK standard) */
const HOURS_PER_DAY = 8;

/**
 * Format leave balance hours as "X days (Yh)" for display.
 */
export function formatLeaveHoursAsDays(hours: number): string {
  const h = Math.round(hours * 10) / 10;
  const days = h / HOURS_PER_DAY;
  const dayLabel = days === 1 ? '1 day' : `${days.toFixed(1)} days`;
  return `${dayLabel} (${h.toFixed(1)}h)`;
}

/** Normalise time to HH:mm for display (handles "09:00" or "09:00:00") */
function toHHmm(t: string | null | undefined): string {
  if (t == null || t === '') return '';
  const s = t.trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/**
 * Format leave request time range for display. Returns "Full day" or e.g. "09:00 – 13:00".
 */
export function formatLeaveTimeRange(startTime: string | null, endTime: string | null): string {
  const start = toHHmm(startTime);
  const end = toHHmm(endTime);
  if (!start || !end) return 'Full day';
  return `${start} – ${end}`;
}

/**
 * Compute total leave hours for a request (for balance deduction).
 * Full day = 8h per day; partial = (end - start) hours per day × number of days.
 */
export function getLeaveRequestHours(
  startDate: string,
  endDate: string,
  startTime: string | null,
  endTime: string | null
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const startN = toHHmm(startTime);
  const endN = toHHmm(endTime);
  if (!startN || !endN) return days * HOURS_PER_DAY;
  const [sh, sm] = startN.split(':').map(Number);
  const [eh, em] = endN.split(':').map(Number);
  const hoursPerDay = eh - sh + (em - sm) / 60;
  return Math.round(days * hoursPerDay * 10) / 10;
}
