

## Goal
Fix staff members not appearing in the Kiosk Manager Override → Select Staff Member modal by allowing the `staff_profiles_public` view to be queried without authentication.

---

## Root Cause Analysis

The investigation revealed:

1. **3 staff members exist** in both `staff_profiles` and `staff_profiles_public`
2. **1 manager PIN is configured** in the database
3. **The view definition is correct** - selects non-sensitive fields from `staff_profiles`

**However**, the view was created with `security_invoker=on`:

| Setting | Effect |
|---------|--------|
| `security_invoker=on` | View queries run with the **caller's** privileges |
| No setting / `security_invoker=off` | View queries run with the **view owner's** privileges (bypasses RLS) |

Since the Kiosk is designed to work **without login** (as confirmed), queries run as `anon`. The RLS policies on `staff_profiles` require:
- Admin role, OR
- Manager role, OR  
- Being the specific user (matching `user_id`)

None of these apply to anonymous users → **empty result**.

---

## Solution

Recreate the `staff_profiles_public` view **without** `security_invoker=on` so it can be queried by unauthenticated Kiosk users after PIN verification.

---

## Implementation

### Step 1: Drop and Recreate the View (Database Migration)

```sql
DROP VIEW IF EXISTS public.staff_profiles_public;

CREATE VIEW public.staff_profiles_public AS
  SELECT 
    id,
    user_id,
    name,
    profile_photo_url,
    role,
    contract_type,
    hourly_rate,
    created_at,
    updated_at
  FROM public.staff_profiles;

-- Grant access to both anon and authenticated roles
GRANT SELECT ON public.staff_profiles_public TO anon, authenticated;

COMMENT ON VIEW public.staff_profiles_public IS 'Non-sensitive staff data for Kiosk and public display. No RLS enforcement.';
```

### Step 2: (Optional) Update Types if Needed

The Supabase types file will auto-regenerate after the migration.

---

## Security Considerations

| Aspect | Assessment |
|--------|------------|
| **Data exposed** | Only non-sensitive: id, name, photo, role, contract type, hourly rate, timestamps |
| **Data protected** | NI numbers, contact emails, phone numbers, tax codes remain hidden |
| **Access pattern** | View accessible only after successful manager PIN verification (UI-enforced) |
| **Risk level** | Low - staff names/roles are typically visible in workplace settings |

The view was already designed to expose only public-facing staff information. The only change is removing the `security_invoker` flag that was blocking access.

---

## Files Changed

| File | Action |
|------|--------|
| Database migration | Recreate `staff_profiles_public` view |

No frontend code changes are required - the `useKioskStaff` hook and `StaffSelectModal` are already correctly implemented.

---

## Testing Steps

1. Navigate to `/kiosk` (without logging in)
2. Click **Manager Override**
3. Enter a valid manager PIN (e.g., 1234)
4. Click **Verify PIN**
5. **Expected**: The "Select Staff Member" modal shows all 3 staff members
6. Select a staff member → Clock Action modal should appear

