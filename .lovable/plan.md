

# Fix Scheduler Layout: Remove Horizontal Scrolling and Add Job Titles

## Problem
The scheduling page is too wide, requiring horizontal scrolling to see Saturday and Sunday. The staff sidebar is 256px wide (`lg:w-64`) and each day column has a minimum width of 160px (`min-w-[160px]`), totaling ~1,376px minimum -- exceeding most screens.

## Changes

### 1. Narrow the staff sidebar
- `SchedulerGrid.tsx`: Reduce sidebar from `lg:w-64` (256px) to `lg:w-52` (208px)

### 2. Remove avatar/initials from the DraggableStaffCard
- `DraggableStaffCard.tsx`: Remove the `Avatar` component entirely, keeping only the grip icon, name, leave badge, and rate info
- Add the staff member's job title next to the hourly rate (e.g. "Server -- £12.50/hr")
- Import `JOB_TITLES` from `@/types/staff` to look up the label from `staff.job_title`

### 3. Reduce day column minimum width
- `DayColumn.tsx`: Reduce `min-w-[160px]` to `min-w-[120px]` so all 7 columns fit without scrolling
- Reduce padding slightly (p-3 to p-2 in header, p-2 to p-1.5 in shift sections)

### 4. Compact shift slot cards (in day columns)
- `ShiftSlot.tsx`: Reduce avatar size from `h-7 w-7` to `h-6 w-6` and tighten padding to save space

### No functionality changes
All drag-and-drop, cost calculations, leave/no-show logic, and publish workflow remain untouched. Only visual sizing and the addition of job title text are affected.

## Technical Details

**Files modified:**
- `src/components/scheduler/SchedulerGrid.tsx` -- sidebar width class
- `src/components/scheduler/DraggableStaffCard.tsx` -- remove Avatar, add job title lookup
- `src/components/scheduler/DayColumn.tsx` -- reduce min-width and padding
- `src/components/scheduler/ShiftSlot.tsx` -- compact avatar and padding

**Layout math after changes:**
- Sidebar: ~208px + gap 16px
- 7 day columns x 120px = 840px
- Total: ~1,064px -- comfortably fits a 1280px+ screen
