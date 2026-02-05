

## Code Cleanup & Real-Time Data Optimization Plan

### Overview

This plan addresses code quality improvements, error handling robustness, loading state optimization, and implements real-time data updates across all relevant pages to eliminate the need for manual page refreshes.

---

## Part 1: Console Warning Fixes

### Issue 1: Badge and MobileNav ref warnings
The console logs show warnings about function components being given refs in `Badge` and `MobileNav`.

**Root Cause**: These components don't use `React.forwardRef` but are receiving refs from parent components.

**Files to Fix**:
| File | Change |
|------|--------|
| `src/components/ui/badge.tsx` | Wrap with `React.forwardRef` |
| `src/components/layout/MobileNav.tsx` | Wrap with `React.forwardRef` |

---

## Part 2: Centralized Query Key Management

Currently query keys are scattered as inline strings, making invalidation error-prone.

**Create**: `src/lib/queryKeys.ts`

```typescript
export const queryKeys = {
  staff: ['staff'] as const,
  attendance: (date: string) => ['attendance', date] as const,
  shifts: (weekStart: string) => ['shifts', weekStart] as const,
  shiftsToday: (date: string) => ['shifts-today', date] as const,
  weeklySchedule: (weekStart: string) => ['weekly-schedule', weekStart] as const,
  leaveRequests: ['leave-requests'] as const,
  payrollAttendance: (start: string, end: string) => ['payroll-attendance', start, end] as const,
} as const;
```

**Update all hooks to use centralized keys** for consistent invalidation.

---

## Part 3: Real-Time Data Subscriptions

Currently there are **no real-time subscriptions** - data only updates via manual refetch or query invalidation. This causes stale data across pages.

### Implementation: Create a Realtime Provider

**Create**: `src/providers/RealtimeProvider.tsx`

This provider will:
1. Subscribe to `attendance_records` changes for live clock-in/out updates
2. Subscribe to `shifts` changes for schedule updates
3. Subscribe to `leave_requests` changes for leave management
4. Subscribe to `staff_profiles` changes for roster updates
5. Automatically invalidate relevant React Query caches when changes occur

```text
Database Change → Supabase Realtime → RealtimeProvider → queryClient.invalidateQueries()
                                                       ↓
                                            All subscribed components re-render
```

**Database Migration**: Enable realtime on required tables

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_profiles;
```

### Affected Pages (will update automatically):
- **Dashboard** (`Index.tsx`) - Staff on-site count, live status
- **Attendance** (`Attendance.tsx`) - Clock-in/out records
- **Kiosk** (`Kiosk.tsx`) - TodayRoster status
- **Schedule** (`Schedule.tsx`) - Shift assignments
- **Leave** (`Leave.tsx`) - Leave request status
- **Payroll** (`Payroll.tsx`) - Attendance-based calculations

---

## Part 4: Loading State Improvements

### Create Unified Loading Components

**Create**: `src/components/ui/loading-states.tsx`

```typescript
// PageLoadingSkeleton - Full page loading
// CardLoadingSkeleton - Card content loading  
// TableLoadingSkeleton - Table row loading
// InlineLoader - Inline text loading indicator
```

### Update Pages with Consistent Loading States

| Page | Current State | Improvement |
|------|---------------|-------------|
| `Index.tsx` | Shows "—" for loading values | Add `<PageLoadingSkeleton>` for initial load |
| `Attendance.tsx` | Basic skeleton | Enhanced skeleton matching layout |
| `Leave.tsx` | Loader2 spinner | Consistent skeleton pattern |
| `Payroll.tsx` | Basic row skeletons | Match table structure |

---

## Part 5: Error Handling Improvements

### 5.1 Create Error Display Components

**Create**: `src/components/ui/error-states.tsx`

```typescript
// QueryError - Display query errors with retry button
// MutationError - Display mutation errors with dismiss
// ConnectionError - Network/offline state handling
```

### 5.2 Add Error Boundaries per Route

Update `App.tsx` to wrap each route with its own ErrorBoundary for isolated error handling:

```typescript
<Route path="/attendance" element={
  <ErrorBoundary fallback={<RouteErrorFallback />}>
    <Attendance />
  </ErrorBoundary>
} />
```

### 5.3 Improve Hook Error Handling

All hooks should expose error details consistently:

```typescript
return {
  data,
  isLoading,
  isError,
  error,
  errorMessage: error?.message ?? null,  // NEW
  retry: refetch,                          // NEW - renamed for clarity
};
```

---

## Part 6: Query Optimization

### 6.1 Add Stale Time Configuration

**Update**: `src/App.tsx` QueryClient config

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 minutes (reduced from 5)
      gcTime: 1000 * 60 * 30,        // 30 minutes garbage collection
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: true,    // Refetch when tab becomes active
      refetchOnReconnect: true,      // Refetch on network reconnect
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('[Mutation Error]', error);
      },
    },
  },
});
```

