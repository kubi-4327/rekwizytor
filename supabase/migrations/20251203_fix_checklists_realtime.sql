-- Enable RLS (Safe to run multiple times)
alter table public.scene_checklists enable row level security;
alter table public.scene_checklist_items enable row level security;

-- Policies for scene_checklists
do $$
begin
  -- View
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklists' and policyname = 'Approved users can view scene_checklists') then
    create policy "Approved users can view scene_checklists" on public.scene_checklists for select to authenticated using ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;

  -- Insert
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklists' and policyname = 'Approved users can insert scene_checklists') then
    create policy "Approved users can insert scene_checklists" on public.scene_checklists for insert to authenticated with check ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;

  -- Update
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklists' and policyname = 'Approved users can update scene_checklists') then
    create policy "Approved users can update scene_checklists" on public.scene_checklists for update to authenticated using ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;

  -- Delete
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklists' and policyname = 'Approved users can delete scene_checklists') then
    create policy "Approved users can delete scene_checklists" on public.scene_checklists for delete to authenticated using ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;
end $$;

-- Policies for scene_checklist_items
do $$
begin
  -- View
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklist_items' and policyname = 'Approved users can view scene_checklist_items') then
    create policy "Approved users can view scene_checklist_items" on public.scene_checklist_items for select to authenticated using ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;

  -- Insert
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklist_items' and policyname = 'Approved users can insert scene_checklist_items') then
    create policy "Approved users can insert scene_checklist_items" on public.scene_checklist_items for insert to authenticated with check ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;

  -- Update
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklist_items' and policyname = 'Approved users can update scene_checklist_items') then
    create policy "Approved users can update scene_checklist_items" on public.scene_checklist_items for update to authenticated using ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;

  -- Delete
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'scene_checklist_items' and policyname = 'Approved users can delete scene_checklist_items') then
    create policy "Approved users can delete scene_checklist_items" on public.scene_checklist_items for delete to authenticated using ((select status from public.profiles where id = auth.uid()) = 'approved');
  end if;
end $$;

-- Add to publication for Realtime (Safe to run multiple times)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'scene_checklists'
  ) then
    alter publication supabase_realtime add table scene_checklists;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'scene_checklist_items'
  ) then
    alter publication supabase_realtime add table scene_checklist_items;
  end if;
end;
$$;
