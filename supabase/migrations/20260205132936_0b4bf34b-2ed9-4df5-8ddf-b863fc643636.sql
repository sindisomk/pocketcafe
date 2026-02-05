-- Create table for manager PIN verification rate limiting
CREATE TABLE IF NOT EXISTS public.pin_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ip text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pin_verification_attempts ENABLE ROW LEVEL SECURITY;

-- No direct client access - only edge functions with service role
-- No RLS policies needed since service role bypasses RLS

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pin_verification_attempts_ip_window 
ON public.pin_verification_attempts (client_ip, window_start DESC);

-- Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_pin_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.pin_verification_attempts
  WHERE window_start < NOW() - INTERVAL '10 minutes';
$$;