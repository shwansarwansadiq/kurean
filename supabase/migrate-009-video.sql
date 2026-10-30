-- Run once in the Supabase SQL editor. Motion videos for TikTok and Reels. Safe to run again.
alter table stories add column if not exists video_url text;          -- MP4 in the story-images bucket (video/…)
alter table stories add column if not exists video_hash text;         -- which version of the story the video shows
alter table stories add column if not exists video_made_at timestamptz;
alter table stories add column if not exists tiktok_done boolean not null default false; -- Shwan posted it on TikTok
