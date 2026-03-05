

# Fix: No-Show Detection Not Running on Dashboard

## Root Cause

The `useNoShowDetection` hook -- which scans today's shifts, compares against attendance records, and creates `no_show_records` entries plus manager notifications -- is **only mounted inside the Kiosk page**. If the Kiosk is not open in a browser tab, no-show detection never runs and nothing is written to `no_show_records`. The Dashboard (`Index.tsx`) reads from that table via `useNoShows`, but finds nothing because no records were created.

## Fix

Move `useNoShowDetection` into `ProtectedLayout.tsx` so it runs continuously whenever any authenticated user (manager/admin) is logged in, regardless of which page they are on. Keep it in the Kiosk as well (harmless -- the hook already prevents concurrent runs and deduplicates via existing record checks).

### Changes

**`src/components/layout/ProtectedLayout.tsx`**
- Import `useNoShowDetection` and `useWorkHoursSettings`
- Call `useNoShowDetection` with the configured threshold after the auth/role checks, gated to managers and admins only (staff don't need to run detection)

**`src/pages/Kiosk.tsx`** (optional cleanup)
- Keep `useNoShowDetection` as-is -- it acts as a redundant detector when the Kiosk is open, which is fine since the hook deduplicates

### Why this works
- The hook already checks for existing `no_show_records` before inserting, so running it from multiple places is safe
- It polls every 5 minutes, checking all of today's shifts against attendance
- Once a no-show record is created, it fires `notifyManagers` and invalidates the `no-shows` query cache, which updates the Dashboard card in real time

