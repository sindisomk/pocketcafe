

## Goal
Integrate Face++ facial recognition for biometric clock-in/out at the Kiosk, with facial enrollment during staff onboarding.

---

## Architecture Overview

```text
+-------------------+         +--------------------+         +----------------+
|   Kiosk Camera    |  --->   |  Face++ Edge Fns   |  --->   |   Face++ API   |
|   (captures face) |         |  (detect/search)   |         |   (cloud)      |
+-------------------+         +--------------------+         +----------------+
         |                             |
         v                             v
+-------------------+         +--------------------+
|  StaffFormDialog  |         |  staff_profiles    |
|  (enrollment UI)  |         |  (face_token col)  |
+-------------------+         +--------------------+
```

---

## Implementation Steps

### Phase 1: Database Schema Updates

Add a column to store Face++ face tokens for enrolled staff:

```sql
-- Add face_token column to staff_profiles
ALTER TABLE public.staff_profiles 
ADD COLUMN face_token TEXT;

COMMENT ON COLUMN public.staff_profiles.face_token IS 
  'Face++ face_token for biometric recognition. Enrolled during onboarding.';
```

Create a storage bucket for temporary face images during enrollment:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-enrollment', 'face-enrollment', false);

-- RLS policies for the bucket
CREATE POLICY "Authenticated users can upload face images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'face-enrollment');

CREATE POLICY "Authenticated users can read face images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'face-enrollment');

CREATE POLICY "Authenticated users can delete face images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'face-enrollment');
```

---

### Phase 2: Edge Functions for Face++ API

Create two edge functions to handle Face++ operations:

**Function 1: `face-enroll`**
- Receives base64 image from enrollment UI
- Calls Face++ Detect API to get face_token
- Calls Face++ FaceSet AddFace to register the face
- Stores face_token in staff_profiles table
- Returns success/failure

**Function 2: `face-search`**
- Receives base64 image from Kiosk camera
- Calls Face++ Detect API to get face_token from captured image
- Calls Face++ Search API to match against enrolled faces
- Returns matched staff_id and confidence score (or no match)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/face-enroll` | POST | Enroll a staff member's face |
| `/face-search` | POST | Search for a face in the Kiosk |

---

### Phase 3: Face++ API Integration Details

**Required Secrets:**
- `FACEPP_API_KEY` - Face++ API Key
- `FACEPP_API_SECRET` - Face++ API Secret

**Face++ API Endpoints Used:**
| API | Endpoint | Purpose |
|-----|----------|---------|
| Detect | `POST https://api-us.faceplusplus.com/facepp/v3/detect` | Detect face and get face_token |
| FaceSet Create | `POST https://api-us.faceplusplus.com/facepp/v3/faceset/create` | Create a FaceSet (one-time setup) |
| FaceSet AddFace | `POST https://api-us.faceplusplus.com/facepp/v3/faceset/addface` | Add face to FaceSet |
| Search | `POST https://api-us.faceplusplus.com/facepp/v3/search` | Search for matching face |

**FaceSet Configuration:**
- One FaceSet per restaurant: `outer_id: "pocketcafe-staff"`
- Contains all enrolled staff face_tokens

---

### Phase 4: Facial Enrollment UI

Add enrollment functionality to the Staff onboarding process:

**New Component: `FaceEnrollmentCapture.tsx`**
- Camera capture interface with face detection overlay
- "Capture Photo" button with visual feedback
- Preview of captured image
- "Enroll Face" confirmation button
- Loading/success/error states

**Integration Points:**
1. Add "Enroll Face" step to `StaffFormDialog` (optional during creation)
2. Add "Enroll Face" button to `StaffDetailSheet` for existing staff
3. Show enrollment status badge on staff cards

---

### Phase 5: Kiosk Camera Integration

Update `CameraFeed.tsx` for real face detection:

**Changes:**
1. Periodic frame capture (every 2-3 seconds when face is positioned)
2. Send captured frame to `face-search` edge function
3. Handle search response:
   - Match found: Call `onFaceDetected(staffId, confidence)`
   - No match: Continue scanning with visual feedback
