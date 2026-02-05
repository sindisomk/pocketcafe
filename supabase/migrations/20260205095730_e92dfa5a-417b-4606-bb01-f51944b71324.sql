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
    updated_at
  FROM public.staff_profiles;

-- Grant access to both anon and authenticated roles
GRANT SELECT ON public.staff_profiles_public TO anon, authenticated;

COMMENT ON VIEW public.staff_profiles_public IS 'Non-sensitive staff data for Kiosk and public display. No RLS enforcement.';