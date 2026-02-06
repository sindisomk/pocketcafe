
-- Add admin monitoring policies to pin_verification_attempts (matching face_search_rate_limits pattern)
CREATE POLICY "Admins can view PIN attempts"
ON public.pin_verification_attempts
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can delete PIN attempts"
ON public.pin_verification_attempts
FOR DELETE
USING (public.is_admin());
