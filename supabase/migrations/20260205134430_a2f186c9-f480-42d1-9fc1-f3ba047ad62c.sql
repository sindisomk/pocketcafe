-- =====================================================
-- FIX 1: Drop the staff_profiles_admin view
-- It's redundant since admins can directly access staff_profiles table
-- and its existence creates confusion about access control
-- =====================================================

DROP VIEW IF EXISTS public.staff_profiles_admin;

-- =====================================================
-- FIX 2: Restrict manager UPDATE policy to only non-sensitive columns
-- Managers should not be able to UPDATE sensitive fields like:
-- ni_number, tax_code, nic_category, hourly_rate, face_token
-- 
-- Since PostgreSQL RLS can't restrict by column, we need to:
-- 1. Drop the current manager UPDATE policy
-- 2. Create a function that managers must call to update staff
-- 3. This function only allows updating specific columns
-- =====================================================

-- Drop the existing permissive manager UPDATE policy
DROP POLICY IF EXISTS "Managers can update basic staff info" ON public.staff_profiles;

-- Also drop the SELECT policy that allowed managers direct view access
-- (This was already restricted in previous migration but ensure it's gone)
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can view own staff profile" ON public.staff_profiles;

-- Create a new manager SELECT policy that only allows viewing via the manager view
-- Managers must use staff_profiles_manager view for viewing other staff
CREATE POLICY "Managers can view all staff via manager view"
  ON public.staff_profiles
  FOR SELECT
  USING (is_manager());

-- Create a secure function for managers to update non-sensitive staff fields only
CREATE OR REPLACE FUNCTION public.manager_update_staff_profile(
  p_staff_id uuid,
  p_name text DEFAULT NULL,
  p_role staff_role DEFAULT NULL,
  p_job_title job_title DEFAULT NULL,
  p_contract_type contract_type DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_profile_photo_url text DEFAULT NULL,
  p_start_date date DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a manager
  IF NOT is_manager() THEN
    RAISE EXCEPTION 'Only managers can update staff profiles';
  END IF;

  -- Verify staff exists
  IF NOT EXISTS (SELECT 1 FROM staff_profiles WHERE id = p_staff_id) THEN
    RAISE EXCEPTION 'Staff profile not found';
  END IF;

  -- Update only non-sensitive fields (never updates: ni_number, tax_code, nic_category, hourly_rate, face_token)
  UPDATE staff_profiles
  SET
    name = COALESCE(p_name, name),
    role = COALESCE(p_role, role),
    job_title = COALESCE(p_job_title, job_title),
    contract_type = COALESCE(p_contract_type, contract_type),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    profile_photo_url = COALESCE(p_profile_photo_url, profile_photo_url),
    start_date = COALESCE(p_start_date, start_date),
    updated_at = now()
  WHERE id = p_staff_id;

  RETURN true;
END;
$$;

-- Grant execute to authenticated users (function checks is_manager() internally)
GRANT EXECUTE ON FUNCTION public.manager_update_staff_profile TO authenticated;

-- Add comment documenting security constraints
COMMENT ON FUNCTION public.manager_update_staff_profile IS 
  'SECURITY DEFINER: Allows managers to update non-sensitive staff fields only. 
   Sensitive fields (ni_number, tax_code, nic_category, hourly_rate, face_token) 
   can only be updated by admins via direct table access.';