

# Fix: Assign Admin Role to Your Account

## Problem

Your account (sindisomk@gmail.com) was created successfully in the authentication system, but there is no corresponding entry in the `user_roles` table. This is expected behavior - Supabase Auth creates users in `auth.users`, but your application's `user_roles` table requires a separate entry.

The `user_roles` table is currently empty, which means:
- Your account has no admin or manager privileges
- Some features may be restricted or inaccessible
- The sign-in flow completes but you may see limited functionality

## Solution

### Step 1: Assign Admin Role to Your Account

Run a database migration to insert your user as an admin:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('f30dc455-4d31-4e5c-b02d-0d8774d3f60c', 'admin');
```

This grants you full administrative access to PocketCafe.

### Step 2: Fix the Sign-In Button Loading Issue

Update `src/pages/Login.tsx` to properly handle the auth state transition:

1. Add a `useEffect` that watches the `user` state from `useAuth()`
2. When `user` becomes populated (meaning auth succeeded), navigate to `/`
3. Remove the manual `navigate('/')` from `handleSignIn` since navigation will happen automatically via the effect
4. Only call `setIsLoading(false)` on errors, not on success (keep showing loading until redirect)

### Step 3: Consider Future User Onboarding

For future users, you have two options:

**Option A (Recommended for PocketCafe):** Manually assign roles via an admin interface. Since PocketCafe is a restaurant management system, you likely want to control who gets admin/manager access.

**Option B:** Create a database trigger to auto-assign a default role (e.g., no role or a "staff" role) when users sign up. This is more appropriate for apps where all users start with the same permissions.

## Files to Modify

| File | Change |
|------|--------|
| Database | Insert admin role for your account |
| `src/pages/Login.tsx` | Add auth-based redirect via useEffect |

## Expected Outcome

After these changes:
1. Your account will have admin privileges
2. Sign-in will complete smoothly without the button getting stuck
3. You'll have full access to the staff directory, scheduler, and all admin features

