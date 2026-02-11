
-- Create admin view that excludes face_token (biometric data should never be returned to clients)
CREATE OR REPLACE VIEW public.staff_profiles_admin
WITH (security_invoker = on) AS
SELECT
  id, user_id, name, profile_photo_url, role,
  contract_type, ni_number, tax_code, nic_category,
  hourly_rate, contact_email, contact_phone,
  job_title, start_date, created_at, updated_at,
  CASE WHEN face_token IS NOT NULL THEN true ELSE false END as face_enrolled
FROM public.staff_profiles;

-- Grant access to authenticated users (RLS on base table enforces admin-only access)
GRANT SELECT ON public.staff_profiles_admin TO authenticated;
