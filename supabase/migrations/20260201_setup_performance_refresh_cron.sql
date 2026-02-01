-- Enable pg_cron extension
create extension if not exists pg_cron with schema extensions;

-- Grant usage on cron schema to postgres role
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Create a function to invoke the Edge Function
create or replace function public.refresh_performances_cron()
returns void
language plpgsql
security definer
as $$
declare
  function_url text;
  service_role_key text;
  response text;
begin
  -- Get the Supabase project URL and service role key from environment
  -- These will be available in the database context
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/refresh-performances';
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);
  
  -- Use pg_net to make HTTP request to Edge Function
  perform
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000 -- 2 minutes timeout
    );
    
  -- Log the execution
  raise notice 'Performance refresh cron executed at %', now();
end;
$$;

-- Schedule the cron job to run daily at 3:00 AM UTC
-- Cron format: minute hour day month weekday
select cron.schedule(
  'refresh-performances-daily',  -- job name
  '0 3 * * *',                   -- cron expression (3:00 AM UTC daily)
  $$select public.refresh_performances_cron();$$
);

-- To view scheduled jobs:
-- select * from cron.job;

-- To unschedule (if needed):
-- select cron.unschedule('refresh-performances-daily');
