
# Fix: Sign-In Loading Loop Issue

## Problem Summary

When a user enters correct credentials and clicks "Sign In":
1. The button shows "Signing in..." spinner indefinitely
2. The user is never redirected to the dashboard

## Root Cause Analysis

There are **two interconnected issues**:

### Issue 1: Login Page Never Resets Loading State on Success

In `src/pages/Login.tsx`, the `handleSignIn` function:

```
const { error } = await signIn(email, password);

if (error) {
  toast.error(error.message);
  setIsLoading(false);  // ← Only resets on ERROR
}
// No reset on SUCCESS - relies on useEffect redirect
```

The page expects the redirect to happen, but if the redirect fails, `isLoading` stays `true` forever.

### Issue 2: useAuth Race Condition

In `src/hooks/useAuth.ts`, the `onAuthStateChange` listener is set up AFTER `getSession()` is called:

```
// Current order (problematic):
getSession().then(...)  // Line 68-85
onAuthStateChange(...)  // Line 88-102
```

When `signInWithPassword()` is called from Login, Supabase's auth state changes. But:
- The listener callback awaits `fetchRole()` before updating state
- If role fetch is slow or blocked by RLS, the `user` state update is delayed
- Login page's `useEffect` never sees `user` become truthy
- The "Signing in..." spinner spins forever

## Solution

### Part 1: Fix Login Page (immediate fix)

Add a safety mechanism to reset loading state:

```typescript
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      // Success: give a reasonable time for redirect, then reset
      // The useEffect should redirect before this fires
      setTimeout(() => {
        setIsLoading(false);
      }, 3000);
    }
  } catch {
    toast.error('An unexpected error occurred');
    setIsLoading(false);
  }
};
```

### Part 2: Fix useAuth Hook (proper fix)

Restructure to set up listener BEFORE getSession, following Supabase best practices:

```typescript
useEffect(() => {
  let isMounted = true;
  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

  // Helper to safely update state
  const safeSetState = (next: AuthState) => {
    if (!isMounted) return;
    if (!next.loading && watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    setAuthState(next);
  };

  // Defensive role fetch
  const fetchRole = async (userId: string): Promise<AppRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.warn('[useAuth] Error fetching role:', error.message);
        return null;
      }
      return (data?.role as AppRole) ?? null;
    } catch (err) {
      console.warn('[useAuth] Exception fetching role:', err);
      return null;
    }
  };

  // 1. SET UP LISTENER FIRST (before getSession)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      // Update user/session immediately (no await)
      const user = session?.user ?? null;
      
      safeSetState({
        user,
        session,
        loading: false,
        role: authState.role, // Keep existing role temporarily
      });

      // Fetch role in background (fire-and-forget)
      if (user) {
        fetchRole(user.id).then(role => {
          if (isMounted) {
            setAuthState(prev => ({ ...prev, role }));
          }
        });
      }
    }
  );

  // Watchdog: force loading: false if stuck
  watchdogTimer = setTimeout(() => {
    if (isMounted) {
      console.warn('[useAuth] Watchdog timeout - forcing loading: false');
      safeSetState({ user: null, session: null, loading: false, role: null });
    }
  }, AUTH_TIMEOUT_MS);

  // 2. THEN check initial session
  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      
      // Await role fetch for initial load only
      const role = user ? await fetchRole(user.id) : null;

      safeSetState({
        user,
        session,
        loading: false,
        role,
      });
    } catch (err) {
      console.error('[useAuth] getSession failed:', err);
      safeSetState({ user: null, session: null, loading: false, role: null });
    }
  };

  initializeAuth();

  return () => {
    isMounted = false;
    if (watchdogTimer) clearTimeout(watchdogTimer);
    subscription.unsubscribe();
  };
}, []);
```

Key changes:
1. **Listener first**: `onAuthStateChange` is set up before `getSession()` is called
2. **Immediate state update**: The listener updates `user` and `session` immediately without awaiting role fetch
3. **Background role fetch**: Role is fetched asynchronously after state update
4. **Initial load waits for role**: Only the initial load awaits the role fetch

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAuth.ts` | Restructure to set up listener before getSession; update state immediately in listener |
| `src/pages/Login.tsx` | Add safety timeout to reset isLoading on success |

## Expected Outcome

1. User enters credentials and clicks "Sign In"
2. If credentials are wrong: toast error appears, button resets
3. If credentials are correct:
   - `signInWithPassword()` succeeds
   - `onAuthStateChange` fires immediately
   - `user` state updates (no waiting for role)
   - Login page's `useEffect` sees `!loading && user`
   - Navigation to `/` happens
   - Dashboard loads with user authenticated

## Testing Steps

After implementation:
1. Hard refresh the login page
2. Sign in with correct credentials
3. Verify redirect happens within 1-2 seconds
4. Verify dashboard loads correctly
5. Check console for any auth-related warnings
