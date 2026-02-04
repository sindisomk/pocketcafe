-- Create shift type enum
CREATE TYPE public.shift_type AS ENUM ('morning', 'evening');

-- Create schedule status enum
CREATE TYPE public.schedule_status AS ENUM ('draft', 'published');

-- Create weekly schedules table (for grouping shifts by week)
CREATE TABLE public.weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  status schedule_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(week_start_date)
);

-- Enable RLS on weekly_schedules
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Create shifts table (individual shift assignments)
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.weekly_schedules(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE NOT NULL,
  shift_date DATE NOT NULL,
  shift_type shift_type NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Prevent duplicate assignments
  UNIQUE(staff_id, shift_date, shift_type)
);

-- Enable RLS on shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic timestamp updates on weekly_schedules
CREATE TRIGGER update_weekly_schedules_updated_at
BEFORE UPDATE ON public.weekly_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on shifts
CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for weekly_schedules
CREATE POLICY "Admins can view all schedules"
  ON public.weekly_schedules
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Managers can view all schedules"
  ON public.weekly_schedules
  FOR SELECT
  USING (public.is_manager());

CREATE POLICY "Admins can insert schedules"
  ON public.weekly_schedules
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Managers can insert schedules"
  ON public.weekly_schedules
  FOR INSERT
  WITH CHECK (public.is_manager());

CREATE POLICY "Admins can update schedules"
  ON public.weekly_schedules
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Managers can update schedules"
  ON public.weekly_schedules
  FOR UPDATE
  USING (public.is_manager());

CREATE POLICY "Admins can delete schedules"
  ON public.weekly_schedules
  FOR DELETE
  USING (public.is_admin());

-- RLS Policies for shifts
CREATE POLICY "Admins can view all shifts"
  ON public.shifts
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Managers can view all shifts"
  ON public.shifts
  FOR SELECT
  USING (public.is_manager());

CREATE POLICY "Staff can view their own shifts"
  ON public.shifts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = shifts.staff_id
      AND staff_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert shifts"
  ON public.shifts
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Managers can insert shifts"
  ON public.shifts
  FOR INSERT
  WITH CHECK (public.is_manager());

CREATE POLICY "Admins can update shifts"
  ON public.shifts
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Managers can update shifts"
  ON public.shifts
  FOR UPDATE
  USING (public.is_manager());

CREATE POLICY "Admins can delete shifts"
  ON public.shifts
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Managers can delete shifts"
  ON public.shifts
  FOR DELETE
  USING (public.is_manager());