4. Debounce/throttle to avoid API overload
5. Show confidence threshold feedback

**Flow:**
```text
Camera Active → Detect Face in Frame → Capture Image → 
  → Send to face-search → Match Found? 
    → Yes: Show Staff Name + Clock Action Modal
    → No: "Face not recognized" + Continue scanning
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxxx_add_face_token.sql` | Create | Add face_token column + storage bucket |
| `supabase/functions/face-enroll/index.ts` | Create | Face enrollment edge function |
| `supabase/functions/face-search/index.ts` | Create | Face search edge function |
| `src/components/staff/FaceEnrollmentCapture.tsx` | Create | Camera capture for enrollment |
| `src/components/staff/FaceEnrollmentDialog.tsx` | Create | Dialog wrapper for enrollment |
| `src/components/kiosk/CameraFeed.tsx` | Modify | Integrate real Face++ search |
| `src/components/staff/StaffFormDialog.tsx` | Modify | Add optional enrollment step |
| `src/components/staff/StaffDetailSheet.tsx` | Modify | Add "Enroll Face" button |
| `src/hooks/useFaceEnrollment.ts` | Create | Hook for enrollment operations |
| `src/hooks/useFaceSearch.ts` | Create | Hook for Kiosk face search |

---

## Technical Details

### Edge Function: face-enroll

```typescript
// Key operations:
// 1. Receive { staffId, imageBase64 }
// 2. Call Face++ Detect API with image
// 3. Extract face_token from response
// 4. Call Face++ FaceSet AddFace with face_token
// 5. Update staff_profiles.face_token
// 6. Return { success, faceToken }
```

### Edge Function: face-search

```typescript
// Key operations:
// 1. Receive { imageBase64 }
// 2. Call Face++ Detect API with image
// 3. Call Face++ Search API with face_token + faceset outer_id
// 4. If match found with confidence > 80%:
//    - Query staff_profiles by face_token
//    - Return { matched: true, staffId, staffName, confidence }
// 5. Else return { matched: false }
```

### Camera Frame Capture

```typescript
// Convert video frame to base64:
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0);
const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
```

---

## Security Considerations

| Aspect | Approach |
|--------|----------|
| API Keys | Stored as Supabase secrets, never exposed to client |
| Face Data | Only face_token stored (not images), GDPR-friendly |
| Storage | Temporary enrollment images auto-deleted after processing |
| Access Control | Enrollment requires authenticated admin/manager |
| Kiosk Search | No auth required (public kiosk mode) |

---

## User Experience Flow

**Enrollment (during onboarding):**
1. Manager creates new staff member in StaffFormDialog
2. After saving basic info, "Enroll Face" dialog appears
3. Staff positions face in camera frame
4. Manager clicks "Capture" when ready
5. Preview shown, Manager clicks "Enroll"
6. Success message, staff is now ready for biometric clock-in

**Kiosk Clock-In:**
1. Staff approaches Kiosk tablet
2. Positions face in camera frame
3. System automatically detects and searches
4. If recognized: Shows staff name and Clock Action Modal
5. Staff taps "Clock In" (or "Start Break", "Clock Out")
6. Confirmation shown

---

## API Key Setup Required

Before implementation, Face++ API credentials must be configured:

1. Create a Face++ account at console.faceplusplus.com
2. Create an API Key and API Secret
3. Store in Supabase secrets:
   - `FACEPP_API_KEY`
   - `FACEPP_API_SECRET`

---

## Testing Checklist

- [ ] Face enrollment captures and stores face_token
- [ ] Multiple staff can be enrolled to same FaceSet
- [ ] Kiosk camera detects faces in real-time
- [ ] Recognized staff triggers Clock Action Modal
- [ ] Unrecognized faces show appropriate feedback
- [ ] Confidence threshold prevents false positives
- [ ] Manager Override still works as fallback
- [ ] Exit Kiosk still requires PIN

