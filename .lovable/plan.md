
Goal: eliminate the “blank / page” by (a) making sure we never get stuck in an infinite auth loading state, and (b) surfacing the *real* runtime error (including “Component is not a function” / unhandled promise rejections) instead of silently white-screening.

## What I found from debugging
- `/login` renders correctly (Welcome to PocketCafe, Email/Password, Sign In).
- `/` in the controlled browser session renders essentially “nothing” (at most a subtle skeleton), and there are **no actionable runtime errors shown** in the browser tool console—only unrelated `postMessage` origin warnings.
- Your earlier console logs show:
  - `Function components cannot be given refs...` (this was previously Skeleton-related, but Skeleton is now correctly `forwardRef`.)
  - `UNHANDLED_PROMISE_REJECTION` with `TypeError: Component is not a function`, which can crash React rendering and produce a blank page.
- The most plausible current failure mode is: **the app hits a runtime error outside React’s render stack (promise rejection), or `useAuth()` never flips `loading` to false (or flips too late), leaving `AppLayout` stuck on the loading skeleton**. Because this happens early, the UI looks blank and provides no clue.

## Implementation plan (real fix, not guesswork)

### 1) Add a global “last line of defense” error handler in `App.tsx`
Purpose: catch and report the exact error causing the blank screen, especially:
- `unhandledrejection` (matches your error report)
- `error` (uncaught exceptions)

What we’ll do:
- Add a `useEffect` in `App.tsx` that:
  - `console.error()` logs the error/rejection reason
  - shows a visible toast (using the existing Sonner `toast`) with a short message
  - (optionally) stores the last error in React state so we can render a visible “App crashed” fallback panel

Why this matters:
- Your reported error is explicitly an **UNHANDLED_PROMISE_REJECTION**. Without this, the app can “die” with no UI.

### 2) Wrap routing in an Error Boundary with a visible fallback UI
Purpose: prevent total blanking when a render-time error happens, and provide a recovery path.

What we’ll do:
- Create a small `ErrorBoundary` component (new file, e.g. `src/components/system/ErrorBoundary.tsx`):
  - `componentDidCatch` logs error + stack
  - Fallback UI shows:
    - “Something went wrong”
    - a button to go to `/login`
    - a “Reload” button
    - (in dev) a collapsible panel with error message/stack
- Wrap the `<Routes>` (or the whole router area) with `<ErrorBoundary>` in `App.tsx`.

Why this matters:
- If “Component is not a function” is thrown during render/hydration/update, an Error Boundary will stop the app from becoming a white screen and will help us pinpoint which subtree fails.

### 3) Harden `useAuth()` so `loading` cannot hang forever
Purpose: ensure `/` never looks blank just because auth never resolves.

Changes in `src/hooks/useAuth.ts`:
- Add a short watchdog timeout (e.g. 2500–4000ms):
  - If `loading` is still true after the timeout, force `loading: false` and `user: null`
  - This guarantees `AppLayout` will redirect to `/login` instead of hanging
- Make `fetchRole()` fully defensive:
  - wrap the query in `try/catch`
  - return `null` on any failure
- Make the initial session fetch robust:
  - handle the case where `.getSession()` resolves but the role fetch hangs by adding a role-fetch timeout (optional but recommended)

Why this matters:
- Today `/login` works, but `/` is protected by `AppLayout`. If auth hangs, `AppLayout` shows only the loader forever, which users interpret as “blank page”.

### 4) Add targeted instrumentation to identify the exact “Component is not a function” source
Purpose: stop guessing which component is invalid.

What we’ll log (temporarily, in dev-safe places):
- In the global handlers, log:
  - `typeof event.reason`, `event.reason?.message`, `event.reason?.stack`
- In the ErrorBoundary fallback, display the component stack (React provides it) if available.
- Optionally: add a single `console.log("App booted", { buildVersion })` in `App.tsx` so we can confirm you’re running the latest bundle when you report back.

### 5) Verification steps (what you’ll test after implementation)
1. Open `/`:
   - Expected: either the dashboard loads, or you get redirected to `/login`.
   - Not acceptable: infinite blank/skeleton with no navigation.
2. If an error still occurs:
   - Expected: you see a toast and/or an ErrorBoundary fallback showing a meaningful error message instead of a blank screen.
3. Navigate to `/login`, sign in:
   - Expected: you land on `/` and see the dashboard.
4. Re-check console:
   - We should now see the real stack trace pointing to the exact component/module if “Component is not a function” persists.

## Files that will be changed/added
- Update: `src/App.tsx`
  - Add global `unhandledrejection` + `error` listeners
  - Wrap router area in `ErrorBoundary`
- Update: `src/hooks/useAuth.ts`
  - Add watchdog timeout + defensive role fetching
- Add: `src/components/system/ErrorBoundary.tsx` (new)
  - Reusable error boundary + fallback UI

## Why this will “get to the bottom of it”
- Right now, you have a production-style symptom (blank screen) but not enough surfaced diagnostics.
- This plan both:
  1) prevents hanging UI states (auth watchdog), and
  2) forces the app to reveal the real underlying exception/rejection (global handlers + ErrorBoundary),
so we can fix the actual offending module if it’s still present.

## Expected outcome
- `/` will no longer be blank with no information.
- If the underlying bug still exists, we will have a precise error message and stack trace to fix it in the next iteration.
