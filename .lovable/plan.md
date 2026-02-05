

## Lateness & Absenteeism Tracking Implementation Plan

### Overview

This plan adds comprehensive lateness and absenteeism tracking to PocketCafe, including automatic detection, real-time alerts, reporting, and manager dashboard indicators.

---

## Part 1: Database Schema Changes

### 1.1 Create Settings Table
Persist global work hours settings so they apply system-wide:

```sql
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (is_admin());

-- Managers can view settings
CREATE POLICY "Managers can view settings" ON public.app_settings
  FOR SELECT USING (is_manager());
```

**Default settings to insert:**
```sql
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('work_hours', '{
    "latenessGraceMinutes": 5,
    "noShowThresholdMinutes": 30,
    "paidBreakMinutes": 30,
    "minRestBetweenShifts": 11,
    "maxWeeklyHours": 48,
    "autoClockOutEnabled": true,
    "autoClockOutHours": 12
  }');
```

### 1.2 Add Lateness Columns to Attendance Records
Track lateness details on each attendance record:

```sql
ALTER TABLE public.attendance_records
  ADD COLUMN scheduled_start_time time,
  ADD COLUMN is_late boolean DEFAULT false,
  ADD COLUMN late_minutes integer DEFAULT 0;
```

### 1.3 Create No-Show Records Table
Track staff who were scheduled but never clocked in:

```sql
CREATE TABLE public.no_show_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  scheduled_start_time time NOT NULL,
  detected_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.no_show_records ENABLE ROW LEVEL SECURITY;

-- Policies for managers/admins
CREATE POLICY "Admins can manage no-shows" ON public.no_show_records
  FOR ALL USING (is_admin());

CREATE POLICY "Managers can manage no-shows" ON public.no_show_records
  FOR ALL USING (is_manager());

-- Staff can view their own no-show records
CREATE POLICY "Staff can view own no-shows" ON public.no_show_records
  FOR SELECT USING (staff_id IN (
    SELECT id FROM staff_profiles WHERE user_id = auth.uid()
  ));

-- Enable realtime for no-shows
ALTER PUBLICATION supabase_realtime ADD TABLE public.no_show_records;
```

---

## Part 2: Lateness Detection Logic

### 2.1 Create Lateness Calculator Utility
New file: `src/lib/attendance.ts`

```typescript
interface LatenessResult {
  isLate: boolean;
  lateMinutes: number;
  graceApplied: boolean;
}

/**
 * Calculate if a clock-in is late compared to scheduled shift start
 */
export function calculateLateness(
  clockInTime: Date,
  scheduledStartTime: string,  // e.g., "08:00"
  shiftDate: string,           // e.g., "2026-02-05"
  graceMinutes: number = 5
): LatenessResult {
  // Build scheduled datetime
  const scheduledDateTime = new Date(`${shiftDate}T${scheduledStartTime}`);
  
  // Calculate difference in minutes
  const diffMs = clockInTime.getTime() - scheduledDateTime.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  // Within grace period = not late
  if (diffMinutes <= graceMinutes) {
    return { isLate: false, lateMinutes: 0, graceApplied: diffMinutes > 0 };
  }
  
  // Late
  return {
    isLate: true,
    lateMinutes: diffMinutes,
    graceApplied: false,
  };
}

/**
 * Check if staff is a no-show based on threshold
 */
export function isNoShow(
  scheduledStartTime: string,
  shiftDate: string,
  currentTime: Date,
  thresholdMinutes: number = 30
): boolean {
  const scheduledDateTime = new Date(`${shiftDate}T${scheduledStartTime}`);
  const diffMs = currentTime.getTime() - scheduledDateTime.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  return diffMinutes >= thresholdMinutes;
}
```

### 2.2 Update useAttendance Hook
Modify clock-in mutation to calculate lateness:

```typescript
const clockIn = useMutation({
  mutationFn: async ({ staffId, faceConfidence, overrideBy, overridePinUsed, scheduledStartTime, shiftDate }: ClockInParams) => {
    // Calculate lateness
    const clockInTime = new Date();
    const graceMinutes = 5; // TODO: Fetch from settings
    const lateness = calculateLateness(clockInTime, scheduledStartTime, shiftDate, graceMinutes);
    
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        staff_id: staffId,
        status: 'clocked_in',
        face_match_confidence: faceConfidence,
        override_by: overrideBy,
        override_pin_used: overridePinUsed ?? false,
        scheduled_start_time: scheduledStartTime,
        is_late: lateness.isLate,
        late_minutes: lateness.lateMinutes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  // ... rest of mutation config
});
```

---

## Part 3: No-Show Detection System

### 3.1 Create No-Show Detection Hook
New file: `src/hooks/useNoShowDetection.ts`

This hook runs periodically to check for staff who should have clocked in but haven't:

