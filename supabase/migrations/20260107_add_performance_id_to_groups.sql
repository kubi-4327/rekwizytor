-- Add performance_id to groups table to link groups to performances
alter table groups
add column if not exists performance_id uuid references performances(id);

-- Add index for performance_id for faster lookups
create index if not exists idx_groups_performance_id on groups(performance_id);
