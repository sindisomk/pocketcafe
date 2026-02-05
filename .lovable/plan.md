

## Goal
Fix the facial recognition clock-in flow so that:
1. Staff who clock in via facial recognition appear on the Attendance page
2. The Kiosk's TodayRoster updates their status from "Expected" to "Clocked In"
3. The quick action overlay stays visible until the user takes action

---

## Root Cause Analysis

### Problem 1: Race Condition in Overlay Display
The camera overlay's visibility depends on TWO separate state sources:
- `scanningStatus === 'detected'` - managed inside CameraFeed component
- `detectedStaffId` - passed from parent Kiosk.tsx

When face is detected:
1. CameraFeed sets `scanningStatus = 'detected'` immediately
2. CameraFeed calls `onFaceDetected(staffId, confidence)`
3. Kiosk.tsx fetches staff name asynchronously, THEN sets `detectedStaffId`

During step 3, there's a delay where `scanningStatus === 'detected'` but `detectedStaffId` is still null, so the overlay doesn't show. By the time `detectedStaffId` is set, the 5-second cooldown may have already reset `scanningStatus` to 'idle'.

### Problem 2: Overlay Auto-Hides Too Quickly
The current timeout (5 seconds) may not be enough for users to read and tap the button, especially if there was initial delay in showing the overlay.

### Problem 3: Query Cache Not Refreshing TodayRoster
Both Kiosk.tsx and TodayRoster.tsx call `useAttendance()`, which creates separate React Query subscriptions. While `invalidateQueries` should refresh both, the TodayRoster might not re-render if:
- The query key doesn't exactly match
- The component doesn't subscribe to the invalidated query

---

## Solution

### Fix 1: Sync Detection State in CameraFeed
Instead of relying on both `scanningStatus` and `detectedStaffId` being set, have CameraFeed manage detection state internally and only show overlay when BOTH the Face++ match AND the parent has acknowledged the detection (via props).

**Changes to `src/components/kiosk/CameraFeed.tsx`:**
- Use `detectedStaffId` prop as the primary source of truth for showing overlay
- Keep `scanningStatus` for the scanning animation only
- Don't auto-hide overlay while `detectedStaffId` is set - let parent control visibility

```typescript
// Current (broken):
{scanningStatus === 'detected' && detectedStaffId && onQuickAction && (...)}

// Fixed:
{detectedStaffId && staffName && onQuickAction && (...)}
```

### Fix 2: Extend/Remove Auto-Hide Timer
Remove the automatic reset of detection state. Let the parent (Kiosk.tsx) control when to clear `detectedStaffId` - this already happens in `handleQuickAction` with a 2-second delay after action.

**Changes to `src/components/kiosk/CameraFeed.tsx`:**
- Remove or extend the 5-second `matchCooldownRef` that resets `scanningStatus`
- The overlay visibility should be controlled by parent state, not internal timer

### Fix 3: Ensure Query Invalidation Works
Add explicit refetch calls and verify query keys match.

**Changes to `src/components/kiosk/TodayRoster.tsx`:**
- Ensure the `useAttendance()` hook's query key matches what gets invalidated

**Changes to `src/pages/Kiosk.tsx`:**
- After successful clock action, wait briefly then refetch to ensure data is fresh

---

## Implementation Details

### File: `src/components/kiosk/CameraFeed.tsx`

1. **Change overlay visibility condition** (around line 275):
```typescript
// OLD:
{scanningStatus === 'detected' && detectedStaffId && onQuickAction && (

// NEW - Use props as source of truth:
{detectedStaffId && staffName && onQuickAction && (
```

2. **Modify match cooldown logic** (around lines 127-134):
```typescript
// OLD: Resets scanningStatus to 'idle' after 5 seconds
matchCooldownRef.current = true;
setTimeout(() => {
  matchCooldownRef.current = false;
  setScanningStatus('idle');  // <-- This kills the overlay
  setStatusMessage('Position your face in the frame');
  setLastDetectedConfidence(null);
}, 5000);

// NEW: Only reset cooldown, don't clear state (parent controls visibility)
matchCooldownRef.current = true;
setTimeout(() => {
  matchCooldownRef.current = false;
  // Only reset if parent has cleared detection
  if (!detectedStaffId) {
    setScanningStatus('idle');
    setStatusMessage('Position your face in the frame');
  }
}, 8000); // Extend to 8 seconds for cooldown between scans
```

3. **Reset scanning status when detection is cleared**:
```typescript
// Add useEffect to sync with parent state
useEffect(() => {
  if (!detectedStaffId) {
    setScanningStatus('idle');
    setStatusMessage('Position your face in the frame');
    setLastDetectedConfidence(null);
  }
}, [detectedStaffId]);
```

### File: `src/pages/Kiosk.tsx`

4. **Improve handleQuickAction with better error handling**:
```typescript
const handleQuickAction = async (
  action: 'clock_in' | 'start_break' | 'end_break' | 'clock_out',
  staffId: string,
  confidence: number
) => {
  try {
    switch (action) {
      case 'clock_in':
        await clockIn.mutateAsync({
          staffId,
          faceConfidence: confidence,
        });
        break;
      // ... other cases unchanged
    }
    
    // Give the mutation time to propagate, then refetch
    await new Promise(resolve => setTimeout(resolve, 500));
    await refetch();
    
    // Clear detection after successful action
    setDetectedStaffId(null);
    setDetectedConfidence(null);
    setDetectedStaffName(null);
    
  } catch (error) {
    console.error('[Kiosk] Quick action failed:', error);
    toast.error('Action failed. Please try again.');
  }
};
```

5. **Improve handleFaceDetected to be synchronous**:
```typescript
const handleFaceDetected = async (staffId: string, confidence: number) => {
  // Set detection state BEFORE async fetch
  setDetectedStaffId(staffId);
  setDetectedConfidence(confidence);
  setIsProcessing(true);
  
  try {
    const { data, error } = await supabase
      .from('staff_profiles_public')
      .select('id, name, profile_photo_url')
      .eq('id', staffId)
      .single();
    
    if (!error && data) {
      setDetectedStaffName(data.name as string);
    }
  } finally {
    setIsProcessing(false);
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/kiosk/CameraFeed.tsx` | Fix overlay visibility condition, extend cooldown timer, add useEffect to sync with parent state |
| `src/pages/Kiosk.tsx` | Improve handleFaceDetected to set state immediately, improve handleQuickAction with delay before refetch |

---

## Expected Behavior After Fix

1. Staff approaches kiosk
2. Face is detected by Face++ (3-second interval or manual tap)
3. Overlay appears IMMEDIATELY with staff name and "Clock In" button
4. Staff taps "Clock In"
5. Record is inserted into `attendance_records` with `face_match_confidence`
6. Toast shows "Clocked in successfully!"
7. TodayRoster updates to show staff as "On Duty"
8. Attendance page shows the new record
9. Overlay clears, ready for next person

---

## Testing Checklist
- [ ] Face detected shows overlay immediately (not after 2+ second delay)
- [ ] Overlay stays visible for at least 8 seconds
- [ ] Tapping "Clock In" creates attendance record with face_match_confidence
- [ ] TodayRoster immediately updates from "Expected" to "On Duty"
- [ ] Attendance page shows the clock-in record
- [ ] No RLS policy errors in console

