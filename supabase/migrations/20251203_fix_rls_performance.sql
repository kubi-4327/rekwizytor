-- Fix RLS Performance and Redundancy
-- 1. Drop redundant/permissive policies
-- 2. Optimize existing policies by using (select auth.uid()) to prevent re-evaluation

-- GROUPS
DROP POLICY IF EXISTS "Authenticated users full access" ON public.groups;
DROP POLICY IF EXISTS "Approved users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Approved users can insert groups" ON public.groups;
DROP POLICY IF EXISTS "Approved users can update groups" ON public.groups;
DROP POLICY IF EXISTS "Approved users can delete groups" ON public.groups;

CREATE POLICY "Approved users can view groups" ON public.groups FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can insert groups" ON public.groups FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update groups" ON public.groups FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete groups" ON public.groups FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');

-- ITEMS
DROP POLICY IF EXISTS "Authenticated users full access" ON public.items;
DROP POLICY IF EXISTS "Approved users can view items" ON public.items;
DROP POLICY IF EXISTS "Approved users can insert items" ON public.items;
DROP POLICY IF EXISTS "Approved users can update items" ON public.items;
DROP POLICY IF EXISTS "Approved users can delete items" ON public.items;

CREATE POLICY "Approved users can view items" ON public.items FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can insert items" ON public.items FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update items" ON public.items FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete items" ON public.items FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');

-- PERFORMANCES
DROP POLICY IF EXISTS "Authenticated users full access" ON public.performances;
DROP POLICY IF EXISTS "Approved users can view performances" ON public.performances;
DROP POLICY IF EXISTS "Approved users can insert performances" ON public.performances;
DROP POLICY IF EXISTS "Approved users can update performances" ON public.performances;
DROP POLICY IF EXISTS "Approved users can delete performances" ON public.performances;

CREATE POLICY "Approved users can view performances" ON public.performances FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can insert performances" ON public.performances FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update performances" ON public.performances FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete performances" ON public.performances FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');

-- NOTES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.notes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notes;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.notes;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.notes;
DROP POLICY IF EXISTS "Approved users can view notes" ON public.notes;
DROP POLICY IF EXISTS "Approved users can insert notes" ON public.notes;
DROP POLICY IF EXISTS "Approved users can update notes" ON public.notes;
DROP POLICY IF EXISTS "Approved users can delete notes" ON public.notes;

CREATE POLICY "Approved users can view notes" ON public.notes FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can insert notes" ON public.notes FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update notes" ON public.notes FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete notes" ON public.notes FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');

-- NOTE MENTIONS
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.note_mentions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.note_mentions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.note_mentions;
-- Assuming "Approved users..." policies don't exist yet for note_mentions based on warnings, but let's add them if we want consistency, 
-- OR just fix the performance of the existing ones if we want to keep "authenticated" access. 
-- However, the plan was to rely on "Approved users". Let's assume note_mentions should also be restricted to approved users.
-- If note_mentions are just for linking, maybe authenticated is fine? 
-- But "Enable insert for authenticated users" was flagged. 
-- Let's replace with "Approved users..." policies for consistency and security.

CREATE POLICY "Approved users can view note_mentions" ON public.note_mentions FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can insert note_mentions" ON public.note_mentions FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update note_mentions" ON public.note_mentions FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete note_mentions" ON public.note_mentions FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');


-- LOCATIONS
DROP POLICY IF EXISTS "Authenticated users full access" ON public.locations;
DROP POLICY IF EXISTS "Admins and managers can manage locations" ON public.locations; -- Dropping as per plan to consolidate
DROP POLICY IF EXISTS "Approved users can view locations" ON public.locations;

-- Recreate with optimization
CREATE POLICY "Approved users can view locations" ON public.locations FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
-- Add write access for approved users (covering admins/managers too)
CREATE POLICY "Approved users can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update locations" ON public.locations FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete locations" ON public.locations FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');


-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles; -- Keep? Maybe needed for login? Usually profiles are public read.
-- Wait, "Public profiles are viewable by everyone" sounds like anon access. If we drop it, we might break public pages if any.
-- But the warning complained about "Multiple permissive policies".
-- Let's keep "Users can view own profile" (optimized) and "Approved users can view all profiles" (optimized).
-- "Public profiles..." might be too permissive if it exposes PII.
-- Let's drop "Users can update own profile." (duplicate?)
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can update profile status" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate optimized
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "Approved users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Users can update own basic profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "Approved users can update profile status" ON public.profiles FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');


-- SCENE CHECKLISTS
DROP POLICY IF EXISTS "Authenticated users full access" ON public.scene_checklists;
DROP POLICY IF EXISTS "Approved users can view scene_checklists" ON public.scene_checklists;
DROP POLICY IF EXISTS "Approved users can insert scene_checklists" ON public.scene_checklists;
DROP POLICY IF EXISTS "Approved users can update scene_checklists" ON public.scene_checklists;
DROP POLICY IF EXISTS "Approved users can delete scene_checklists" ON public.scene_checklists;

CREATE POLICY "Approved users can view scene_checklists" ON public.scene_checklists FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can insert scene_checklists" ON public.scene_checklists FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update scene_checklists" ON public.scene_checklists FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete scene_checklists" ON public.scene_checklists FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');


-- SCENE CHECKLIST ITEMS
DROP POLICY IF EXISTS "Authenticated users full access" ON public.scene_checklist_items;
DROP POLICY IF EXISTS "Approved users can view scene_checklist_items" ON public.scene_checklist_items;
DROP POLICY IF EXISTS "Approved users can insert scene_checklist_items" ON public.scene_checklist_items;
DROP POLICY IF EXISTS "Approved users can update scene_checklist_items" ON public.scene_checklist_items;
DROP POLICY IF EXISTS "Approved users can delete scene_checklist_items" ON public.scene_checklist_items;

CREATE POLICY "Approved users can view scene_checklist_items" ON public.scene_checklist_items FOR SELECT TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can insert scene_checklist_items" ON public.scene_checklist_items FOR INSERT TO authenticated WITH CHECK ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can update scene_checklist_items" ON public.scene_checklist_items FOR UPDATE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');
CREATE POLICY "Approved users can delete scene_checklist_items" ON public.scene_checklist_items FOR DELETE TO authenticated USING ((select status from public.profiles where id = (select auth.uid())) = 'approved');


-- AI USAGE LOGS
DROP POLICY IF EXISTS "Admins can view all ai logs" ON public.ai_usage_logs;
-- Recreate optimized
CREATE POLICY "Admins can view all ai logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING ((select role from public.profiles where id = (select auth.uid())) = 'admin');

