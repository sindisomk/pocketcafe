

## Comprehensive Fix Plan: Late Arrivals, Budget Integration & Reports Enhancement

This plan addresses three key issues:
1. Late arrivals not being tracked when staff clock in via Manager Override
2. Budget settings not persisted to database, and not used in Payroll/Reports
3. Reports need multiple time period views and leave balance integration

---

## Issue 1: Late Arrivals Not Detected

### Root Cause Analysis

When staff clock in via **face recognition quick action**, the code correctly passes the scheduled shift time:

```typescript
// In Kiosk.tsx handleQuickAction - CORRECT
await clockIn.mutateAsync({
  staffId,
  faceConfidence: confidence,
  scheduledStartTime: todayShift?.start_time,  // Passed correctly
  shiftDate: today,
  graceMinutes: settings.latenessGraceMinutes,
});
```

However, when staff clock in via **Manager Override** (ClockActionModal), no shift information is passed:

```typescript
// In ClockActionModal.tsx - MISSING shift data
await clockIn.mutateAsync({
  staffId,
  faceConfidence,
  overrideBy: isManagerOverride ? overrideManagerId : undefined,
  overridePinUsed: isManagerOverride,
  // scheduledStartTime: MISSING
  // shiftDate: MISSING
});
```

**Database Evidence**: All 3 attendance records from today have `scheduled_start_time: nil` and `is_late: false`, even though they clocked in at 10:20, 10:28, and 10:43 for 08:00 morning shifts.

### Solution

**Modify `ClockActionModal.tsx`** to:
1. Accept the staff's scheduled shift information as props
2. Pass this to the `clockIn` mutation

**Modify `Kiosk.tsx`** to:
1. Pass the current shift data to `ClockActionModal`
2. Include grace minutes from settings

---

## Issue 2: Budget Settings Not Persisted

### Root Cause

`DepartmentBudgetSettings.tsx` uses local `useState` - values are lost on page refresh:

```typescript
const [budgets, setBudgets] = useState<DepartmentBudget>({
  kitchen: 5000,
  floor: 6000,
  management: 3000,
});
```

### Solution

**Create `useBudgetSettings.ts` hook** following the same pattern as `useOutletSettings`:
- Store in `app_settings` table with key `department_budgets`
- Add `bar` department (currently missing in budget UI but exists in staff roles)

**Update `DepartmentBudgetSettings.tsx`** to use the new hook.

---

## Issue 3: Reports Enhancements

### Current State
- Only shows monthly data
- No budget comparison
- No leave balance trends
- No time period switching (week/month/quarter/year)

### Solution

**Part A: Time Period Selector**
Add a period selector (Week, Month, Quarter, Year) that adjusts:
- Date range calculations
- Chart granularity (days for week, weeks for month, months for quarter/year)

**Part B: Budget vs Actual Cards**
- Add summary cards showing Actual Spend vs Budget by department
- Color-coded progress bars (green = under budget, red = over budget)
- Show total budget utilization percentage

**Part C: Leave Balance Tab**
Add a new "Leave Balances" tab with:
- Bar chart showing each staff member's leave balance (used vs available)
- Summary of total accrued hours across all staff
- Highlight staff with low remaining balances

---

## Implementation Details

### Part 1: Fix ClockActionModal Late Tracking

**File: `src/components/kiosk/ClockActionModal.tsx`**

Add new props:
```typescript
interface ClockActionModalProps {
  // ... existing props
  scheduledStartTime?: string;
  shiftDate?: string;
  graceMinutes?: number;
}
```

Update clock_in action:
```typescript
case 'clock_in':
  await clockIn.mutateAsync({
    staffId,
    faceConfidence,
    overrideBy: isManagerOverride ? overrideManagerId : undefined,
    overridePinUsed: isManagerOverride,
    scheduledStartTime,   // New
    shiftDate,            // New
    graceMinutes,         // New
  });
  break;
```

**File: `src/pages/Kiosk.tsx`**

Pass shift data to modal:
```typescript
<ClockActionModal
  // ... existing props
  scheduledStartTime={shifts.find(s => s.staff_id === selectedStaff?.id)?.start_time}
  shiftDate={today}
  graceMinutes={settings.latenessGraceMinutes}
/>
```

---

### Part 2: Budget Settings Persistence

**New File: `src/hooks/useBudgetSettings.ts`**

