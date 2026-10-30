-- Run once in the Supabase SQL editor. Where to listen to each chart song. Safe to run again.
alter table chart_songs add column if not exists youtube_id text;          -- official video, played in YouTube's embedded player
alter table chart_songs add column if not exists youtube_channel text;     -- the channel it came from, for checking
alter table chart_songs add column if not exists youtube_checked_at timestamptz; -- re-checked every 30 days (YouTube API policy)
alter table chart_songs add column if not exists spotify_id text;          -- Spotify track, linked out
alter table chart_songs add column if not exists links_checked_at timestamptz;
