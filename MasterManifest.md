# PocketCafe Master Manifest
Generated: 2026-02-07

## 1. Project Structure

```
├── .env
├── README.md
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── attendance/
│   │   │   └── AttendanceHistoryTable.tsx
│   │   ├── kiosk/
│   │   │   ├── CameraFeed.tsx
│   │   │   ├── ClockActionModal.tsx
│   │   │   ├── ManagerPinPad.tsx
│   │   │   ├── SleepOverlay.tsx
│   │   │   ├── StaffSelectModal.tsx
│   │   │   └── TodayRoster.tsx
│   │   ├── layout/
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── MobileHeader.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── ProtectedLayout.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── leave/
│   │   │   ├── LeaveConflictBadge.tsx
│   │   │   └── LeaveRequestDialog.tsx
│   │   ├── payroll/
│   │   │   └── ComplianceWarningCard.tsx
│   │   ├── scheduler/
│   │   │   ├── DayColumn.tsx
│   │   │   ├── DraggableStaffCard.tsx
│   │   │   ├── SchedulerGrid.tsx
│   │   │   └── ShiftSlot.tsx
│   │   ├── settings/
│   │   │   ├── DepartmentBudgetSettings.tsx
│   │   │   ├── LeaveSettings.tsx
│   │   │   ├── ManagerPinSettings.tsx
│   │   │   ├── OvertimeSettings.tsx
│   │   │   ├── PayrollTaxSettings.tsx
│   │   │   ├── RestaurantOutletSettings.tsx
│   │   │   ├── ShiftTimesSettings.tsx
│   │   │   └── WorkHoursSettings.tsx
│   │   ├── staff/
│   │   │   ├── FaceEnrollmentCapture.tsx
│   │   │   ├── FaceEnrollmentDialog.tsx
│   │   │   ├── StaffCard.tsx
│   │   │   ├── StaffCardSkeleton.tsx
│   │   │   ├── StaffDetailSheet.tsx
│   │   │   ├── StaffDirectory.tsx
│   │   │   └── StaffFormDialog.tsx
│   │   ├── system/
│   │   │   ├── ConnectionStatus.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── ui/ (Standard shadcn/ui components)
│   ├── hooks/
│   │   ├── useAppSettings.ts
│   │   ├── useAttendance.ts
│   │   ├── useAttendanceHistory.ts
│   │   ├── useAuth.ts
│   │   ├── useBudgetSettings.ts
│   │   ├── useFaceEnrollment.ts
│   │   ├── useFaceSearch.ts
│   │   ├── useKioskStaff.ts
│   │   ├── useLeaveBalance.ts
│   │   ├── useLeaveRequests.ts
│   │   ├── useManagerPin.ts
│   │   ├── useNoShowDetection.ts
│   │   ├── useNoShows.ts
│   │   ├── useNotifications.ts
│   │   ├── useOutletSettings.ts
│   │   ├── usePayrollData.ts
│   │   ├── useSchedule.ts
│   │   └── useStaff.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   ├── lib/
│   │   ├── attendance.ts
│   │   ├── payroll.ts
│   │   ├── queryKeys.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Attendance.tsx
│   │   ├── Index.tsx
│   │   ├── Kiosk.tsx
│   │   ├── Leave.tsx
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   ├── Payroll.tsx
│   │   ├── Reports.tsx
│   │   ├── Schedule.tsx
│   │   ├── Settings.tsx
│   │   └── Staff.tsx
│   └── providers/
│       └── RealtimeProvider.tsx
└── supabase/
    └── functions/
        ├── face-enroll/
        ├── face-search/
        └── manager-pin/
```

## 2. Configuration

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in-left": "slide-in-from-left 0.3s ease-out",
        "slide-in-bottom": "slide-in-from-bottom 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### src/index.css
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* PocketCafe Design System
   Aesthetic: High-End Corporate Hospitality
   Palette: Slate-900 (Text), Slate-50 (Background), Emerald-600 (Success/Action), Amber-500 (Alerts)
