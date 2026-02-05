-- Fix: Remove user SELECT policy on manager_pins to prevent hash exposure
-- PIN operations should only occur through edge functions (which use service role)

DROP POLICY IF EXISTS "Users can view own pin" ON public.manager_pins;