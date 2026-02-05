# Facial Recognition Clock-In Fix

## Status: ✅ COMPLETE

## Summary
Fixed the race condition and auto-hide issues in the facial recognition clock-in flow.

### Changes Made

**CameraFeed.tsx:**
1. Changed overlay visibility condition from `scanningStatus === 'detected' && detectedStaffId` to `detectedStaffId && staffName` - uses parent props as source of truth
2. Extended match cooldown from 5s to 8s and removed auto-reset of `scanningStatus`
3. Added `useEffect` to sync internal state when parent clears `detectedStaffId`

**Kiosk.tsx:**
1. `handleFaceDetected` now sets `detectedStaffId` IMMEDIATELY before async fetch
2. `handleQuickAction` now awaits a 500ms delay before refetch to ensure DB propagation
3. Removed duplicate toast calls (already handled by useAttendance hook)

### Expected Behavior
1. Face detected → overlay appears immediately with staff name
2. Overlay stays visible until user taps action or 8 seconds pass
3. Tapping "Clock In" inserts record → refetch updates TodayRoster → Attendance page shows record