*/

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222 47% 11%;

    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    --primary: 158 64% 38%;
    --primary-foreground: 0 0% 100%;

    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;

    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;

    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;

    --success: 158 64% 38%;
    --success-foreground: 0 0% 100%;

    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 158 64% 38%;

    --radius: 0.5rem;

    --sidebar-background: 222 47% 11%;
    --sidebar-foreground: 210 40% 98%;
    --sidebar-primary: 158 64% 38%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 217 33% 17%;
    --sidebar-accent-foreground: 210 40% 98%;
    --sidebar-border: 217 33% 17%;
    --sidebar-ring: 158 64% 38%;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;

    --card: 217 33% 17%;
    --card-foreground: 210 40% 98%;

    --popover: 217 33% 17%;
    --popover-foreground: 210 40% 98%;

    --primary: 158 64% 45%;
    --primary-foreground: 0 0% 100%;

    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;

    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;

    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;

    --success: 158 64% 45%;
    --success-foreground: 0 0% 100%;

    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 158 64% 45%;

    --sidebar-background: 222 47% 8%;
    --sidebar-foreground: 210 40% 98%;
    --sidebar-primary: 158 64% 45%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 217 33% 17%;
    --sidebar-accent-foreground: 210 40% 98%;
    --sidebar-border: 217 33% 17%;
    --sidebar-ring: 158 64% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-family: 'Inter', system-ui, sans-serif;
  }
}
```

## 3. Database Schema

### Tables

**app_settings**
- id: uuid (PK)
- setting_key: text
- setting_value: jsonb
- created_at: timestamptz
- updated_at: timestamptz

**attendance_records**
- id: uuid (PK)
- staff_id: uuid (FK -> staff_profiles.id)
- status: attendance_status (enum: clocked_in, on_break, clocked_out)
- clock_in_time: timestamptz
- clock_out_time: timestamptz
- break_start_time: timestamptz
- break_end_time: timestamptz
- is_late: boolean
- late_minutes: integer
- scheduled_start_time: time
- override_by: uuid
- override_pin_used: boolean
- face_match_confidence: numeric
- notes: text
- created_at: timestamptz
- updated_at: timestamptz

**face_search_rate_limits**
- id: uuid (PK)
- client_ip: text
- request_count: integer
- window_start: timestamptz
- created_at: timestamptz

**leave_balances**
- id: uuid (PK)
- staff_id: uuid (FK -> staff_profiles.id)
- year: integer
- total_entitlement_hours: numeric
- accrued_hours: numeric
- used_hours: numeric
- created_at: timestamptz
- updated_at: timestamptz

**leave_requests**
- id: uuid (PK)
- staff_id: uuid (FK -> staff_profiles.id)
- start_date: date
- end_date: date
- status: leave_status (enum: pending, approved, rejected)
- reason: text
- reviewed_by: uuid
- reviewed_at: timestamptz
- review_notes: text
- created_at: timestamptz
- updated_at: timestamptz

**manager_pins**
- id: uuid (PK)
- user_id: uuid
- pin_hash: text
- created_at: timestamptz
- updated_at: timestamptz

**no_show_records**
- id: uuid (PK)
- staff_id: uuid (FK -> staff_profiles.id)
- shift_id: uuid (FK -> shifts.id)
- shift_date: date
- scheduled_start_time: time
- detected_at: timestamptz
- resolved: boolean
- resolved_by: uuid
- resolved_at: timestamptz
- resolution_notes: text
- created_at: timestamptz

**notifications**
- id: uuid (PK)
- recipient_id: uuid
- type: text
- title: text
- message: text
- related_staff_id: uuid (FK -> staff_profiles.id)
- related_record_id: uuid
- read_at: timestamptz
- created_at: timestamptz

**pin_verification_attempts**
- id: uuid (PK)
- client_ip: text
- attempt_count: integer
- window_start: timestamptz
- created_at: timestamptz

**shifts**
- id: uuid (PK)
- schedule_id: uuid (FK -> weekly_schedules.id)
- staff_id: uuid (FK -> staff_profiles.id)
- shift_date: date
- shift_type: shift_type (enum: morning, evening)
- start_time: time
- end_time: time
- created_at: timestamptz
- updated_at: timestamptz

**staff_profiles**
- id: uuid (PK)
- user_id: uuid
- name: text
- role: staff_role (enum: kitchen, floor, management, bar)
- job_title: job_title (enum)
- contract_type: contract_type (enum: salaried, zero_rate)
- contact_email: text
- contact_phone: text
- profile_photo_url: text
- start_date: date
- hourly_rate: numeric
- ni_number: text
- tax_code: text
- nic_category: text
- face_token: text
- created_at: timestamptz
- updated_at: timestamptz

**staff_profiles_manager** (View)
- Secure view of staff_profiles excluding sensitive fields (ni_number, tax_code, face_token, hourly_rate)

**user_roles**
- id: uuid (PK)
- user_id: uuid
- role: app_role (enum: admin, manager)
- created_at: timestamptz

**weekly_schedules**
- id: uuid (PK)
- week_start_date: date
- status: schedule_status (enum: draft, published)
- published_at: timestamptz
- published_by: uuid
- created_at: timestamptz
- updated_at: timestamptz

### Database Functions

- `has_role(_user_id, _role)`: Check if user has specific role
- `is_admin()`: Check if current user is admin
- `is_manager()`: Check if current user is manager
- `manager_update_staff_profile(...)`: Secure RPC for managers to update non-sensitive staff details
- `cleanup_old_rate_limits()`: Maintenance function
- `cleanup_old_pin_attempts()`: Maintenance function

## 4. Edge Functions

### face-enroll/index.ts
[Content from previously read file]

### face-search/index.ts
[Content from previously read file]

### manager-pin/index.ts
[Content from previously read file]

## 5. Source Code

[Note: Full source code for all components, hooks, and pages follows in the actual file but is summarized here for this response view]
