

## Goal
Fix the staff member list not displaying in the Manager Override → Select Staff Member modal by using the public staff view that doesn't require admin/manager roles.

## Root Cause

The `StaffSelectModal` component uses the `useStaff()` hook which queries the `staff_profiles` table. This table has Row-Level Security (RLS) policies that restrict access:

| User Role | Can View |
|-----------|----------|
| Admin | All staff profiles |
| Manager | All staff profiles |
| Regular Staff | Only their own profile |

When a non-admin/non-manager user accesses the Kiosk and enters a valid PIN, the staff list query returns empty because they don't have permission to view all staff.

## Solution

Use the existing `staff_profiles_public` view which:
- Has no RLS restrictions (accessible to all authenticated users)
- Excludes sensitive fields (NI number, contact email/phone, tax code)
- Contains all fields needed for staff selection (id, name, photo, role)

## Implementation Steps

### Step 1: Create a Kiosk-specific Staff Hook

Create a new hook `useKioskStaff` that fetches from `staff_profiles_public` view instead of the restricted `staff_profiles` table.

**File:** `src/hooks/useKioskStaff.ts`

```text
Purpose: Fetch staff list from public view for Kiosk use
- Query staff_profiles_public view
- Return minimal staff data needed for selection
- Handle loading and error states
```

### Step 2: Update StaffSelectModal

Modify `StaffSelectModal` to use the new `useKioskStaff` hook instead of `useStaff`.

**File:** `src/components/kiosk/StaffSelectModal.tsx`

Changes:
- Import `useKioskStaff` instead of `useStaff`
- Adjust type handling for nullable fields from the view

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useKioskStaff.ts` | Create | Hook that queries staff_profiles_public |
| `src/components/kiosk/StaffSelectModal.tsx` | Modify | Use the new hook |

## Technical Details

### New Hook Implementation

```typescript
// src/hooks/useKioskStaff.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface KioskStaff {
  id: string;
  name: string;
  profile_photo_url: string | null;
  role: string;
}

export function useKioskStaff() {
  const query = useQuery({
    queryKey: ['kiosk-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_profiles_public')
        .select('id, name, profile_photo_url, role')
        .order('name');
      
      if (error) throw error;
      
      // Filter out any null id entries and cast types
      return (data ?? []).filter(s => s.id && s.name) as KioskStaff[];
    },
  });

  return {
    staff: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
```

### Modal Update

```typescript
// StaffSelectModal.tsx changes
import { useKioskStaff } from '@/hooks/useKioskStaff';

// Replace:
const { staff, isLoading } = useStaff();

// With:
const { staff, isLoading } = useKioskStaff();
```

## Security Considerations

The `staff_profiles_public` view intentionally exposes only non-sensitive fields:
- id, name, profile_photo_url, role, contract_type, hourly_rate

It does NOT expose:
- NI numbers
- Contact email/phone
- Tax codes
- NIC categories

This is the correct approach for Kiosk mode where the goal is staff identification for clock-in/out, not access to sensitive employee data.

## Testing Steps

1. Log in as a non-admin user (or regular staff member)
2. Navigate to the Kiosk page (/kiosk)
3. Click "Manager Override" button
4. Enter a valid manager PIN
5. Verify the "Select Staff Member" modal now shows all staff members
6. Select a staff member and confirm the clock action modal appears

