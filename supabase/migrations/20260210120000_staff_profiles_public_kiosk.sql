-- Re-create staff_profiles_public for Kiosk (unauthenticated) and public display.
-- Exposes only id, name, profile_photo_url, role so anon can load the staff list for clock-in.
-- Excludes: ni_number, contact_email, contact_phone, tax_code, hourly_rate, face_token, etc.

CREATE OR REPLACE VIEW public.staff_profiles_public AS
SELECT
  id,
  name,
  profile_photo_url,
  role
FROM public.staff_profiles;

GRANT SELECT ON public.staff_profiles_public TO anon, authenticated;

COMMENT ON VIEW public.staff_profiles_public IS 'Minimal staff data for Kiosk (anon) and public display. Id, name, photo, role only.';
