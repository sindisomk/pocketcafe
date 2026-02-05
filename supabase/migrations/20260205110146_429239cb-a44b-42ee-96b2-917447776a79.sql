-- Part 1.1: Create Settings Table
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (is_admin());

-- Managers can view settings
CREATE POLICY "Managers can view settings" ON public.app_settings
  FOR SELECT USING (is_manager());

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default work hours settings
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('work_hours', '{
    "latenessGraceMinutes": 5,
    "noShowThresholdMinutes": 30,
    "paidBreakMinutes": 30,
    "minRestBetweenShifts": 11,
    "maxWeeklyHours": 48,
    "autoClockOutEnabled": true,
    "autoClockOutHours": 12
  }'::jsonb);

-- Part 1.2: Add Lateness Columns to Attendance Records
ALTER TABLE public.attendance_records
  ADD COLUMN scheduled_start_time time,
  ADD COLUMN is_late boolean DEFAULT false,
  ADD COLUMN late_minutes integer DEFAULT 0;

-- Part 1.3: Create No-Show Records Table
CREATE TABLE public.no_show_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  scheduled_start_time time NOT NULL,
  detected_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.no_show_records ENABLE ROW LEVEL SECURITY;

-- Policies for managers/admins
CREATE POLICY "Admins can manage no-shows" ON public.no_show_records
  FOR ALL USING (is_admin());

CREATE POLICY "Managers can manage no-shows" ON public.no_show_records
  FOR ALL USING (is_manager());

-- Staff can view their own no-show records
CREATE POLICY "Staff can view own no-shows" ON public.no_show_records
  FOR SELECT USING (staff_id IN (
    SELECT id FROM staff_profiles WHERE user_id = auth.uid()
  ));

-- Enable realtime for no-shows
ALTER PUBLICATION supabase_realtime ADD TABLE public.no_show_records;

-- Enable realtime for app_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;