

## Header & Sidebar Enhancement Implementation Plan

This plan adds user information display, restaurant name, dark/light mode toggle, and today's date to create a professional, information-rich header and sidebar.

---

## Overview

### Current State
- **Sidebar Footer**: Only shows Sign Out button, no user information
- **Header**: Only has SidebarTrigger and NotificationBell
- **Dark Mode**: CSS variables exist in `index.css` but no toggle UI
- **Restaurant Settings**: Stored locally in component state, not persisted to database

### Target State
- **Sidebar Footer**: Shows user email/name above Sign Out
- **Header**: Restaurant name, date, dark/light toggle, notification bell (professional layout)
- **Dark Mode**: Fully functional toggle with persistence
- **Settings**: Restaurant details persisted to `app_settings` table

---

## Part 1: Restaurant Settings Persistence

### 1.1 Create useOutletSettings Hook

**New File: `src/hooks/useOutletSettings.ts`**

Follow the same pattern as `useWorkHoursSettings`:

```typescript
export interface OutletSettings {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  companyNumber: string;
  vatNumber: string;
}

const DEFAULT_OUTLET: OutletSettings = {
  name: 'PocketCafe',
  address: '',
  postcode: '',
  phone: '',
  email: '',
  companyNumber: '',
  vatNumber: '',
};

export function useOutletSettings() {
  // Query from app_settings where setting_key = 'outlet'
  // Return settings, isLoading, updateSettings
}
```

### 1.2 Update RestaurantOutletSettings Component

Connect to database instead of local state:

```typescript
// Replace useState with:
const { settings, isLoading, updateSettings } = useOutletSettings();
```

---

## Part 2: Dark/Light Mode Toggle

### 2.1 Add ThemeProvider to App.tsx

Wrap the app with `next-themes` ThemeProvider:

```typescript
import { ThemeProvider } from 'next-themes';

// In App component render:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <QueryClientProvider client={queryClient}>
    {/* ... existing providers */}
  </QueryClientProvider>
</ThemeProvider>
```

### 2.2 Create ThemeToggle Component

**New File: `src/components/layout/ThemeToggle.tsx`**

```typescript
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

---

## Part 3: User Display in Sidebar

### 3.1 Update AppSidebar Footer

Add user info section above Sign Out:

```typescript
<SidebarFooter className="p-4 border-t border-sidebar-border">
  {user && (
    <div className="space-y-3">
      {/* User info */}
      {!collapsed && (
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
              {getUserInitials(user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user.email}
            </p>
          </div>
        </div>
      )}
      
      {/* Sign Out Button */}
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "default"}
        onClick={handleSignOut}
        className="w-full ..."
      >
        <LogOut className="h-5 w-5" />
        {!collapsed && <span>Sign Out</span>}
      </Button>
    </div>
  )}
</SidebarFooter>
```

Helper function:
```typescript
const getUserInitials = (email?: string) => {
  if (!email) return '?';
  return email.substring(0, 2).toUpperCase();
};
```

---

## Part 4: Enhanced Header Layout

### 4.1 Update ProtectedLayout Header

Create a professional header with all elements:

```typescript
<header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 md:px-6">
  {/* Left: Sidebar trigger */}
  <SidebarTrigger className="hidden md:flex" />
  
  {/* Center: Restaurant name (from settings) */}
  <div className="hidden sm:flex items-center gap-2">
    <Store className="h-4 w-4 text-muted-foreground" />
    <span className="font-semibold text-foreground">
      {outletSettings?.name || 'PocketCafe'}
    </span>
  </div>
  
  {/* Spacer */}
  <div className="flex-1" />
  
  {/* Right section: Date, Theme Toggle, Notifications */}
  <div className="flex items-center gap-2">
    {/* Today's date */}
    <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
      <CalendarDays className="h-4 w-4" />
      <span>{format(new Date(), 'EEEE, d MMM yyyy')}</span>
    </div>
    
    {/* Separator */}
    <Separator orientation="vertical" className="hidden md:block h-6 mx-2" />
    
    {/* Theme toggle */}
    <ThemeToggle />
    
    {/* Notifications */}
    <NotificationBell />
  </div>
</header>
```

### 4.2 Mobile Responsive Considerations

- Restaurant name: Hidden on mobile (`hidden sm:flex`)
- Date: Hidden on mobile (`hidden md:flex`)
- Theme toggle & notifications: Always visible
- Mobile shows only essential controls

---

## Implementation Summary

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useOutletSettings.ts` | Persist restaurant details to database |
| `src/components/layout/ThemeToggle.tsx` | Dark/light mode toggle button |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.tsx` | Add `ThemeProvider` wrapper |
| `src/components/layout/AppSidebar.tsx` | Add user avatar + email above Sign Out |
| `src/components/layout/ProtectedLayout.tsx` | Enhanced header with restaurant name, date, theme toggle |
| `src/components/settings/RestaurantOutletSettings.tsx` | Connect to database via hook |

---

## Visual Layout

### Header (Desktop)
```text
┌─────────────────────────────────────────────────────────────────────┐
│ [≡]  🏪 PocketCafe London              Wed, 5 Feb 2026  │ ☀ 🔔  │
└─────────────────────────────────────────────────────────────────────┘
       ↑                                       ↑           ↑   ↑
  Trigger   Restaurant Name                  Date      Theme Bell
```

### Header (Mobile)
```text
┌─────────────────────────────────────────┐
│                            ☀ 🔔         │
└─────────────────────────────────────────┘
                             Theme Bell
```

### Sidebar Footer (Expanded)
```text
┌─────────────────────────────┐
│  [JD]  John Doe             │
│        john@cafe.com        │
│                             │
│  [↩] Sign Out               │
└─────────────────────────────┘
```

### Sidebar Footer (Collapsed)
```text
┌─────────┐
│  [↩]    │
└─────────┘
```

---

## Data Flow

```text
User logs in → useAuth() provides user object
                       ↓
AppSidebar reads user.email, user.user_metadata.full_name
                       ↓
ProtectedLayout calls useOutletSettings()
                       ↓
Header displays: Restaurant Name | Date | Theme | Notifications
                       ↓
ThemeToggle reads/writes via next-themes (localStorage)
```

---

## Database Changes

No schema changes needed - reuse existing `app_settings` table:

```typescript
// New setting key for outlet details
setting_key: 'outlet'
setting_value: {
  name: 'PocketCafe London',
  address: '123 High Street...',
  // etc.
}
```

---

## Testing Checklist
- [ ] User email/name displays in sidebar footer
- [ ] User initials show in avatar
- [ ] Collapsed sidebar hides user info, shows only sign out icon
- [ ] Restaurant name displays in header
- [ ] Restaurant name updates when changed in settings
- [ ] Today's date shows correctly formatted
- [ ] Theme toggle switches between light and dark
- [ ] Theme persists after page refresh
- [ ] Mobile view hides restaurant name and date
- [ ] All elements align professionally
