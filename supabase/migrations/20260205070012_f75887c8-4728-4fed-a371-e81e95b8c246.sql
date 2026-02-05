-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Kiosk can insert attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can create leave requests" ON public.leave_requests;

-- Create more restrictive attendance insert policy (staff can clock themselves in)
CREATE POLICY "Staff can clock in via kiosk"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (
  -- Staff can insert their own attendance records
  staff_id IN (
    SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()
  )
  OR public.is_admin() 
  OR public.is_manager()
);

-- Create more restrictive leave request policy (staff can only create for themselves)
CREATE POLICY "Staff can create own leave requests"
ON public.leave_requests FOR INSERT
TO authenticated
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()
  )
  OR public.is_admin()
  OR public.is_manager()
);