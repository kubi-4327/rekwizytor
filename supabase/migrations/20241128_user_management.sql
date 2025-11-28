-- Create enums for User Role and Status
create type public.user_role as enum ('admin', 'user', 'manager');
create type public.user_status as enum ('pending', 'approved', 'rejected');

-- Update profiles table
alter table public.profiles 
add column role user_role default 'user',
add column status user_status default 'pending';

-- Update items table
alter table public.items
add column created_by uuid references auth.users(id);

-- Update performances table
alter table public.performances
add column created_by uuid references auth.users(id);

-- Update scene_checklist_items table
alter table public.scene_checklist_items
add column assigned_to uuid references auth.users(id);

-- Data Migration: Set existing users to approved admin to prevent lockout
update public.profiles
set role = 'admin', status = 'approved'
where role is null or status is null;

-- Enable RLS for new columns if needed (existing policies might cover it, but let's be safe)
-- For now, we assume existing policies on 'profiles' allow users to read their own data.
-- We might need to update policies to allow admins to read all profiles.

create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

create policy "Admins can update all profiles"
on public.profiles
for update
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);
