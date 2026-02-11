-- Add leave_type to leave_requests for UK leave types (Annual Leave, Sick, etc.)
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS leave_type TEXT;

COMMENT ON COLUMN public.leave_requests.leave_type IS 'UK leave type: Annual Leave, Sick Leave, Unpaid Leave, etc.';
