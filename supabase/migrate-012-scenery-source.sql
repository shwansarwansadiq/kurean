-- Run once in the Supabase SQL editor. Scenery from Pixabay as well as Pexels. Safe to run again.
alter table scenery add column if not exists source text not null default 'pexels'; -- 'pixabay' | 'pexels'
alter table scenery drop constraint if exists scenery_kind_pexels_id_key;
create unique index if not exists scenery_source_item_idx on scenery (source, kind, pexels_id);
