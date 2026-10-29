-- Kurean schedule, run by Supabase (works on Vercel's free plan, which only allows daily cron jobs).
-- Before running: replace BOTH placeholders below.
--   YOUR_SITE    → your Vercel address, e.g. kurean.vercel.app (later kurean.news)
--   YOUR_SECRET  → the same CRON_SECRET value you set in Vercel

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove old versions of these jobs if you run this file again
select cron.unschedule(jobname) from cron.job where jobname in ('kurean-collect', 'kurean-write');

-- Collect headlines every 20 minutes
select cron.schedule(
  'kurean-collect',
  '*/20 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR_SITE/api/cron/collect',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SECRET'),
    timeout_milliseconds := 60000
  );
  $$
);

-- Score and write stories at 10 minutes past every hour
select cron.schedule(
  'kurean-write',
  '10 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR_SITE/api/cron/write',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SECRET'),
    timeout_milliseconds := 300000
  );
  $$
);

-- To check runs later:  select * from cron.job_run_details order by start_time desc limit 20;
