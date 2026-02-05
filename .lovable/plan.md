

## Goal
Fix all identified Kiosk issues and add an in-camera clock-in/out overlay button when a staff member is detected via facial recognition.

---

## Issues Identified

| Issue | Current State | Required Fix |
|-------|---------------|--------------|
| **Manager Override Tracking** | PIN verification returns `manager_id` but it's never passed to attendance mutations | Store `manager_id` and pass to `clockIn`/`clockOut` with `override_by` and `override_pin_used: true` |
| **Face Confidence Not Stored** | `CameraFeed` receives `confidence` from Face++ but doesn't pass it to `clockIn` | Pass `faceConfidence` through the flow and store in `attendance_records.face_match_confidence` |
| **No In-Camera Action Buttons** | User must wait for modal after face detection | Add overlay buttons directly on camera when face is detected for quick clock-in/out |
| **useAttendance.clockIn Missing Fields** | `clockIn` mutation doesn't accept `faceConfidence`, `overrideBy`, or `overridePinUsed` | Extend mutation to accept and persist all fields |

---

## Implementation Steps

### 1. Update `useAttendance` Hook
Extend the `clockIn` mutation to accept optional fields for tracking:

```typescript
// src/hooks/useAttendance.ts - Updated clockIn parameters
clockIn.mutateAsync({ 
  staffId: string,
  faceConfidence?: number,      // NEW: Face++ match score
  overrideBy?: string,          // NEW: Manager user_id from PIN verify
  overridePinUsed?: boolean     // NEW: Was this a PIN override?
})
```

**Database insert changes:**
- Pass `face_match_confidence` when provided
- Pass `override_by` and `override_pin_used` when manager override is used

---

### 2. Update `ClockActionModal` Component
Pass additional context from parent:

```typescript
// Props additions
interface ClockActionModalProps {
  // ...existing props
  faceConfidence?: number;       // NEW
  overrideManagerId?: string;    // NEW
  isManagerOverride?: boolean;   // NEW
}
```

These will be passed to the `clockIn` mutation.

---

### 3. Update Kiosk State Management
Track override context in `Kiosk.tsx`:

```typescript
// New state for manager override tracking
const [managerOverrideId, setManagerOverrideId] = useState<string | null>(null);
const [detectedConfidence, setDetectedConfidence] = useState<number | null>(null);
```

**Flow changes:**
1. `ManagerPinPad.onPinVerified` now returns `manager_id`
2. Store `manager_id` in state when override mode is used
3. Pass to `ClockActionModal` when opened
4. Clear after successful action

---

### 4. Update `ManagerPinPad` Component
Change `onPinVerified` callback to include manager ID:

```typescript
// Current signature
onPinVerified: () => void

// New signature
onPinVerified: (managerId: string) => void
```

The component already receives `manager_id` from the edge function - just needs to pass it up.

---

### 5. Add In-Camera Clock-In/Out Overlay
When a face is detected and matched, show action buttons directly on the camera feed:

**New UI Component:** Overlay inside `CameraFeed.tsx`

```text
+------------------------------------------+
|                                          |
|           [Camera Feed]                  |
|                                          |
|    +---------------------------+         |
|    |  👤 Staff Name Detected   |         |
|    |     Confidence: 95%       |         |
|    |                           |         |
|    |  [Clock In]  [Clock Out]  |         |
|    |     [Start Break]         |         |
|    +---------------------------+         |
|                                          |
+------------------------------------------+
```

**Behavior:**
- Appears when `scanningStatus === 'detected'`
- Shows detected staff name and confidence
- Buttons are contextual (Clock In if not clocked in, Break/Out if already clocked in)
- Clicking a button triggers the action directly (no modal needed)
- Auto-hides after 5 seconds of inactivity

---

### 6. Updated CameraFeed Props
Need additional information to show contextual buttons:

```typescript
interface CameraFeedProps {
  onFaceDetected: (staffId: string, confidence: number) => void;
  isProcessing: boolean;
  staffName?: string | null;
  
  // NEW props for in-camera actions
  detectedStaffId?: string | null;
  activeRecord?: AttendanceRecord | null;
  onClockAction?: (action: 'clock_in' | 'start_break' | 'end_break' | 'clock_out', staffId: string, confidence: number) => void;
}
```

---

### 7. Kiosk Flow Update
Add direct clock action handler:

```typescript
// Handle quick action from camera overlay
const handleCameraClockAction = async (
  action: 'clock_in' | 'start_break' | 'end_break' | 'clock_out',
  staffId: string,
  confidence: number
) => {
  switch (action) {
    case 'clock_in':
      await clockIn.mutateAsync({ staffId, faceConfidence: confidence });
      break;
    case 'start_break':
      const record = getActiveRecord(staffId);
      if (record) await startBreak.mutateAsync(record.id);
      break;
    // ... etc
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAttendance.ts` | Extend `clockIn` mutation with `faceConfidence`, `overrideBy`, `overridePinUsed` params |
| `src/components/kiosk/ManagerPinPad.tsx` | Update `onPinVerified` to return `managerId` |
| `src/components/kiosk/ClockActionModal.tsx` | Add props for confidence and override tracking, pass to mutations |
| `src/components/kiosk/CameraFeed.tsx` | Add in-camera action overlay when face detected |
| `src/pages/Kiosk.tsx` | Track manager ID, confidence; wire up camera actions; pass data to modal |

---

## User Experience Flow

### Face Recognition Clock-In (Quick Path)
1. Staff approaches kiosk
2. Camera detects and recognizes face
3. Overlay appears on camera: "Welcome, John! [Clock In] [More...]"
4. Staff taps "Clock In"
5. Success toast, overlay fades, ready for next person

### Face Recognition with Full Modal (Alternative)
1. Staff approaches kiosk
2. Camera detects and recognizes face
3. Staff waits 2 seconds without tapping overlay
4. Full `ClockActionModal` opens with all options
5. Staff selects action

### Manager Override Flow
1. Manager taps "Manager Override"
2. Enters PIN
3. PIN verified → `manager_id` captured
4. Staff selection modal opens
5. Manager selects staff member
6. Clock action recorded with `override_by` and `override_pin_used: true`

---

## Database Fields Utilized

| Field | When Populated |
|-------|----------------|
| `face_match_confidence` | Face++ detection confidence (0-100) |
| `override_by` | Manager's `user_id` when PIN override used |
| `override_pin_used` | `true` when clock action is via manager PIN |

---

## Testing Checklist
- [ ] Clock in via face recognition stores `face_match_confidence`
- [ ] Clock in via manager override stores `override_by` and `override_pin_used`
- [ ] In-camera overlay appears when face is detected
- [ ] Overlay shows correct action buttons based on current status
- [ ] Quick clock-in from overlay works without modal
- [ ] Overlay auto-hides after timeout
- [ ] TodayRoster updates in real-time after clock actions

