
# Fix: Overtime Calculation Not Working

## Root Cause

The overtime system has three disconnected pieces:

1. **OvertimeSettings UI** (`src/components/settings/OvertimeSettings.tsx`) -- allows configuring thresholds (weekly: 48h, daily: 8h, rate: 1.5x) but **never saves to the database**. It only shows a toast saying "saved."
2. **Payroll calculation** (`src/lib/payroll.ts`) -- uses a **hardcoded** `WEEKLY_OVERTIME_THRESHOLD = 40` and ignores any settings. There is no daily overtime logic at all.
3. **No `app_settings` row** exists for overtime configuration in the database.

Additionally, the hardcoded weekly threshold of 40 hours means overtime only triggers when a single staff member works 40+ hours in a week. With typical 7-hour shifts, this requires 6+ shifts/week -- unlikely in most weeks. The settings UI defaults to 48 hours (UK Working Time Directive), making the mismatch even more confusing.

## Plan

### 1. Persist overtime settings to the database

Update `OvertimeSettings.tsx` to read/write from the `app_settings` table using the key `overtime_config`. This follows the same pattern already used by other settings (budget, shift times, work hours).

### 2. Create a hook to read overtime settings

Create `src/hooks/useOvertimeSettings.ts` that fetches the `overtime_config` from `app_settings` and provides defaults matching the current UI defaults (weekly: 48h, daily: 8h, rate: 1.5x, bankHolidayRate: 2.0).

### 3. Update payroll calculation to use dynamic settings

Modify `generatePayrollSummary` in `src/lib/payroll.ts` to:
- Accept overtime config as a parameter (threshold, multiplier, daily threshold)
- Implement **daily** overtime detection (hours over daily threshold per attendance record)
- Apply the correct multiplier from settings instead of the hardcoded 1.5x
- Remove the hardcoded `WEEKLY_OVERTIME_THRESHOLD` and `OVERTIME_MULTIPLIER` constants

### 4. Wire settings into the Payroll page

Update `src/pages/Payroll.tsx` to fetch overtime settings via the new hook and pass them into `generatePayrollSummary`.

### 5. Update CSV export

Ensure `exportPayrollCSV` continues to work with the updated `PayrollSummary` structure (no schema changes needed since the interface already has `overtimeHours` and `overtimePay`).

## Technical Details

- **Database**: No migration needed. Reuses existing `app_settings` table with key `overtime_config`.
- **Settings shape stored in DB**:
```text
{
  enabled: boolean,
  weeklyThreshold: number,
  dailyThreshold: number,
  rate: number,
  bankHolidayRate: number
}
```
- **Files modified**: `OvertimeSettings.tsx`, `payroll.ts`, `Payroll.tsx`, plus new `useOvertimeSettings.ts` hook.
- **Files unchanged**: Types, CSV export function signature, attendance types.
