-- Fix 1: Revoke anonymous access to staff_profiles_public
-- The face-search edge function uses SERVICE_ROLE_KEY server-side, so anon access is not needed
REVOKE SELECT ON public.staff_profiles_public FROM anon;

-- Fix 2: Secure face-enrollment storage bucket with proper user-scoped policies
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload face images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read face images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete face images" ON storage.objects;

-- Admins can manage all face images
CREATE POLICY "Admins can manage face images"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'face-enrollment' AND
  (SELECT public.is_admin())
)
WITH CHECK (
  bucket_id = 'face-enrollment' AND
  (SELECT public.is_admin())
);

-- Managers can view all face images (needed for enrollment process)
CREATE POLICY "Managers can view face images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'face-enrollment' AND
  (SELECT public.is_manager())
);

-- Managers can upload face images during enrollment
CREATE POLICY "Managers can upload face images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'face-enrollment' AND
  (SELECT public.is_manager())
);

-- Managers can delete face images if needed
CREATE POLICY "Managers can delete face images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'face-enrollment' AND
  (SELECT public.is_manager())
);

-- Create rate limiting table for face-search endpoint
CREATE TABLE IF NOT EXISTS public.face_search_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ip text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.face_search_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits (edge function uses service role)
-- No policies needed for authenticated users - they shouldn't access this table

-- Create index for efficient IP lookup
CREATE INDEX IF NOT EXISTS idx_face_search_rate_limits_ip_window 
ON public.face_search_rate_limits (client_ip, window_start);

-- Add cleanup function to remove old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.face_search_rate_limits
  WHERE window_start < NOW() - INTERVAL '5 minutes';
$$;

-- Add comments for documentation
COMMENT ON TABLE public.face_search_rate_limits IS 'Rate limiting for face-search endpoint. Managed by edge function using service role.';
COMMENT ON FUNCTION public.cleanup_old_rate_limits() IS 'Cleanup function for old rate limit entries. Called periodically by edge functions.';