

## Goal
Fix dropdown lists (Select and Popover/Calendar) in the "Add Staff Member" dialog that are not displaying correctly or not appearing at all.

## Root Cause Analysis

After reviewing the code and session replay data, I identified two key issues:

### Issue 1: Z-index Stacking Conflict
| Component | Current z-index |
|-----------|-----------------|
| DialogOverlay | z-50 |
| DialogContent | z-[60] |
| SelectContent (dropdowns) | z-50 |
| PopoverContent (calendar) | z-50 |

The dropdown portals render at z-50, which is **below** the DialogContent at z-[60]. This causes dropdowns to appear behind the dialog or be completely hidden.

### Issue 2: Pointer-Events Inheritance
The workaround that clears `pointer-events: none` from the body runs when the dialog opens, but:
- Radix Select and Popover also portal their content to `<body>`
- When a dropdown opens, Radix may re-apply `pointer-events: none` to the body
- The dropdown content then inherits this and becomes non-interactive

### Issue 3: Viewport Height Constraint
The SelectContent viewport uses `h-[var(--radix-select-trigger-height)]` which can constrain the dropdown to the height of the trigger button, making items barely visible.

## Implementation Plan

### Step 1: Increase z-index for SelectContent
In `src/components/ui/select.tsx`, change `SelectContent` from `z-50` to `z-[100]` to ensure it renders above dialogs.

```text
Change: "relative z-50 max-h-96..." 
To:     "relative z-[100] max-h-96..."
```

### Step 2: Increase z-index for PopoverContent
In `src/components/ui/popover.tsx`, change `PopoverContent` from `z-50` to `z-[100]` to ensure the calendar picker appears above dialogs.

```text
Change: "z-50 w-72 rounded-md..."
To:     "z-[100] w-72 rounded-md..."
```

### Step 3: Add pointer-events-auto to dropdown content
Add `pointer-events-auto` class to both `SelectContent` and `PopoverContent` to ensure they remain interactive even if the body has `pointer-events: none`.

### Step 4: Fix Viewport height constraint
In `SelectContent`, modify the viewport to use `max-h-[var(--radix-select-content-available-height)]` instead of a fixed height based on trigger, ensuring the dropdown can expand to show all items.

## Files to be Changed

| File | Change |
|------|--------|
| `src/components/ui/select.tsx` | Increase z-index to z-[100], add pointer-events-auto, fix viewport height |
| `src/components/ui/popover.tsx` | Increase z-index to z-[100], add pointer-events-auto |

## Technical Details

### select.tsx changes:
```typescript
// SelectContent className change:
"relative z-[100] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md pointer-events-auto ..."

// Viewport className change - remove fixed height:
"p-1 max-h-[--radix-select-content-available-height]"
// instead of:
"p-1 h-[var(--radix-select-trigger-height)]"
```

### popover.tsx changes:
```typescript
// PopoverContent className change:
"z-[100] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none pointer-events-auto ..."
```

## Success Criteria

- All dropdown selects (Department, Job Title, Contract Type, Tax Code, NIC Category) appear and are fully visible when clicked
- The Start Date calendar popover appears above the dialog and is interactive
- Dropdown items can be selected with mouse clicks
- No visual artifacts or transparent/invisible dropdowns
- Works in DuckDuckGo and other browsers

## Testing Steps

1. Open Staff page and click "Add Staff"
2. Click the "Department" dropdown - verify it appears with all 4 options visible
3. Select a department, then click "Job Title" - verify job titles appear
4. Click "Contract Type" dropdown - verify both options appear
5. Click "Tax Code" dropdown - verify all tax codes appear and are scrollable
6. Click "NIC Category" dropdown - verify all 9 categories appear
7. Click "Start Date" and verify the calendar appears and dates can be selected
8. Complete the form and submit to verify everything saves correctly

