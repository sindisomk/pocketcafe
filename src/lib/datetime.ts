/**
 * UK timezone (Europe/London) date/time helpers.
 * Use these for business "today", shift times, and lateness so behaviour
 * is consistent regardless of client or server timezone.
 */
const UK_TZ = 'Europe/London';

/** Returns today's date in UK as yyyy-MM-dd */
export function getTodayUK(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: UK_TZ });
}

/** Returns current moment - use for "now" when comparing to UK shift times (same instant, correct for diff) */
export function nowInUK(): Date {
  return new Date();
}

/**
 * Get Europe/London offset from UTC in ms at the start of a given date (yyyy-MM-dd).
 * UK: GMT (0) in winter, BST +1h in summer (last Sun Mar to last Sun Oct).
 */
function getLondonOffsetMsForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const year = y!;
  const month = m! - 1;
  const day = d!;

  const lastSunday = (month: number) => {
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const dayOfWeek = lastDay.getUTCDay();
    const diff = dayOfWeek === 0 ? 0 : dayOfWeek;
    return lastDay.getUTCDate() - diff;
  };
  const marchLastSun = lastSunday(2);
  const octLastSun = lastSunday(9);

  const date = new Date(Date.UTC(year, month, day));
  const utcDate = date.getUTCDate();

  const afterMarch = month > 2 || (month === 2 && utcDate >= marchLastSun);
  const beforeOctober = month < 9 || (month === 9 && utcDate < octLastSun);
  const isBST = afterMarch && beforeOctober;

  return isBST ? 60 * 60 * 1000 : 0;
}

/**
 * Parse a shift date + time string as a moment in UK.
 * Returns a Date (UTC instant) that corresponds to that clock time in Europe/London.
 */
export function parseShiftDateTimeUK(shiftDate: string, timeStr: string): Date {
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const [h, m, s] = normalized.split(':').map((x) => parseInt(x, 10) || 0);
  const [y, mo, d] = shiftDate.split('-').map((x) => parseInt(x, 10)!);
  const offsetMs = getLondonOffsetMsForDate(shiftDate);
  return new Date(Date.UTC(y, mo - 1, d, h, m, s) - offsetMs);
}
