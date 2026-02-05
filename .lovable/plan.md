

## Missing Features & Bug Fixes Implementation Plan

This plan addresses four distinct issues reported:
1. **Missing Leave Balances** - No leave balance tracking for staff
2. **Missing Manager Notifications** - No notification system for managers
3. **Kiosk Sleep/Wake Mode** - No power-saving mode for kiosk
4. **Dashboard Disappearing** - Console warning about forwardRef in ShiftSlot

---

## Part 1: Leave Balance Tracking

### Root Cause Analysis
The database has no `leave_balances` table. The PRD specifies that zero-hour staff accrue holiday at **12.07%** of hours worked, but this calculation isn't tracked anywhere. Staff profiles only mention the accrual rate in the UI text but don't store or calculate actual balances.

### Database Schema

**Create `leave_balances` table:**
```sql
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid UNIQUE NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  total_entitlement_hours numeric(10,2) DEFAULT 0,  -- Annual entitlement
  used_hours numeric(10,2) DEFAULT 0,               -- Hours used
  accrued_hours numeric(10,2) DEFAULT 0,            -- For zero-hour: 12.07% of worked hours
  year integer DEFAULT EXTRACT(YEAR FROM now()),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view own balance" ON public.leave_balances
  FOR SELECT USING (staff_id IN (
    SELECT id FROM staff_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can view all balances" ON public.leave_balances
  FOR SELECT USING (is_manager());

CREATE POLICY "Admins can manage balances" ON public.leave_balances
  FOR ALL USING (is_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_balances;
```

### Implementation Details

**New File: `src/hooks/useLeaveBalance.ts`**
```typescript
export interface LeaveBalance {
  id: string;
  staff_id: string;
  total_entitlement_hours: number;
  used_hours: number;
  accrued_hours: number;
  year: number;
}

export function useLeaveBalance(staffId?: string) {
  // Query leave balances
  // Calculate available = (total_entitlement + accrued) - used
  // For zero-hour staff: accrued = total_hours_worked * 0.1207
  return {
    balance,
    availableHours,
    updateBalance,
    recalculateAccrual,  // Recalculate based on attendance records
  };
}
```

**Update `src/pages/Leave.tsx`:**
- Add summary card showing staff's leave balance before request list
- Show available days/hours when submitting new request
- Display balance depletion warning if request would exceed available leave

**Update `src/components/staff/StaffDetailSheet.tsx`:**
- Add "Leave Balance" section showing:
  - Annual entitlement (e.g., 28 days for salaried)
  - Days used this year
  - Days remaining
  - For zero-hour: Accrued hours based on 12.07% calculation

**Update `src/hooks/useLeaveRequests.ts`:**
- When leave request is approved, deduct from `used_hours`
- Validate that staff has sufficient balance before approving

### Accrual Calculation Logic

For zero-hour staff, calculate accrued leave from attendance:
```typescript
// In src/lib/payroll.ts or new utility
export function calculateAccruedLeave(
  hoursWorked: number,
  accrualRate: number = 0.1207  // 12.07%
): number {
  return hoursWorked * accrualRate;
}

// When clock-out happens or payroll is calculated:
// Update leave_balances.accrued_hours = total_hours_worked * 0.1207
```

---

## Part 2: Manager Notifications System

### Root Cause Analysis
No notification infrastructure exists. The PRD mentions managers should receive:
- Alerts when staff clock in late
- Alerts when breaks exceed 30 minutes
- Alerts for no-shows
- Shift publishing notifications

### Database Schema

