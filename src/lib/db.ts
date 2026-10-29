import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-side Supabase client using the service role key. Never import this in client components. */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export type Source = {
  id: string;
  name: string;
  feed_url: string;
  site_url: string;
  category_hint: "kpop" | "kdrama_film" | "culture" | "korea_news" | "mixed";
  trust: 1 | 2 | 3;
  active: boolean;
};

export type RawItem = {
  id: string;
  source_id: string;
  url: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  image_url: string | null;
};

export type GlossaryTerm = { english: string; sorani: string; note: string | null };
