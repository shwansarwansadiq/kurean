-- Kurean database schema (Supabase / Postgres)
-- Run this once in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- News sources the collector reads
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  site_url text not null,
  category_hint text not null check (category_hint in ('kpop', 'kdrama_film', 'culture', 'korea_news', 'mixed')),
  trust smallint not null default 2 check (trust between 1 and 3), -- 3 = high, 1 = needs a second source
  active boolean not null default true,
  last_checked_at timestamptz,
  last_item_at timestamptz,
  created_at timestamptz not null default now()
);

-- Every headline the collector finds, before the writer picks it
create table if not exists raw_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  url text not null,
  url_hash text not null unique,
  title text not null,
  summary text,
  published_at timestamptz,
  image_url text,
  status text not null default 'new' check (status in ('new', 'scored', 'skipped', 'written', 'failed')),
  score smallint,
  score_reason text,
  created_at timestamptz not null default now()
);
create index if not exists raw_items_status_idx on raw_items (status, created_at desc);

-- Finished stories waiting for approval, then published
create table if not exists stories (
  id bigserial primary key, -- used for the short link kurean.news/n/<id>
  raw_item_id uuid unique references raw_items(id) on delete set null,
  category text not null check (category in ('kpop', 'kdrama_film', 'culture', 'korea_news')),
  headline text not null,
  body text not null,
  card_headline text not null,
  key_points text[] not null default '{}',
  caption_instagram text not null,
  caption_facebook text not null,
  caption_tiktok text not null,
  hashtags text[] not null default '{}',
  source_name text not null,
  source_url text not null,
  needs_second_source boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'published', 'skipped', 'failed')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists stories_status_idx on stories (status, created_at desc);

-- Fixed Sorani spellings the writer must use
create table if not exists glossary (
  id uuid primary key default gen_random_uuid(),
  english text not null unique,
  sorani text not null,
  note text,
  updated_at timestamptz not null default now()
);

-- Only the server (service role) touches these tables for now
alter table sources enable row level security;
alter table raw_items enable row level security;
alter table stories enable row level security;
alter table glossary enable row level security;

-- Public site may read published stories
create policy "public reads published stories" on stories
  for select using (status = 'published');
