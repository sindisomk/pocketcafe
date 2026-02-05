-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('clocked_in', 'on_break', 'clocked_out');

-- Create leave status enum
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create attendance_records table for clock in/out and break tracking
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out_time TIMESTAMP WITH TIME ZONE,
  break_start_time TIMESTAMP WITH TIME ZONE,
  break_end_time TIMESTAMP WITH TIME ZONE,
  status attendance_status NOT NULL DEFAULT 'clocked_in',
  override_by UUID REFERENCES auth.users(id),
  override_pin_used BOOLEAN DEFAULT false,
  face_match_confidence NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create manager_pins table for kiosk override
CREATE TABLE public.manager_pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_pins ENABLE ROW LEVEL SECURITY;

-- Attendance records policies (admins/managers can view all, staff can view own)
CREATE POLICY "Admins and managers can view all attendance"
ON public.attendance_records FOR SELECT
TO authenticated
USING (public.is_admin() OR public.is_manager());

CREATE POLICY "Staff can view own attendance"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
  staff_id IN (
    SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can insert attendance"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR public.is_manager());

CREATE POLICY "Admins and managers can update attendance"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (public.is_admin() OR public.is_manager());

-- Allow public insert for kiosk (face recognition bypass)
CREATE POLICY "Kiosk can insert attendance"
ON public.attendance_records FOR INSERT
TO anon
WITH CHECK (true);

-- Leave requests policies
CREATE POLICY "Admins and managers can view all leave requests"
ON public.leave_requests FOR SELECT
TO authenticated
USING (public.is_admin() OR public.is_manager());

CREATE POLICY "Staff can view own leave requests"
ON public.leave_requests FOR SELECT
TO authenticated
USING (
  staff_id IN (
    SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create leave requests"
ON public.leave_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins and managers can update leave requests"
ON public.leave_requests FOR UPDATE
TO authenticated
USING (public.is_admin() OR public.is_manager());

CREATE POLICY "Staff can update own pending leave requests"
ON public.leave_requests FOR UPDATE
TO authenticated
USING (
  staff_id IN (
    SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Manager pins policies (only own pin)
CREATE POLICY "Users can view own pin"
ON public.manager_pins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all pins"
ON public.manager_pins FOR ALL
TO authenticated
USING (public.is_admin());

-- Create triggers for updated_at
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manager_pins_updated_at
BEFORE UPDATE ON public.manager_pins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for attendance (for live kiosk updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;