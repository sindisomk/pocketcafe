-- Track when leave has been deducted from balance (for History status)
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS deducted_at timestamptz;

COMMENT ON COLUMN public.leave_requests.deducted_at IS 'When leave hours were applied to the staff leave balance';

-- Allow cancelling an approved leave
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'leave_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.leave_status ADD VALUE 'cancelled';
  END IF;
END $$;
