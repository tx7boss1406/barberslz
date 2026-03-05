
-- Allow service_role to insert notifications (for edge functions)
CREATE POLICY "Service insert notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);
