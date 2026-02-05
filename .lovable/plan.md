
# Codebase Audit & Cleanup Plan for PocketCafe

## Executive Summary

After thoroughly auditing the codebase, I've identified issues across several categories: console errors, unused imports/code, missing functionality, navigation inconsistencies, and code quality improvements.

---

## 1. Critical Console Errors to Fix

### Issue 1.1: Navigate Component Ref Warning
**Location:** `src/components/layout/AppLayout.tsx` (line 25)  
**Error:** `Warning: Function components cannot be given refs`

The `<Navigate>` component from React Router is being rendered directly inside `AppLayout`. When the component renders, React Router's internal handling tries to pass a ref, but `Navigate` doesn't support refs.

**Fix:** Wrap the Navigate in a fragment or div, or handle the redirect differently using the `useEffect` + `useNavigate` pattern.

```text
Current:
  if (!user) {
    return <Navigate to="/login" replace />;
  }

Should be:
  // Option 1: Use the useEffect + useNavigate pattern
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  // During redirect, render null or loading state
  if (!user) {
    return null;
  }
```

### Issue 1.2: Login Page Ref Warning
**Location:** `src/pages/Login.tsx`  
**Error:** Similar ref warning in console

The Login page component itself isn't wrapped in `forwardRef`, but React Router's internal routing attempts to pass refs to it. This is generally harmless but should be addressed for cleaner console output.

---

## 2. Unused Imports & Dead Code

### Issue 2.1: Unused Import in Index.tsx
**Location:** `src/pages/Index.tsx` (line 5)  
**Problem:** `TrendingUp` is imported from lucide-react but never used in the component.

```text
Remove:
  import { Users, Clock, Calendar, TrendingUp, AlertTriangle, ... }
                              ^^^^^^^^^^^
```

### Issue 2.2: Orphaned NavLink Component
**Location:** `src/components/NavLink.tsx`  
**Problem:** This custom NavLink wrapper component exists but is never imported anywhere in the codebase. All files use React Router's `NavLink` directly.

**Fix:** Delete `src/components/NavLink.tsx` as it's unused.

### Issue 2.3: Unused cn Import in Leave.tsx
**Location:** `src/pages/Leave.tsx` (line 14)  
**Problem:** `cn` is imported from `@/lib/utils` but never used in the component.

---

## 3. Navigation & Route Issues

### Issue 3.1: Inconsistent Mobile Navigation
**Location:** `src/components/layout/MobileNav.tsx`  
**Problem:** The mobile navigation only shows 5 items (Dashboard, Staff, Schedule, Attendance, Settings) while the sidebar shows 7 items (also includes Leave and Payroll).

**Fix:** Add Leave and Payroll to the mobile navigation for feature parity.

### Issue 3.2: MonitorSmartphone Icon Imported But Not Used
**Location:** `src/components/layout/AppSidebar.tsx` (line 1)  
**Problem:** `MonitorSmartphone` is imported but not used (the Kiosk link is not in the sidebar navigation).

---

## 4. Missing Functionality (Placeholder Code)

### Issue 4.1: Add Staff Button Non-Functional
**Location:** `src/components/staff/StaffDirectory.tsx` (line 61-63)  
**Problem:** The "Add Staff" button exists but has no onClick handler - it's just a styled button that does nothing.

**Recommendation:** Either implement the add staff dialog/form or remove the button until the feature is ready.

### Issue 4.2: Edit Staff Button Non-Functional
**Location:** `src/components/staff/StaffDetailSheet.tsx` (line 142-145)  
**Problem:** The "Edit Staff Member" button exists but has no onClick handler.

### Issue 4.3: Manager PIN Verification is a Placeholder
**Location:** `src/components/kiosk/ManagerPinPad.tsx` (line 50-62)  
**Problem:** PIN verification accepts any 4+ digit PIN instead of validating against the `manager_pins` table.

### Issue 4.4: Face++ Integration is a Placeholder
**Location:** `src/components/kiosk/CameraFeed.tsx` (line 53-64)  
**Problem:** Face detection is simulated, not integrated with Face++ API.

---

## 5. Type Safety Issues

### Issue 5.1: Any Cast in Kiosk.tsx
**Location:** `src/pages/Kiosk.tsx` (line 138)  
**Problem:** `activeRecord as any` is used, bypassing TypeScript's type checking.

```text
activeRecord={activeRecord as any}
                           ^^^^^^
```

**Fix:** Properly type the activeRecord or use the correct type from the attendance types.

---

## 6. Component Quality Improvements

### Issue 6.1: Settings Page is a Placeholder
**Location:** `src/pages/Settings.tsx`  
**Problem:** The Settings page shows "Coming in Phase 3" with no actual functionality. Consider either:
- Implementing basic settings (e.g., user profile, theme toggle)
- Adding a more helpful placeholder with planned features

---

## Implementation Order

### Phase 1: Fix Console Errors (High Priority)
1. Fix Navigate ref warning in AppLayout.tsx
2. Address Login page ref warning

### Phase 2: Code Cleanup (Medium Priority)
3. Remove unused TrendingUp import from Index.tsx
4. Remove unused cn import from Leave.tsx
5. Delete orphaned NavLink component
6. Remove unused MonitorSmartphone import from AppSidebar.tsx

### Phase 3: Navigation Parity (Medium Priority)
7. Add Leave and Payroll to MobileNav.tsx

### Phase 4: Fix Placeholder Code (Lower Priority)
8. Add onClick handler to Add Staff button (or remove it)
9. Add onClick handler to Edit Staff button (or remove it)
10. Fix any cast in Kiosk.tsx

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/AppLayout.tsx` | Fix Navigate ref warning using useNavigate hook |
| `src/pages/Index.tsx` | Remove unused TrendingUp import |
| `src/pages/Leave.tsx` | Remove unused cn import |
| `src/components/NavLink.tsx` | DELETE FILE (orphaned) |
| `src/components/layout/MobileNav.tsx` | Add Leave and Payroll nav items |
| `src/components/layout/AppSidebar.tsx` | Remove unused MonitorSmartphone import |
| `src/components/staff/StaffDirectory.tsx` | Add TODO comment or implement Add Staff |
| `src/components/staff/StaffDetailSheet.tsx` | Add TODO comment or implement Edit Staff |
| `src/pages/Kiosk.tsx` | Fix any cast for activeRecord |

---

## Summary of Issues Found

| Category | Count | Severity |
|----------|-------|----------|
| Console Errors | 2 | High |
| Unused Imports | 4 | Low |
| Orphaned Files | 1 | Low |
| Navigation Gaps | 1 | Medium |
| Placeholder Code | 4 | Medium |
| Type Safety | 1 | Medium |

Total: 13 issues identified for cleanup
