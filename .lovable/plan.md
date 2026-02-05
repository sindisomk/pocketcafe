
## Fix: Persistent Sidebar Layout During Navigation

### Problem Analysis
When navigating between pages, the sidebar disappears briefly and reloads. This happens because:

1. Each page component (Dashboard, Staff, Reports, etc.) wraps itself with `<AppLayout>`
2. When the route changes, React unmounts the entire old page (including its `AppLayout`) and mounts the new one
3. The new `AppLayout` calls `useAuth()` which starts with `loading: true`
4. During loading, `AppLayout` shows a skeleton instead of the sidebar
5. This causes the visual "flash" where the sidebar disappears

### Solution: React Router Layout Routes
Move `AppLayout` to a **shared parent route** using React Router's layout pattern. The layout renders once and persists; only the main content area changes.

---

## Implementation

### Part 1: Update App.tsx Routing Structure

Transform from flat routes to nested layout routes:

**Before (current):**
```text
/           → <Index />      (each has own AppLayout)
/staff      → <Staff />      (each has own AppLayout)
/reports    → <Reports />    (each has own AppLayout)
```

**After (fixed):**
```text
/           → <ProtectedLayout>
  /         → <Index />        (rendered in <Outlet />)
  /staff    → <Staff />        (rendered in <Outlet />)
  /reports  → <Reports />      (rendered in <Outlet />)
```

**New routing structure in `src/App.tsx`:**
```typescript
import { Outlet } from "react-router-dom";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

<Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/kiosk" element={<Kiosk />} />
  
  {/* Protected routes with shared layout */}
  <Route element={<ProtectedLayout />}>
    <Route index element={<Index />} />
    <Route path="staff" element={<Staff />} />
    <Route path="schedule" element={<Schedule />} />
    <Route path="attendance" element={<Attendance />} />
    <Route path="leave" element={<Leave />} />
    <Route path="payroll" element={<Payroll />} />
    <Route path="settings" element={<Settings />} />
    <Route path="reports" element={<Reports />} />
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

### Part 2: Create ProtectedLayout Component

**New file: `src/components/layout/ProtectedLayout.tsx`**

This component:
- Handles authentication check once (not on every navigation)
- Renders the persistent sidebar
- Uses `<Outlet />` for child route content

```typescript
import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar - persistent */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <SidebarInset className="flex flex-col flex-1">
          {/* Header - persistent */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 md:px-6">
            <SidebarTrigger className="hidden md:flex" />
            <div className="flex-1" />
            <NotificationBell />
          </header>

          {/* Main Content - changes with route */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            <Outlet />
          </main>

          {/* Mobile Bottom Nav - persistent */}
          <MobileNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
```

---

### Part 3: Remove AppLayout from Page Components

Update each protected page to remove the `<AppLayout>` wrapper:

| Page | Change |
|------|--------|
| `src/pages/Index.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Staff.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Schedule.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Attendance.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Leave.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Payroll.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Settings.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Reports.tsx` | Remove `<AppLayout>` wrapper |

**Example - Reports.tsx Before:**
```tsx
export default function Reports() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* content */}
      </div>
    </AppLayout>
  );
}
```

**Example - Reports.tsx After:**
```tsx
export default function Reports() {
  return (
    <div className="space-y-6">
      {/* content - no AppLayout wrapper */}
    </div>
  );
}
```

---

### Part 4: Keep AppLayout for Backward Compatibility (Optional)

If any components still need the standalone `AppLayout` pattern, keep the existing file but mark it as deprecated:

```typescript
// src/components/layout/AppLayout.tsx
// @deprecated - Use ProtectedLayout with Outlet instead
export function AppLayout({ children }: AppLayoutProps) {
  // ... existing code for legacy support
}
```

---

## Data Flow Comparison

**Before (current - causes sidebar flash):**
```text
Navigate from /dashboard to /reports
        ↓
React unmounts <Index> (including its <AppLayout>)
        ↓
React mounts <Reports> with NEW <AppLayout>
        ↓
NEW useAuth() starts with loading: true
        ↓
Skeleton renders (sidebar gone)
        ↓
Auth resolves → full layout renders (sidebar back)
```

**After (fixed - sidebar persists):**
```text
Navigate from / to /reports
        ↓
<ProtectedLayout> stays mounted (sidebar persists)
        ↓
Only <Outlet /> content changes from <Index> to <Reports>
        ↓
No new useAuth() call → no loading state
        ↓
Sidebar never disappears
```

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/layout/ProtectedLayout.tsx` | Shared layout with Outlet for protected routes |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.tsx` | Restructure routes to use nested layout pattern |
| `src/pages/Index.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Staff.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Schedule.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Attendance.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Leave.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Payroll.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Settings.tsx` | Remove `<AppLayout>` wrapper |
| `src/pages/Reports.tsx` | Remove `<AppLayout>` wrapper |

---

## Expected Outcomes

1. **Sidebar never disappears** - The layout only mounts once on initial auth check
2. **Faster navigation** - No re-authentication on every route change
3. **Smoother UX** - Only the main content area transitions
4. **Single auth check** - `useAuth()` called once per session, not per navigation

---

## Testing Checklist
- [ ] Login and navigate to Dashboard → sidebar visible
- [ ] Click Staff in sidebar → main content changes, sidebar stays
- [ ] Click Reports in sidebar → main content changes, sidebar stays
- [ ] Click Schedule in sidebar → no loading skeleton, instant transition
- [ ] Mobile: bottom nav stays visible during navigation
- [ ] Refresh any page → auth check happens once, then layout persists
- [ ] Kiosk route (/kiosk) still works independently without sidebar
