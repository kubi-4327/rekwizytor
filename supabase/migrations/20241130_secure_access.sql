-- Enable RLS on profiles if not already enabled
alter table public.profiles enable row level security;

-- Policy: Users can read their own profile
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
);

-- Policy: Approved users can read all profiles (to see pending users in settings)
create policy "Approved users can view all profiles"
on public.profiles
for select
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

-- Policy: Admins can view all profiles (Already exists in previous migration)
-- create policy "Admins can view all profiles"
-- on public.profiles
-- for select
-- to authenticated
-- using (
--   (select role from public.profiles where id = auth.uid()) = 'admin'
-- );

-- Policy: Only approved users can update profiles (e.g. approving others)
create policy "Approved users can update profiles"
on public.profiles
for update
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

-- Secure other tables
-- Items
alter table public.items enable row level security;

create policy "Approved users can view items"
on public.items
for select
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can insert items"
on public.items
for insert
to authenticated
with check (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can update items"
on public.items
for update
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can delete items"
on public.items
for delete
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

-- Performances
alter table public.performances enable row level security;

create policy "Approved users can view performances"
on public.performances
for select
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can insert performances"
on public.performances
for insert
to authenticated
with check (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can update performances"
on public.performances
for update
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can delete performances"
on public.performances
for delete
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

-- Groups
alter table public.groups enable row level security;

create policy "Approved users can view groups"
on public.groups
for select
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can insert groups"
on public.groups
for insert
to authenticated
with check (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can update groups"
on public.groups
for update
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can delete groups"
on public.groups
for delete
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

-- Notes
alter table public.notes enable row level security;

create policy "Approved users can view notes"
on public.notes
for select
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can insert notes"
on public.notes
for insert
to authenticated
with check (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can update notes"
on public.notes
for update
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can delete notes"
on public.notes
for delete
to authenticated
using (
  (select status from public.profiles where id = auth.uid()) = 'approved'
);
