-- Remove manager ability to SELECT their own pin_hash to prevent hash exposure
-- The edge function uses service_role which bypasses RLS, so this is safe
DROP POLICY IF EXISTS "Managers can view own pin" ON public.manager_pins;