
-- Enable RLS on pin_verification_attempts
ALTER TABLE public.pin_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow service role (edge functions) to access this table
-- No anon/authenticated access needed since this is only used by the manager-pin edge function via service role key
CREATE POLICY "No public access to pin verification attempts"
ON public.pin_verification_attempts
FOR ALL
USING (false)
WITH CHECK (false);
