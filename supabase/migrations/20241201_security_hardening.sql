-- Fix RLS policies for profiles to prevent privilege escalation
DROP POLICY IF EXISTS "Approved users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can modify user status and role" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;

CREATE POLICY "Only admins can modify user status and role"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can update own basic profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Ensure status and role are not changed (new value equals current DB value)
  AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- AI Usage Logs Policies
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all ai logs" ON public.ai_usage_logs;
CREATE POLICY "Admins can view all ai logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Authenticated users can insert ai logs" ON public.ai_usage_logs;
CREATE POLICY "Authenticated users can insert ai logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Locations Policies
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users can view locations" ON public.locations;
CREATE POLICY "Approved users can view locations"
ON public.locations
FOR SELECT
TO authenticated
USING (
  (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'approved'
);

DROP POLICY IF EXISTS "Admins and managers can manage locations" ON public.locations;
CREATE POLICY "Admins and managers can manage locations"
ON public.locations
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);