```typescript
export interface BudgetSettings {
  kitchen: number;
  floor: number;
  bar: number;
  management: number;
}

const DEFAULT_BUDGETS: BudgetSettings = {
  kitchen: 5000,
  floor: 6000,
  bar: 4000,
  management: 3000,
};

export function useBudgetSettings() {
  // Query from app_settings where setting_key = 'department_budgets'
  // Return settings, isLoading, updateSettings
}
```

**File: `src/components/settings/DepartmentBudgetSettings.tsx`**

Replace local state with hook:
```typescript
const { settings: budgets, updateSettings, isLoading } = useBudgetSettings();

// Add Bar department to the UI
// Update handleSave to call updateSettings.mutateAsync()
```

---

### Part 3: Reports Enhancements

**File: `src/pages/Reports.tsx`**

**A. Add Period Type State:**
```typescript
type PeriodType = 'week' | 'month' | 'quarter' | 'year';
const [periodType, setPeriodType] = useState<PeriodType>('month');
```

**B. Dynamic Date Range Calculation:**
```typescript
const { start, end } = useMemo(() => {
  switch (periodType) {
    case 'week':
      return { start: startOfWeek(...), end: endOfWeek(...) };
    case 'month':
      return { start: startOfMonth(...), end: endOfMonth(...) };
    case 'quarter':
      return { start: startOfQuarter(...), end: endOfQuarter(...) };
    case 'year':
      return { start: startOfYear(...), end: endOfYear(...) };
  }
}, [periodType, offset]);
```

**C. Budget vs Actual Summary Cards:**
```typescript
const budgetComparison = useMemo(() => {
  return Object.entries(budgets).map(([dept, budget]) => {
    const actual = laborCostsByDepartment.find(d => d.key === dept)?.cost ?? 0;
    const percentUsed = (actual / budget) * 100;
    return { dept, budget, actual, percentUsed, overBudget: actual > budget };
  });
}, [budgets, laborCostsByDepartment]);
```

**D. Add Leave Balances Tab:**
```typescript
<TabsTrigger value="leave-balances">Leave Balances</TabsTrigger>

<TabsContent value="leave-balances">
  <Card>
    <CardHeader>
      <CardTitle>Staff Leave Balances</CardTitle>
    </CardHeader>
    <CardContent>
      <BarChart data={leaveBalanceData}>
        <Bar dataKey="used" name="Used" stackId="a" fill="hsl(var(--chart-2))" />
        <Bar dataKey="available" name="Available" stackId="a" fill="hsl(var(--primary))" />
      </BarChart>
    </CardContent>
  </Card>
</TabsContent>
```

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useBudgetSettings.ts` | Persist department budgets to database |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/kiosk/ClockActionModal.tsx` | Accept and pass shift data for lateness calculation |
| `src/pages/Kiosk.tsx` | Pass shift info to ClockActionModal |
| `src/components/settings/DepartmentBudgetSettings.tsx` | Use database hook instead of local state, add Bar department |
| `src/pages/Reports.tsx` | Add period selector, budget comparison, leave balances tab |
| `src/pages/Payroll.tsx` | Add budget vs actual progress indicator to summary cards |

---

## Data Flow Diagram

```text
Settings Page
     │
     ▼
┌─────────────────┐
│ useBudgetSettings│ ──────► app_settings table
└─────────────────┘          (key: 'department_budgets')
     │
     ▼
┌─────────────────┐
│ Reports Page    │◄──── Labor costs from attendance
│                 │◄──── Leave balances from leave_balances
│                 │◄──── Budgets from useBudgetSettings
└─────────────────┘
     │
     ▼
Budget vs Actual charts with % indicators
```

---

## Testing Checklist

### Late Arrivals Fix
- [ ] Clock in via Manager Override for a scheduled shift
- [ ] Verify `is_late` and `late_minutes` are populated in database
- [ ] Verify late badge appears on Attendance page
- [ ] Verify manager notification is sent for late arrival

### Budget Persistence
- [ ] Change budget values in Settings
- [ ] Refresh page - values should persist
- [ ] Verify budgets display in Reports

### Reports Enhancements
- [ ] Switch between Week/Month/Quarter/Year views
- [ ] Verify charts update with correct data granularity
- [ ] Verify budget vs actual comparison displays
- [ ] Verify Leave Balances tab shows all staff

