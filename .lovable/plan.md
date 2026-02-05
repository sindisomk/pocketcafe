
Goal: Fix the “Email field can’t be focused / cursor won’t appear” issue in the Add Staff dialog, specifically occurring on Desktop in the DuckDuckGo browser, while keeping validation and saving behavior intact.

What I found (from code + logs)
- In code, the Email input is a normal `<input>` via our `Input` component and should be focusable.
- In my controlled browser session, I can click/type into the Email field successfully.
- Your console warning indicates a ref is being passed to a function component:
  - “Function components cannot be given refs… Check the render method of StaffFormDialog… at DialogFooter…”
  - This is a red flag because Radix Dialog + focus trapping relies heavily on refs; ref issues can cause browser-specific focus/interaction bugs.
- DuckDuckGo browser also has privacy/autofill features that can interfere with fields of `type="email"` (focus overlays, injected UI), which could explain why it happens for Email specifically.

Likely root causes (ranked)
1) Ref / focus-management incompatibility in our dialog components (the ref warning), which may break focus handling in some Chromium variants like DuckDuckGo.
2) DuckDuckGo’s injected “email protection/autofill” UI interfering with `type="email"` fields inside a modal dialog.
3) An overlay/pointer-events stacking issue (less likely because the field works in other browsers, but we will still verify z-index/pointer-events of overlay/content).

Plan (implementation steps)
1) Eliminate the ref warning in the dialog stack (high confidence)
   - Update `src/components/ui/dialog.tsx` so `DialogFooter` (and any other non-forwardRef dialog subcomponents if needed) can safely receive refs if Radix/Slot passes them.
   - Concretely:
     - Convert `DialogFooter` from a plain function component to `React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>`.
   - Expected result:
     - Console warning disappears.
     - More reliable focus behavior across browsers and inside the dialog focus trap.

2) Make Email input resilient against DuckDuckGo browser email-autofill interception (targeted workaround)
   - In `src/components/staff/StaffFormDialog.tsx`, change the Email field implementation to reduce chances of DuckDuckGo injecting/overlaying behavior that blocks focus:
     - Use `type="text"` instead of `type="email"` (while still treating it as an email semantically).
     - Add `inputMode="email"` to keep the right keyboard behavior where applicable.
     - Set `autoComplete="email"` (or if this still triggers DDG’s overlay, try `autoComplete="off"` as a fallback).
     - Ensure the `name` attribute is stable (keep `name={field.name}`).
   - Validation:
     - We can keep email validation light (only validate on submit or show a friendly error) so typing is never blocked.

3) Verify no overlay is blocking pointer events (quick confirmation + minor tweak if needed)
   - Check `DialogOverlay` and `DialogContent` z-index ordering:
     - Today both are `z-50`. While content comes after overlay (usually fine), to be extra safe we can bump content to `z-[60]` and keep overlay at `z-50`.
   - If needed, explicitly set overlay to `pointer-events-auto` and content to `pointer-events-auto` (usually default, but we’ll ensure nothing odd is happening).

4) Add a tiny internal debug helper (only if still failing after steps 1–3)
   - Temporarily add a small `onFocus`/`onClick` handler to the email input to log events (in development only) so we can confirm whether:
     - The click is reaching the input
     - The focus event fires
   - If click reaches but focus doesn’t happen, we’ll know it’s a focus-trap or browser-level intervention.

5) Test checklist (you + me)
   - On Desktop DuckDuckGo (your environment):
     1) Open Staff → Add Staff
     2) Click Email field: caret should appear
     3) Type an email: characters should appear
     4) Submit: ensure the created staff record retains email
     5) Re-open edit dialog for same staff member: email should still display
   - On a second browser (Chrome/Edge) to confirm no regression.

Files that will be changed
- `src/components/ui/dialog.tsx`
  - Convert `DialogFooter` to `forwardRef`
  - (Optional) adjust z-index for DialogContent if needed
- `src/components/staff/StaffFormDialog.tsx`
  - Adjust Email input attributes (`type`, `inputMode`, `autoComplete`) for DuckDuckGo compatibility
  - (Optional) add minimal focus/click debug logging if the issue persists

Success criteria
- Email field is focusable and accepts typing on Desktop DuckDuckGo.
- No ref warnings in console related to StaffFormDialog/DialogFooter.
- Email persists after saving and shows up when editing/viewing the staff member.

Notes / tradeoffs
- Using `type="text"` + `inputMode="email"` is a common approach to avoid browser/autofill quirks while keeping a good UX.
- This plan prioritizes restoring basic usability first, then we can re-tighten validation/UX once the focus issue is resolved.
