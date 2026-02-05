-- Add face_token column to staff_profiles for Face++ biometric recognition
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS face_token TEXT;

COMMENT ON COLUMN public.staff_profiles.face_token IS 
  'Face++ face_token for biometric recognition. Enrolled during onboarding.';

-- Create storage bucket for temporary face images during enrollment
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-enrollment', 'face-enrollment', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the face-enrollment bucket
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

-- Update the staff_profiles_public view to include face enrollment status
DROP VIEW IF EXISTS public.staff_profiles_public;

CREATE VIEW public.staff_profiles_public AS
  SELECT 
    id,
    user_id,
    name,
    profile_photo_url,
    role,
    contract_type,
    hourly_rate,
    created_at,
    updated_at,
    CASE WHEN face_token IS NOT NULL THEN true ELSE false END as face_enrolled
  FROM public.staff_profiles;

GRANT SELECT ON public.staff_profiles_public TO anon, authenticated;

COMMENT ON VIEW public.staff_profiles_public IS 'Non-sensitive staff data for Kiosk and public display. No RLS enforcement.';