```typescript
export function useNoShowDetection() {
  const queryClient = useQueryClient();
  
  // Detect no-shows for today's shifts
  const detectNoShows = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    
    // Get today's shifts
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, staff_id, shift_date, start_time')
      .eq('shift_date', today);
    
    // Get today's attendance
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('staff_id')
      .gte('clock_in_time', `${today}T00:00:00`)
      .lte('clock_in_time', `${today}T23:59:59`);
    
    const clockedInStaffIds = new Set(attendance?.map(a => a.staff_id));
    
    // Find shifts where staff hasn't clocked in and is past threshold
    for (const shift of shifts ?? []) {
      if (clockedInStaffIds.has(shift.staff_id)) continue;
      
      if (isNoShow(shift.start_time, shift.shift_date, now, 30)) {
        // Check if already recorded
        const { data: existing } = await supabase
          .from('no_show_records')
          .select('id')
          .eq('shift_id', shift.id)
          .eq('shift_date', today)
          .maybeSingle();
        
        if (!existing) {
          // Create no-show record
          await supabase.from('no_show_records').insert({
            staff_id: shift.staff_id,
            shift_id: shift.id,
            shift_date: shift.shift_date,
            scheduled_start_time: shift.start_time,
          });
        }
      }
    }
  }, []);
  
  // Run every 5 minutes
  useEffect(() => {
    detectNoShows(); // Initial check
    const interval = setInterval(detectNoShows, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [detectNoShows]);
  
  return { detectNoShows };
}
```

### 3.2 Create No-Shows Query Hook
New file: `src/hooks/useNoShows.ts`

```typescript
export function useNoShows(date?: Date) {
  const targetDate = date || new Date();
  const dateStr = format(targetDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['no-shows', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('no_show_records')
        .select(`
          *,
          staff_profiles (id, name, profile_photo_url, role),
          shifts (shift_type, start_time, end_time)
        `)
        .eq('shift_date', dateStr)
        .eq('resolved', false)
        .order('detected_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}
```

---

## Part 4: Settings Persistence

### 4.1 Create Settings Hook
New file: `src/hooks/useAppSettings.ts`

```typescript
interface WorkHoursSettings {
  latenessGraceMinutes: number;
  noShowThresholdMinutes: number;
  paidBreakMinutes: number;
  minRestBetweenShifts: number;
  maxWeeklyHours: number;
  autoClockOutEnabled: boolean;
  autoClockOutHours: number;
}

export function useWorkHoursSettings() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['settings', 'work_hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'work_hours')
        .maybeSingle();
      
      if (error) throw error;
      return (data?.setting_value as WorkHoursSettings) ?? DEFAULT_WORK_HOURS;
    },
  });
  
  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<WorkHoursSettings>) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'work_hours',
          setting_value: { ...query.data, ...settings },
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'work_hours'] });
      toast.success('Settings saved');
    },
  });
  
  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings,
  };
}
```

### 4.2 Update WorkHoursSettings Component
Connect the UI to the database:

```typescript
// Replace useState with useWorkHoursSettings hook
const { settings, isLoading, updateSettings } = useWorkHoursSettings();

const handleSave = () => {
  updateSettings.mutate(localConfig);
};
```

---

## Part 5: UI Updates

### 5.1 Update TodayRoster
Add "Late" and "No-Show" status indicators:

```typescript
// Add new status types
type RosterStatus = 'not_arrived' | 'late' | 'clocked_in' | 'on_break' | 'clocked_out' | 'no_show';

// Update getStatusBadge
const getStatusBadge = (status: RosterStatus, lateMinutes?: number) => {
  switch (status) {
    case 'late':
      return (
        <Badge className="bg-destructive text-destructive-foreground">
          Late ({lateMinutes}m)
        </Badge>
      );
    case 'no_show':
      return <Badge variant="destructive">No-Show</Badge>;
    // ... existing cases
  }
};
```

### 5.2 Update Attendance Page
Add late/no-show indicators and filtering:

```typescript
// Add summary cards
const lateCount = attendance.filter(a => a.is_late).length;
const noShowCount = noShows?.length ?? 0;

// Add Late indicator on attendance records
{record.is_late && (
  <Badge variant="destructive" className="ml-2">
    {record.late_minutes}m late
  </Badge>
)}

// Add No-Shows section
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-destructive" />
      No-Shows ({noShowCount})
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* List of no-show staff with resolve action */}
  </CardContent>
</Card>
```

### 5.3 Update Dashboard
Add late arrivals and no-show alerts:

```typescript
// Add to quick stats grid
<Card>
  <CardHeader>
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Late Arrivals
    </CardTitle>
    <AlertTriangle className="h-4 w-4 text-warning" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-warning">{lateCount}</div>
    <p className="text-xs text-muted-foreground">Today</p>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle className="text-sm font-medium text-muted-foreground">
      No-Shows
    </CardTitle>
    <AlertTriangle className="h-4 w-4 text-destructive" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-destructive">{noShowCount}</div>
    <p className="text-xs text-muted-foreground">Unresolved</p>
  </CardContent>
</Card>
```

### 5.4 Update Kiosk to Pass Shift Info
When clocking in, include the scheduled shift time:

