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

-- The Korea chart in the footer: Circle Chart publishes its weekly chart on Thursdays (Korea time).
-- Checked once a day at 06:37 UTC; only a new week is stored. Added 30 Oct 2026 with migrate-006-chart.sql.
select cron.unschedule(jobname) from cron.job where jobname = 'kurean-chart';
select cron.schedule(
  'kurean-chart',
  '37 6 * * *',
  $$
  select net.http_get(
    url := 'https://YOUR_SITE/api/cron/chart',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SECRET'),
    timeout_milliseconds := 300000
  );
  $$
);

-- Scheduled publishing: every 5 minutes, publish approved stories whose time has come. Added 30 Oct 2026 (migrate-010).
select cron.unschedule(jobname) from cron.job where jobname = 'kurean-publish';
select cron.schedule(
  'kurean-publish',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR_SITE/api/cron/publish',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SECRET'),
    timeout_milliseconds := 300000
  );
  $$
);

-- Scenery: new Korea landscape/landmark candidates from Pexels every Monday 06:17 UTC (09:17 Hawler). Added 30 Oct 2026.
select cron.unschedule(jobname) from cron.job where jobname = 'kurean-scenery';
select cron.schedule(
  'kurean-scenery',
  '17 6 * * 1',
  $$
  select net.http_get(
    url := 'https://YOUR_SITE/api/cron/scenery',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SECRET'),
    timeout_milliseconds := 120000
  );
  $$
);
