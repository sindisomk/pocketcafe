-- Allow managers to view their own PIN record
CREATE POLICY "Managers can view own pin"
ON public.manager_pins
FOR SELECT
USING (is_manager() AND user_id = auth.uid());

-- Allow managers to insert their own PIN record
CREATE POLICY "Managers can insert own pin"
ON public.manager_pins
FOR INSERT
WITH CHECK (is_manager() AND user_id = auth.uid());

-- Allow managers to update their own PIN record
CREATE POLICY "Managers can update own pin"
ON public.manager_pins
FOR UPDATE
USING (is_manager() AND user_id = auth.uid());