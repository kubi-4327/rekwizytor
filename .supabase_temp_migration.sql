-- Add visual mapping support to locations
alter table public.locations 
add column if not exists map_image_url text,
add column if not exists pins_data jsonb default '[]'::jsonb;

-- Storage buckets for mapping assets
insert into storage.buckets (id, name, public)
values ('location-maps', 'location-maps', true)
on conflict (id) do nothing;

create policy "Approved users can upload location maps"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'location-maps' 
    and (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Approved users can update location maps"
on storage.objects for update
to authenticated
with check (
    bucket_id = 'location-maps'
    and (select status from public.profiles where id = auth.uid()) = 'approved'
);

create policy "Anyone can view location maps"
on storage.objects for select
to public
using ( bucket_id = 'location-maps' );
