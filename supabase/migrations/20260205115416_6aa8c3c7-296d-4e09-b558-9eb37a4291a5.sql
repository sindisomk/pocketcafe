-- ================================================
-- Leave Balances Table
-- ================================================
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid UNIQUE NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  total_entitlement_hours numeric(10,2) DEFAULT 0,
  used_hours numeric(10,2) DEFAULT 0,
  accrued_hours numeric(10,2) DEFAULT 0,
  year integer DEFAULT EXTRACT(YEAR FROM now()),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Staff can view own balance
CREATE POLICY "Staff can view own balance" ON public.leave_balances
  FOR SELECT USING (staff_id IN (
    SELECT id FROM staff_profiles WHERE user_id = auth.uid()
  ));

-- Managers can view all balances
CREATE POLICY "Managers can view all balances" ON public.leave_balances
  FOR SELECT USING (is_manager());

-- Admins can manage all balances
CREATE POLICY "Admins can manage balances" ON public.leave_balances
  FOR ALL USING (is_admin());

-- Managers can update balances (for approving leave)
CREATE POLICY "Managers can update balances" ON public.leave_balances
  FOR UPDATE USING (is_manager());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_balances;

-- Trigger for updated_at
CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- Notifications Table
-- ================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  related_staff_id uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  related_record_id uuid,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- Managers and admins can insert notifications
CREATE POLICY "Managers can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (is_manager() OR is_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;