**Create `notifications` table:**
```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,  -- 'late_arrival', 'extended_break', 'no_show', 'shift_published', 'leave_request'
  title text NOT NULL,
  message text,
  related_staff_id uuid REFERENCES staff_profiles(id),
  related_record_id uuid,  -- ID of related record (attendance, leave request, etc.)
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### Implementation Details

**New File: `src/hooks/useNotifications.ts`**
```typescript
export interface Notification {
  id: string;
  type: 'late_arrival' | 'extended_break' | 'no_show' | 'shift_published' | 'leave_request';
  title: string;
  message: string | null;
  related_staff_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  // Query unread notifications for current user
  // Mark as read
  // Subscribe to realtime updates
  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
```

**New File: `src/components/layout/NotificationBell.tsx`**
- Bell icon in header with unread badge
- Dropdown showing recent notifications
- Click to mark as read and navigate to relevant page

**Update `src/components/layout/AppLayout.tsx`:**
- Add NotificationBell to header between SidebarTrigger and flex-1

**Create Notification Triggers:**

Update these hooks to create notifications:

1. **`useAttendance.ts` - clockIn mutation:**
```typescript
// After successful clock-in, if is_late is true:
// Create notification for all managers:
await supabase.from('notifications').insert({
  recipient_id: managerId,
  type: 'late_arrival',
  title: `${staffName} clocked in late`,
  message: `${lateMinutes} minutes late for ${shiftType} shift`,
  related_staff_id: staffId,
  related_record_id: attendanceId,
});
```

2. **`useNoShowDetection.ts`:**
```typescript
// When no-show is detected:
// Create notification for all managers
```

3. **`useAttendance.ts` - break monitoring:**
```typescript
// Background check: if break exceeds 30 minutes
// Create 'extended_break' notification
```

4. **`useLeaveRequests.ts` - createLeaveRequest:**
```typescript
// When new leave request is submitted:
// Notify all managers
```

**Update `src/pages/Index.tsx` (Dashboard):**
- Add "Recent Alerts" card showing last 5 notifications
- Link to full notifications page if needed

---

## Part 3: Kiosk Sleep/Wake Mode

### Requirements
- Kiosk should enter sleep mode after inactivity (e.g., 5 minutes)
- Sleep mode dims screen, shows clock/date, stops camera
- Any touch/motion wakes the kiosk
- Reduces power consumption and camera wear

### Implementation Details

**Update `src/pages/Kiosk.tsx`:**
```typescript
const SLEEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const [isSleeping, setIsSleeping] = useState(false);
const sleepTimerRef = useRef<ReturnType<typeof setTimeout>>();

// Reset sleep timer on any interaction
const resetSleepTimer = useCallback(() => {
  if (sleepTimerRef.current) {
    clearTimeout(sleepTimerRef.current);
  }
  setIsSleeping(false);
  sleepTimerRef.current = setTimeout(() => {
    setIsSleeping(true);
  }, SLEEP_TIMEOUT_MS);
}, []);

useEffect(() => {
  // Listen for any interaction
  const events = ['mousedown', 'touchstart', 'keydown', 'mousemove'];
  events.forEach(event => document.addEventListener(event, resetSleepTimer));
  
  // Start initial timer
  resetSleepTimer();
  
  return () => {
    events.forEach(event => document.removeEventListener(event, resetSleepTimer));
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  };
}, [resetSleepTimer]);
```

**New Component: `src/components/kiosk/SleepOverlay.tsx`**
```tsx
export function SleepOverlay({ onWake }: { onWake: () => void }) {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 bg-sidebar flex flex-col items-center justify-center cursor-pointer"
      onClick={onWake}
      onTouchStart={onWake}
    >
      <Coffee className="h-24 w-24 text-primary mb-8 animate-pulse" />
      <p className="text-6xl font-bold text-sidebar-foreground font-mono">
        {format(time, 'HH:mm')}
      </p>
      <p className="text-2xl text-sidebar-foreground/70 mt-4">
        {format(time, 'EEEE, MMMM d, yyyy')}
      </p>
      <p className="text-lg text-sidebar-foreground/50 mt-8">
        Tap anywhere to wake
      </p>
    </div>
  );
}
```

**Update `src/pages/Kiosk.tsx` render:**
```tsx
return (
  <div className="min-h-screen bg-sidebar text-sidebar-foreground">
    {isSleeping && <SleepOverlay onWake={resetSleepTimer} />}
    
    {/* Only render camera when not sleeping */}
    {!isSleeping && (
      <CameraFeed ... />
    )}
    
    {/* Rest of kiosk UI */}
  </div>
);
```

**Update `src/components/kiosk/CameraFeed.tsx`:**
- Accept optional `enabled` prop
- Stop camera stream when `enabled` is false
- Restart camera when `enabled` becomes true

---

## Part 4: ShiftSlot forwardRef Warning Fix

### Root Cause Analysis
Console shows:
```
Warning: Function components cannot be given refs. 
Check the render method of `DayColumn`.
at ShiftSlot
```

This happens because `useDroppable` from dnd-kit passes a ref to ShiftSlot via `setNodeRef`, but ShiftSlot is a function component that doesn't forward refs.

### Fix

**Update `src/components/scheduler/ShiftSlot.tsx`:**
```typescript
import { forwardRef } from 'react';

