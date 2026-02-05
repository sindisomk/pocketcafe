

## Goal
Add a prominent "Tap to Scan" button for manual face recognition triggering and improve clarity of available clock actions based on current staff status.

---

## Current State Analysis

### What Exists
- Auto-scanning every 3 seconds when camera is active
- Quick action overlay appears after face detection with buttons for Clock In, Break, End Break, Clock Out
- Status message shows "Position your face in the frame" or "Scanning..."

### Issues to Address
1. **No Manual Trigger**: Staff must wait for the 3-second auto-scan interval
2. **Action Clarity**: The overlay shows multiple buttons but doesn't clearly indicate the CURRENT status or PRIMARY action
3. **No Visual Cue**: Users don't know when scanning will happen

---

## Implementation Plan

### 1. Add "Tap to Scan" Button
A large, prominent button in the center-bottom of the camera view that staff can tap to immediately trigger face scanning.

**Location**: Below the face frame, above the status message
**Behavior**:
- Tapping triggers `captureAndSearch()` immediately
- Button shows loading state while scanning
- Hidden when face is detected (replaced by action overlay)

### 2. Improve Status Clarity
Replace the simple status text with a more informative display showing:
- Current action available (what will happen)
- Staff's current status if detected

### 3. Redesign Action Overlay
When face is detected, show a clearer overlay that:
- Displays ONE prominent primary action button
- Shows current status badge (e.g., "Currently: Clocked In")
- Shows secondary actions in smaller format

---

## UI Changes to CameraFeed.tsx

### New "Tap to Scan" Button
```text
+------------------------------------------+
|                                          |
|           [Camera Feed]                  |
|                                          |
|        +------------------+              |
|        |   Face Frame     |              |
|        |                  |              |
|        +------------------+              |
|                                          |
|         [ 👆 TAP TO SCAN ]               |  <-- NEW prominent button
|                                          |
|    "Position your face in the frame"    |
+------------------------------------------+
```

### Improved Detection Overlay
```text
+------------------------------------------+
|                                          |
|           [Camera Feed]                  |
|                                          |
|    +-----------------------------+       |
|    |  👤 John Smith              |       |
|    |  Match: 95% confident       |       |
|    |                             |       |
|    |  [  Currently: Not Clocked In  ]    |  <-- Status badge
|    |                             |       |
|    |  +---------------------+    |       |
|    |  |   🟢 CLOCK IN      |    |       |  <-- Primary action (large)
|    |  +---------------------+    |       |
|    |                             |       |
|    +-----------------------------+       |
+------------------------------------------+

When already clocked in:
+-----------------------------+
|  👤 John Smith              |
|  Match: 95% confident       |
|                             |
|  [  Currently: Working  ]   |  <-- Green status
|                             |
|  +---------------+  +---------------+
|  | ☕ START BREAK|  | 🔴 CLOCK OUT  |
|  +---------------+  +---------------+
+-----------------------------+

When on break:
+-----------------------------+
|  👤 John Smith              |
|  Match: 95% confident       |
|                             |
|  [ ☕ Currently: On Break ] |  <-- Yellow status
|                             |
|  +---------------------+    |
|  |   ⏱️ END BREAK      |    |  <-- Primary action
|  +---------------------+    |
|  [ Clock Out ]              |  <-- Secondary (smaller)
+-----------------------------+
```

---

## Technical Changes

### CameraFeed.tsx Modifications

1. **Add manual scan trigger prop and expose captureAndSearch**:
```typescript
// Make captureAndSearch callable from button
const handleManualScan = () => {
  // Clear cooldowns for manual scan
  searchCooldownRef.current = false;
  lastSearchRef.current = 0;
  captureAndSearch();
};
```

2. **Add "Tap to Scan" button**:
```typescript
{/* Tap to Scan button - shown when idle */}
{scanningStatus === 'idle' && cameraActive && !detectedStaffId && (
  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
    <Button
      size="lg"
      className="text-lg px-8 py-6 shadow-lg"
      onClick={handleManualScan}
    >
      <Scan className="h-6 w-6 mr-2" />
      Tap to Scan
    </Button>
  </div>
)}
```

3. **Add status badge component**:
```typescript
// Status badge showing current state
const getStatusBadge = () => {
  if (!activeRecord) return { label: 'Not Clocked In', color: 'bg-muted' };
  if (activeRecord.status === 'on_break') return { label: 'On Break', color: 'bg-warning' };
  if (activeRecord.status === 'clocked_in') return { label: 'Working', color: 'bg-success' };
  return { label: 'Unknown', color: 'bg-muted' };
};
```

4. **Redesign action overlay with primary/secondary actions**:
```typescript
// Determine primary action
const getPrimaryAction = () => {
  if (!activeRecord) return 'clock_in';
  if (activeRecord.status === 'on_break') return 'end_break';
  if (activeRecord.status === 'clocked_in') return 'start_break'; // or clock_out as secondary
  return null;
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/kiosk/CameraFeed.tsx` | Add Tap to Scan button, status badge, redesigned action overlay with clear primary/secondary actions |

---

## New Icon Import
```typescript
import { Camera, CameraOff, Loader2, LogIn, LogOut, Coffee, Clock, Scan } from 'lucide-react';
```

---

## User Experience Flow

### Standard Flow (with Tap to Scan)
1. Staff approaches kiosk
2. Sees prominent "Tap to Scan" button
3. Taps button (or waits for auto-scan)
4. Face recognized - overlay appears showing:
   - Name and confidence
   - Current status: "Not Clocked In"
   - Large green "CLOCK IN" button
5. Taps Clock In
6. Success toast, returns to scan mode

### Already Working - Taking Break
1. Staff approaches, taps "Tap to Scan"
2. Face recognized - overlay shows:
   - Name and confidence
   - Current status: "Working" (green badge)
   - Two buttons: "Start Break" | "Clock Out"
3. Taps "Start Break"
4. Success toast

### Returning from Break
1. Staff approaches, taps "Tap to Scan"
2. Face recognized - overlay shows:
   - Name and confidence
   - Current status: "On Break" (yellow badge)
   - Primary: "End Break" button
   - Secondary: "Clock Out" link
3. Taps "End Break"
4. Success toast

