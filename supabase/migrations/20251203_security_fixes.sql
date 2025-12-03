-- Fix Security Definer Views
-- Make them Security Invoker so they respect RLS of the querying user
ALTER VIEW public.vw_active_items SET (security_invoker = true);
ALTER VIEW public.vw_active_performances SET (security_invoker = true);
ALTER VIEW public.vw_items_by_location SET (security_invoker = true);

-- Enable RLS on scenes table
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- Add policies for scenes to ensure app functionality continues
-- We use the standard check for 'approved' status used elsewhere
CREATE POLICY "Approved users can view scenes" 
ON public.scenes FOR SELECT 
TO authenticated 
USING ((select status from public.profiles where id = auth.uid()) = 'approved');

CREATE POLICY "Approved users can insert scenes" 
ON public.scenes FOR INSERT 
TO authenticated 
WITH CHECK ((select status from public.profiles where id = auth.uid()) = 'approved');

CREATE POLICY "Approved users can update scenes" 
ON public.scenes FOR UPDATE 
TO authenticated 
USING ((select status from public.profiles where id = auth.uid()) = 'approved');

CREATE POLICY "Approved users can delete scenes" 
ON public.scenes FOR DELETE 
TO authenticated 
USING ((select status from public.profiles where id = auth.uid()) = 'approved');

-- Fix Function Search Paths
-- Set search_path to public, extensions to prevent search_path hijacking
ALTER FUNCTION public.protect_profile_fields SET search_path = public, extensions;
ALTER FUNCTION public.match_items SET search_path = public, extensions;
ALTER FUNCTION public.get_storage_stats SET search_path = public, extensions;
ALTER FUNCTION public.items_set_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.soft_delete_item SET search_path = public, extensions;
ALTER FUNCTION public.performance_items_set_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.performances_set_updated_at SET search_path = public, extensions;
ALTER FUNCTION public.handle_new_user SET search_path = public, extensions;

-- Move vector extension to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;