export const ShiftSlot = forwardRef<HTMLDivElement, ShiftSlotProps>(function ShiftSlot({
  date,
  shiftType,
  shifts,
  hasRestWarning,
  onRemoveShift,
  isLoading,
}, externalRef) {
  const slotId = `${date.toISOString()}-${shiftType}`;
  
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { date, shiftType },
  });

  // Combine refs
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      externalRef.current = node;
    }
  };

  return (
    <div
      ref={combinedRef}
      // ... rest unchanged
    />
  );
});
```

---

## Implementation Summary

### Database Changes
| Change | Description |
|--------|-------------|
| New `leave_balances` table | Track staff leave entitlement, used, and accrued hours |
| New `notifications` table | Store manager alerts and notifications |
| Enable realtime on both tables | Push updates to connected clients |

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useLeaveBalance.ts` | Query and manage leave balances |
| `src/hooks/useNotifications.ts` | Query and manage notifications |
| `src/components/layout/NotificationBell.tsx` | Header notification indicator with dropdown |
| `src/components/kiosk/SleepOverlay.tsx` | Sleep mode display for kiosk |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Leave.tsx` | Add leave balance summary card |
| `src/components/staff/StaffDetailSheet.tsx` | Add leave balance section |
| `src/hooks/useLeaveRequests.ts` | Validate balance on approval, deduct on approve |
| `src/hooks/useAttendance.ts` | Create notifications for late arrivals |
| `src/hooks/useNoShowDetection.ts` | Create notifications for no-shows |
| `src/components/layout/AppLayout.tsx` | Add NotificationBell to header |
| `src/pages/Index.tsx` | Add recent alerts section |
| `src/pages/Kiosk.tsx` | Add sleep/wake mode logic |
| `src/components/kiosk/CameraFeed.tsx` | Add enabled prop to control camera |
| `src/components/scheduler/ShiftSlot.tsx` | Wrap with forwardRef |
| `src/providers/RealtimeProvider.tsx` | Subscribe to leave_balances and notifications |
| `src/lib/queryKeys.ts` | Add keys for leaveBalances and notifications |

---

## Data Flow Diagrams

### Leave Balance Flow
```text
Staff works shift → Clock out recorded
        ↓
For zero-hour: Calculate accrual (hours × 12.07%)
        ↓
Update leave_balances.accrued_hours
        ↓
Staff submits leave request
        ↓
System validates: requested_days ≤ available_balance
        ↓
Manager approves → leave_balances.used_hours += approved_days
        ↓
Leave.tsx shows updated balance
```

### Notification Flow
```text
Late clock-in detected
        ↓
Get all manager user_ids from user_roles
        ↓
Insert notification for each manager
        ↓
Realtime pushes to RealtimeProvider
        ↓
NotificationBell badge updates
        ↓
Manager clicks → marks as read → navigates to Attendance
```

### Kiosk Sleep/Wake Flow
```text
Last interaction timestamp
        ↓
5 min inactivity → isSleeping = true
        ↓
SleepOverlay renders (camera stops)
        ↓
Touch/click detected → resetSleepTimer()
        ↓
isSleeping = false → camera restarts
```

---

## Testing Checklist
- [ ] Leave balance shows on Staff Detail Sheet
- [ ] Leave page shows balance summary before requests
- [ ] Leave request validation prevents exceeding balance
- [ ] Approving leave deducts from balance
- [ ] Zero-hour staff balance accrues at 12.07% of worked hours
- [ ] Notification bell appears in header
- [ ] Late clock-in creates notification for managers
- [ ] No-show creates notification for managers
- [ ] Notifications can be marked as read
- [ ] Kiosk enters sleep mode after 5 min inactivity
- [ ] Tapping sleep screen wakes kiosk
- [ ] Camera stops during sleep mode
- [ ] No console warning for ShiftSlot forwardRef

