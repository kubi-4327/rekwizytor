-- Fix RLS for ai_usage_logs - Allow approved users to view stats
-- Current policy only allows admins to SELECT, which prevents approved users from viewing AI stats

DROP POLICY IF EXISTS "Admins can view all ai logs" ON public.ai_usage_logs;

-- Allow all approved users to view AI usage logs (for stats dashboard)
CREATE POLICY "Approved users can view ai logs" ON public.ai_usage_logs 
FOR SELECT TO authenticated 
USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
