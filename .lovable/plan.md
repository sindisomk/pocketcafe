

# Scheduler Layout: Remove Shift Avatars and Widen Staff Sidebar

## Changes

### 1. Remove avatars from shift slot cards (`ShiftSlot.tsx`)
- Remove the `Avatar`, `AvatarImage`, `AvatarFallback` imports and usage (lines 5, 80-85, 109-117)
- Keep the staff name, cost, and remove button -- just drop the avatar circle
- This saves ~30px per card horizontally, making day columns less cramped

### 2. Widen the Available Staff sidebar (`SchedulerGrid.tsx`)
- Increase sidebar from `lg:w-52` (208px) back to `lg:w-60` (240px) so staff names, job titles, and hourly rates display fully without truncation

### No functionality changes
Drag-and-drop, cost calculations, warnings, no-show badges, and publish workflow are all untouched. Only the avatar removal in shift cards and the sidebar width adjustment are affected.

### Files modified
- `src/components/scheduler/ShiftSlot.tsx` -- remove Avatar component from shift cards
- `src/components/scheduler/SchedulerGrid.tsx` -- widen sidebar from `lg:w-52` to `lg:w-60`

