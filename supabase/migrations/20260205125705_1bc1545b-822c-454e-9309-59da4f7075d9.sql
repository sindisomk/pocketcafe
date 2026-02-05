-- Fix security issues with staff_profiles_public view
-- Issue: View was created without security_invoker=on (SECURITY DEFINER by default)
-- Issue: View exposed hourly_rate which is salary information

DROP VIEW IF EXISTS public.staff_profiles_public;

-- Recreate with security_invoker=on (SECURITY INVOKER mode)
-- This ensures the view uses the RLS policies of the querying user, not the view creator
CREATE VIEW public.staff_profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  role,
  contract_type,
  created_at,
  updated_at,
  CASE WHEN face_token IS NOT NULL THEN true ELSE false END as face_enrolled
FROM public.staff_profiles;

-- Grant SELECT access to both anon (for kiosk) and authenticated users
GRANT SELECT ON public.staff_profiles_public TO anon, authenticated;

COMMENT ON VIEW public.staff_profiles_public IS 'Non-sensitive staff data for Kiosk and public display. Uses security_invoker=on for proper RLS enforcement. Excludes: ni_number, contact_email, contact_phone, tax_code, nic_category, hourly_rate.';