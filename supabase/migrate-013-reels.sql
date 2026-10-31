-- Run once in the Supabase SQL editor. Each published story's motion video also goes out as an Instagram Reel,
-- a Facebook Reel and (when the video is ready at publish time) a video story. Safe to run again.
alter table stories add column if not exists reel_status text;        -- null | waiting | posting | done | gave-up
alter table stories add column if not exists reel_story boolean not null default false; -- post the video as the story too
alter table stories add column if not exists reel_posted_at timestamptz;
create index if not exists stories_reel_idx on stories (reel_status) where reel_status in ('waiting', 'posting');
select 'reels ready' as result;
