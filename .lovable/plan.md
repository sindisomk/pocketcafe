

# Fix Plan: Manager PIN, Mobile Kiosk, Mobile Nav, and Payroll Refresh

## Issue 1: Manager Override PIN Not Working

**Root Cause**: The `manager-pin` edge function was not deployed. It has been deployed now and verified working. No code changes needed -- the function was simply missing from the deployment.

**Action**: None required (already fixed by deploying). The function responds correctly.

---

## Issue 2: Kiosk Awkward Display on Mobile

**Root Cause**: The Kiosk page uses a fixed `w-[60%]` / `w-[40%]` horizontal split layout which doesn't adapt for small screens. On mobile, both the camera feed and roster are squeezed side by side.

**Changes to `src/pages/Kiosk.tsx`**:
- Make the header responsive: stack the logo/time/buttons vertically on small screens, reduce font sizes
- Change the main layout from a fixed horizontal split to a responsive stack: on mobile, show camera feed full-width on top and roster below (vertical scroll)
- Reduce padding on small screens
- Make the "Manager Override" button smaller on mobile (icon-only or compact)
- Adjust `pt-24` to account for taller mobile header

---

## Issue 3: App Name and Sign Out Missing on Mobile

**Root Cause**: The `AppSidebar` is wrapped in `<div className="hidden md:block">` in `AppLayout.tsx`, so it's completely hidden on mobile. The `MobileNav` bottom bar only shows nav links -- no app branding or sign-out option.

**Changes to `src/components/layout/MobileNav.tsx`**:
- Add a top mobile header bar that shows the "PocketCafe" app name and the user's role designation
- Add a user menu (dropdown or sheet) accessible from the header with the sign-out action and user email

**Changes to `src/components/layout/AppLayout.tsx`**:
- Add the mobile header bar (visible only on `md:hidden`) containing the app name, role, and a user/sign-out menu trigger

---

## Issue 4: Payroll Not Updating When Staff Clock Out

**Root Cause**: In `useAttendance.ts`, the `clockOut` mutation's `onSuccess` callback only invalidates `attendance` and `shiftsToday` query keys. It does NOT invalidate `payrollAttendance`, so the Payroll page data remains stale.

**Changes to `src/hooks/useAttendance.ts`**:
- In the `clockOut` mutation's `onSuccess`, add invalidation for payroll queries:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['payroll-attendance'] });
  ```
  Using the partial key prefix ensures all payroll date ranges are refreshed.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Kiosk.tsx` | Responsive layout: stack camera/roster vertically on mobile, responsive header |
| `src/components/layout/AppLayout.tsx` | Add mobile-only header bar with app name and sign-out |
| `src/components/layout/MobileNav.tsx` | Optionally integrate sign-out into the bottom nav or defer to the new top header |
| `src/hooks/useAttendance.ts` | Invalidate `payroll-attendance` queries on clock-out |
| Edge function `manager-pin` | Already deployed and working -- no code changes |

