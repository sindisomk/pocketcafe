

## Goal
Fix the Email field in the "Add Staff" dialog that cannot receive focus when clicked (but works with Tab) in DuckDuckGo browser on Desktop.

## Root Cause Analysis

After investigating the issue thoroughly, I identified the following:

1. **Radix Dialog sets `pointer-events: none` on `<body>`** when a modal dialog is open. This is part of Radix's modality implementation to prevent interactions outside the dialog.

2. **DuckDuckGo browser injects Email Protection overlays** near email-type input fields. These overlays are portaled to `<body>` (outside the Radix dialog portal).

3. **The DDG overlay inherits `pointer-events: none`** from the body, causing a conflict where:
   - The overlay intercepts mouse clicks on the email field
   - But cannot respond to them because it has `pointer-events: none`
   - Result: clicking does nothing

4. **Tab/keyboard navigation works** because it bypasses CSS pointer-events entirely.

This is a known issue with Radix Dialog documented in their GitHub issues, with multiple workarounds.

## Implementation Plan

### Step 1: Clear body pointer-events when dialog opens

In `src/components/staff/StaffFormDialog.tsx`, add a `useEffect` hook that clears the `pointer-events: none` style from `<body>` when the dialog opens. This is a widely-used workaround recommended by the Radix community.

```text
Files changed:
- src/components/staff/StaffFormDialog.tsx
  - Add useEffect that runs when `open` changes to `true`
  - Clear document.body.style.pointerEvents to empty string
  - Use a small setTimeout(0) to ensure it runs after Radix applies its style
```

### Step 2: Ensure dialog content has explicit pointer-events: auto

In `src/components/ui/dialog.tsx`, add `pointer-events-auto` to `DialogContent` to ensure all elements inside the dialog can receive pointer events regardless of parent styles.

```text
Files changed:
- src/components/ui/dialog.tsx
  - Add `pointer-events-auto` class to DialogContent className
```

### Step 3: Keep existing defensive changes

The previous changes (type="text" with inputMode="email", forwardRef on DialogHeader/DialogFooter) remain in place as additional layers of compatibility.

## Technical Details

The key fix is in `StaffFormDialog.tsx`:

```typescript
useEffect(() => {
  if (open) {
    // Radix Dialog sets pointer-events: none on body which blocks
    // external overlays (like DuckDuckGo Email Protection) from working.
    // This workaround clears that style after Radix applies it.
    const timer = setTimeout(() => {
      document.body.style.pointerEvents = '';
    }, 0);
    return () => clearTimeout(timer);
  }
}, [open]);
```

This is safe because:
- The dialog overlay already covers the entire viewport, preventing outside clicks naturally
- The dialog content has a higher z-index and explicit pointer-events
- This only affects the specific dialog, not the entire application

## Files to be Changed

| File | Change |
|------|--------|
| `src/components/staff/StaffFormDialog.tsx` | Add useEffect to clear body pointer-events when dialog opens |
| `src/components/ui/dialog.tsx` | Add `pointer-events-auto` class to DialogContent |

## Success Criteria

- Email field can be clicked and focused in DuckDuckGo browser
- All form fields remain interactive (Name, Phone, etc.)
- Tab navigation continues to work
- Form submission and data persistence work correctly
- No regression in Chrome/Edge/Firefox browsers

## Testing Steps

1. Open the Staff page in DuckDuckGo browser
2. Click "Add Staff" to open the dialog
3. Click on the Email field - cursor should appear
4. Type an email address - characters should appear
5. Complete and submit the form
6. Verify the email is saved to the staff record

