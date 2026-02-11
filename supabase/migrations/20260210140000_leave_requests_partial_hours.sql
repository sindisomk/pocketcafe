-- Partial-day leave: optional start_time and end_time (NULL = full day)
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;

COMMENT ON COLUMN public.leave_requests.start_time IS 'Leave start time (NULL = full day from 00:00)';
COMMENT ON COLUMN public.leave_requests.end_time IS 'Leave end time (NULL = full day to 24:00)';

-- Optional: constraint that if one time is set, both must be set (application can enforce instead)
-- ALTER TABLE public.leave_requests ADD CONSTRAINT leave_times_both_or_neither
--   CHECK ((start_time IS NULL) = (end_time IS NULL));
