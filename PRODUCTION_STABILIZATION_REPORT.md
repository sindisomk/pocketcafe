# Production Stabilization Pass – Report

**App:** Hubbles (PocketCafe)  
**Scope:** Refinement only – no architecture or business logic changes.

---

## A. Summary of Issues Found

### Instability & errors
- **Unhandled promise rejection in `useAuth`:** `fetchRole(user.id).then(...)` had no `.catch()`. If `fetchRole` rejected (e.g. network), it could surface as an unhandled rejection.
- **Async in mutation `onSuccess`:** In `useSchedule`, `addShift` and `removeShift` `onSuccess` handlers used `await supabase.from('weekly_schedules').update(...)`. Any thrown error (e.g. from `.update`) would be an unhandled rejection because React Query does not await `onSuccess`.

### Console noise in production
- **RealtimeProvider:** Logged every postgres change (attendance, shifts, leave_requests, staff, no_shows, leave_balances, notifications, app_settings), connection status, and cleanup. This could be very noisy in production.
- **useAuth:** Logged `onAuthStateChange` and “Skipping - initial load not complete” on every auth event; also `console.warn` for role fetch and watchdog.
- **App:** Boot log on every load.
- **useNotifications:** `console.log` for “No managers found” and “Created N notifications”.
- **useNoShowDetection:** `console.log` when a no-show record was created.
- **NotFound:** `console.error` on every 404, which can flood logs.

### Data loading & hooks
- **Query keys and dependencies:** No redundant or duplicate fetch patterns were found. `useSchedule`, `useLeaveRequests`, `useNoShows`, and related hooks use stable keys (e.g. `weekStart` string, `queryKeys.leaveRequests`). Index page uses `useSchedule(startOfWeek(new Date(), { weekStartsOn: 1 }))`; the derived `weekStart` string is stable for the same week, so no extra refetches.
- **React Query defaults:** Already set (e.g. `staleTime`, `gcTime`, `retry`, `refetchOnWindowFocus`), which is good for performance and stability.

### Date/time and scheduling
- **UK timezone:** Centralized in `src/lib/datetime.ts` (`getTodayUK`, `parseShiftDateTimeUK`, `getLondonOffsetMsForDate`) and `src/lib/attendance.ts` (lateness/no-show). No timezone bugs or inconsistencies were found in the scheduling logic.
- **Schedule publish/draft:** Revert-to-draft in `onSuccess` is best-effort; failures are now caught so they don’t cause unhandled rejections.

---

## B. Critical Fixes Applied

1. **useAuth – handle `fetchRole` rejection**  
   - **File:** `src/hooks/useAuth.ts`  
   - **Change:** Added `.catch()` to `fetchRole(user.id).then(...)` so a failed role fetch does not cause an unhandled promise rejection. State already has `role: null`; no extra state update on failure.

2. **useSchedule – safe async `onSuccess`**  
   - **File:** `src/hooks/useSchedule.ts`  
   - **Change:** Wrapped the “revert schedule to draft” `await supabase.from('weekly_schedules').update(...)` in `try/catch` in both `addShift` and `removeShift` `onSuccess`. On failure, we still invalidate the relevant queries so the UI stays correct; the draft revert is treated as non-fatal.

3. **Dev-only logging**  
   - **New:** `src/lib/logger.ts` with `devLog` and `devWarn` (no-op in production, `import.meta.env.DEV`).  
   - **Updated:**  
     - **RealtimeProvider:** All `console.log` calls replaced with `devLog` (postgres changes, connection status, cleanup).  
     - **useAuth:** `console.log` / `console.warn` for auth events, role fetch, and watchdog replaced with `devLog` / `devWarn`.  
     - **App:** Boot log switched to `devLog`.  
     - **useNotifications:** Non-error logs (no managers, created notifications) switched to `devLog`.  
     - **useNoShowDetection:** “Created no-show record” switched to `devLog`.  
     - **NotFound:** 404 message switched to `devLog` to avoid log flood in production.  
   - **Left as-is:** `console.error` for real errors (e.g. useAuth getSession, NoShowDetection failures, Notifications insert failure, Kiosk quick action, ErrorBoundary, camera/search errors) so production diagnostics remain.

---

## C. Performance Improvements Made

- **No new heavy optimizations:** No architectural or data-fetching changes were made.  
- **Stable query keys:** Confirmed that schedule, leave, no-shows, and related hooks use stable keys; no unnecessary refetches identified.  
- **React Query config:** Existing `staleTime` (2 min), `gcTime` (30 min), and retry/refetch settings are appropriate; no changes.  
- **Production console:** Reducing log volume via `devLog`/`devWarn` keeps production console cleaner and can slightly reduce overhead from logging.

---

## D. Code Cleanups Performed

- **Logger module:** Centralized dev-only logging in `src/lib/logger.ts` for consistent, production-safe logging.  
- **No dead code or unused imports removed** in this pass; no large commented blocks or duplicate logic were modified.  
- **Error handling:**  
  - useAuth: promise rejection handled.  
  - useSchedule: `onSuccess` async work wrapped in try/catch.  
  - Existing toast/onError usage in mutations left as-is.

---

## E. Remaining Risks (If Any)

1. **Multiple `useAuth()` call sites:** Each component that calls `useAuth()` has its own state (no shared context). So auth is re-initialized per component. This was not changed; if you ever see “loading” flicker or inconsistent role across the app, consider an AuthProvider that provides a single auth state.  
2. **notifyManagers not awaited:** In `useLeaveRequests` and `useNoShowDetection`, `notifyManagers(...)` is fire-and-forget. `notifyManagers` already has an internal try/catch and does not throw, so there is no unhandled rejection risk.  
3. **ErrorBoundary:** Still uses `console.error` in `componentDidCatch`. This is intentional for production error tracking; no change.  
4. **Index labour cost:** Index uses a fixed “7” hours for both morning and evening in the labour cost calculation; this may be intentional or a simplification. No change was made to business logic.

---

## Summary Table

| Area                 | Action                                                                 |
|----------------------|------------------------------------------------------------------------|
| Unhandled rejections | useAuth `fetchRole` + useSchedule `onSuccess` made safe                |
| Console in prod      | RealtimeProvider, useAuth, App, useNotifications, useNoShowDetection, NotFound use devLog/devWarn |
| Data loading         | No redundant/duplicate fetches; query keys stable                      |
| Date/time            | UK logic centralized; no changes                                       |
| New code             | `src/lib/logger.ts` only                                              |

The app should now run without console noise in production from these paths, with no unhandled rejections from the fixed async flows, and with more predictable behavior when schedule draft revert fails.