```typescript
// In handleQuickAction:
case 'clock_in':
  // Find the staff's shift for today
  const todayShift = shifts.find(s => s.staff_id === staffId);
  
  await clockIn.mutateAsync({
    staffId,
    faceConfidence: confidence,
    scheduledStartTime: todayShift?.start_time,
    shiftDate: format(new Date(), 'yyyy-MM-dd'),
  });
  break;
```

---

## Part 6: Real-Time Updates

### 6.1 Update RealtimeProvider
Add subscription for no-show records:

```typescript
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'no_show_records',
  },
  (payload) => {
    console.log('[Realtime] no_show_records change:', payload.eventType);
    setLastSync(new Date());
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === 'no-shows';
      }
    });
  }
)
```

---

## Part 7: Reporting Integration

### 7.1 Add Lateness to Payroll Summary
Update PayrollSummary type and calculation:

```typescript
// In types/attendance.ts
export interface PayrollSummary {
  // ... existing fields
  lateCount: number;
  totalLateMinutes: number;
}

// In lib/payroll.ts
export function generatePayrollSummary(...) {
  // Count late arrivals
  const lateRecords = staffRecords.filter(r => r.is_late);
  const lateCount = lateRecords.length;
  const totalLateMinutes = lateRecords.reduce((sum, r) => sum + (r.late_minutes ?? 0), 0);
  
  return {
    // ... existing fields
    lateCount,
    totalLateMinutes,
  };
}
```

### 7.2 Add Lateness Column to Payroll CSV Export

```typescript
const headers = [
  // ... existing headers
  'Late Arrivals',
  'Total Late Minutes',
];

const rows = summaries.map((s) => [
  // ... existing fields
  s.lateCount.toString(),
  s.totalLateMinutes.toString(),
]);
```

---

## Implementation Summary

### Database Changes
| Change | Description |
|--------|-------------|
| New `app_settings` table | Persist global settings like grace periods |
| Alter `attendance_records` | Add `scheduled_start_time`, `is_late`, `late_minutes` columns |
| New `no_show_records` table | Track missed shifts |

### New Files
| File | Purpose |
|------|---------|
| `src/lib/attendance.ts` | Lateness calculation utilities |
| `src/hooks/useAppSettings.ts` | Settings persistence hook |
| `src/hooks/useNoShowDetection.ts` | Automatic no-show detection |
| `src/hooks/useNoShows.ts` | Query no-show records |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/useAttendance.ts` | Calculate lateness on clock-in |
| `src/components/settings/WorkHoursSettings.tsx` | Connect to database |
| `src/components/kiosk/TodayRoster.tsx` | Add late/no-show status badges |
| `src/pages/Attendance.tsx` | Show late indicators, no-show section |
| `src/pages/Index.tsx` | Add late/no-show stats cards |
| `src/pages/Kiosk.tsx` | Pass shift info to clock-in |
| `src/providers/RealtimeProvider.tsx` | Subscribe to no-show changes |
| `src/lib/payroll.ts` | Include lateness in payroll reports |
| `src/types/attendance.ts` | Add lateness fields to types |

---

## Data Flow

```text
Staff approaches Kiosk
        ↓
Face recognized → Find scheduled shift
        ↓
Clock In with scheduled_start_time
        ↓
Calculate lateness (clock_in_time - scheduled_start_time - grace)
        ↓
Insert attendance_record with is_late, late_minutes
        ↓
Realtime updates → Dashboard shows "Late Arrivals: 1"
                 → Attendance page shows late badge
                 → TodayRoster shows "Late (12m)"

═══════════════════════════════════════════════════

Background Process (every 5 min):
        ↓
Check today's shifts vs attendance
        ↓
Staff scheduled at 08:00 but no clock-in by 08:30?
        ↓
Create no_show_record
        ↓
Realtime updates → Dashboard shows "No-Shows: 1"
                 → Attendance page shows no-show alert
                 → Manager can resolve with notes
```

---

## Expected Outcomes

1. **Lateness Tracking**: Every clock-in compares against scheduled shift start time
2. **Grace Period**: Configurable (default 5 min) - arrivals within grace are not marked late
3. **No-Show Detection**: Automatic detection 30+ minutes after shift start
4. **Manager Visibility**: Dashboard shows late/no-show counts in real-time
5. **Attendance Records**: Visual indicators for late arrivals
6. **Roster Updates**: TodayRoster shows "Late (Xm)" or "No-Show" status
7. **Payroll Integration**: Late counts included in payroll reports
8. **Settings Persistence**: Grace periods saved to database, not just local state

---

## Testing Checklist
- [ ] Clock in 10 minutes after shift start → marked as "Late (5m)" (after 5-min grace)
- [ ] Clock in 3 minutes after shift start → NOT marked late (within grace)
- [ ] Staff doesn't clock in 30 min after shift start → no-show record created
- [ ] Dashboard shows accurate late/no-show counts
- [ ] TodayRoster shows correct status badges
- [ ] Manager can resolve no-show with notes
- [ ] Payroll report includes late arrival counts
- [ ] Settings changes persist after page refresh