### 6.2 Optimistic Updates for Mutations

Add optimistic updates to attendance mutations for instant UI feedback:

```typescript
const clockIn = useMutation({
  mutationFn: async (params) => { /* ... */ },
  onMutate: async (params) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.attendance(dateStr) });
    const previous = queryClient.getQueryData(queryKeys.attendance(dateStr));
    
    // Optimistically update cache
    queryClient.setQueryData(queryKeys.attendance(dateStr), (old) => [
      { ...params, status: 'clocked_in', clock_in_time: new Date().toISOString() },
      ...(old || []),
    ]);
    
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(queryKeys.attendance(dateStr), context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance(dateStr) });
  },
});
```

---

## Part 7: TodayRoster Real-Time Sync Fix

The `TodayRoster` component in Kiosk currently uses a separate query (`['shifts-today', todayStr]`) which may not invalidate correctly.

**Fix**: Use the same query key pattern as `useSchedule` or subscribe to real-time changes.

**Changes**:
1. Move the `shifts-today` query into the `useSchedule` hook as an option
2. Or create a dedicated `useTodayShifts` hook that listens to real-time changes
3. Ensure query invalidation in `useAttendance` also invalidates `['shifts-today']`

---

## Part 8: Connection Status Indicator

**Create**: `src/components/system/ConnectionStatus.tsx`

A small indicator showing:
- Online/Offline status
- Realtime connection status (connected/reconnecting)
- Last data sync time

This provides visual feedback that data is live.

---

## Implementation Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/queryKeys.ts` | Centralized query key constants |
| `src/providers/RealtimeProvider.tsx` | Supabase realtime subscriptions |
| `src/components/ui/loading-states.tsx` | Unified loading skeletons |
| `src/components/ui/error-states.tsx` | Error display components |
| `src/components/system/ConnectionStatus.tsx` | Connection indicator |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/ui/badge.tsx` | Add `forwardRef` to fix console warning |
| `src/components/layout/MobileNav.tsx` | Add `forwardRef` to fix console warning |
| `src/App.tsx` | Wrap with `RealtimeProvider`, update QueryClient config |
| `src/hooks/useAttendance.ts` | Use centralized query keys, add optimistic updates |
| `src/hooks/useStaff.ts` | Use centralized query keys |
| `src/hooks/useSchedule.ts` | Use centralized query keys |
| `src/hooks/useLeaveRequests.ts` | Use centralized query keys |
| `src/hooks/usePayrollData.ts` | Use centralized query keys |
| `src/components/kiosk/TodayRoster.tsx` | Fix query key alignment |
| `src/pages/Index.tsx` | Add loading skeleton |
| `src/pages/Attendance.tsx` | Enhanced error/loading states |
| `src/pages/Leave.tsx` | Consistent loading pattern |
| `src/pages/Payroll.tsx` | Consistent loading pattern |

### Database Migration
Enable realtime on attendance_records, shifts, leave_requests, and staff_profiles tables.

---

## Expected Outcomes

1. **No console warnings** - forwardRef fixes eliminate React warnings
2. **Instant updates** - Real-time subscriptions push changes to all connected clients
3. **No page refresh needed** - Dashboard, Kiosk roster, Attendance all sync automatically
4. **Better UX** - Optimistic updates provide instant feedback
5. **Robust error handling** - Clear error messages with retry options
6. **Consistent loading** - Unified skeleton patterns across all pages
7. **Maintainable code** - Centralized query keys prevent invalidation bugs

---

## Testing Checklist
- [ ] Clock in on Kiosk → Dashboard "Staff On-Site" updates without refresh
- [ ] Clock in on Kiosk → Attendance page shows new record without refresh
- [ ] Clock in on Kiosk → TodayRoster updates from "Expected" to "On Duty"
- [ ] Add shift in Schedule → Updates visible in Payroll calculations
- [ ] Approve leave request → Leave page tabs update counts
- [ ] No React console warnings about forwardRef
- [ ] Connection indicator shows realtime status

