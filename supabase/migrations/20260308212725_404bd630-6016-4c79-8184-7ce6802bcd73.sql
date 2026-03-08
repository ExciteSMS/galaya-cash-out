
-- Fix: Replace overly permissive INSERT policy with proper service-role-only pattern
DROP POLICY "System can insert notifications" ON public.notifications;
