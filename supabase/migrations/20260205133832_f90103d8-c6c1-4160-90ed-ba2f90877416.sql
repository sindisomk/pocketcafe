-- =====================================================
-- FIX 1: Create a manager-safe view that excludes highly sensitive fields
-- =====================================================

-- Create a view for managers that excludes NI number, tax code, hourly rate, and face_token
CREATE OR REPLACE VIEW public.staff_profiles_manager
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  role,
  job_title,
  contract_type,
  contact_email,
  contact_phone,
  profile_photo_url,
  start_date,
  user_id,
  created_at,
  updated_at,
  -- Indicates if face is enrolled without exposing the token
  (face_token IS NOT NULL) AS face_enrolled
FROM public.staff_profiles;

-- Grant SELECT on the manager view to authenticated users
GRANT SELECT ON public.staff_profiles_manager TO authenticated;

-- =====================================================
-- FIX 2: Drop the insecure staff_profiles_public view
-- It has no RLS policies and views can't have RLS
-- The manager view above replaces its functionality
-- =====================================================

DROP VIEW IF EXISTS public.staff_profiles_public;

-- =====================================================
-- FIX 3: Update manager RLS policy on staff_profiles base table
-- Managers should NOT have direct access to sensitive fields
-- They must use the staff_profiles_manager view instead
-- =====================================================

-- Drop the existing manager SELECT policy that gives full access
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.staff_profiles;

-- Managers can only view their own profile directly (for self-service)
-- For viewing other staff, they must use staff_profiles_manager view
CREATE POLICY "Managers can view own staff profile"
  ON public.staff_profiles
  FOR SELECT
  USING (
    is_manager() AND user_id = auth.uid()
  );

-- =====================================================
-- FIX 4: Create a restricted admin view for sensitive data
-- Only admins should see NI numbers, tax codes, hourly rates
-- =====================================================

-- Create admin-only view with full sensitive data access
CREATE OR REPLACE VIEW public.staff_profiles_admin
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  role,
  job_title,
  contract_type,
  contact_email,
  contact_phone,
  profile_photo_url,
  start_date,
  user_id,
  created_at,
  updated_at,
  ni_number,
  tax_code,
  nic_category,
  hourly_rate,
  (face_token IS NOT NULL) AS face_enrolled
FROM public.staff_profiles;

-- Only grant to authenticated (RLS on base table controls actual access)
GRANT SELECT ON public.staff_profiles_admin TO authenticated;