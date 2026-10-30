"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, isAdminToken, passwordMatches } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/site";
import { regenerate } from "@/lib/writer";
import { PLATFORMS } from "@/lib/admin-data";


async function requireAdmin() {
  const jar = await cookies();
  if (!(await isAdminToken(jar.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}

const idOf = (form: FormData) => {
  const id = Number(form.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("bad story id");
  return id;
};

function refreshSite(id?: number) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/news/${id}`);
}

export async function login(_: unknown, form: FormData): Promise<{ error: string } | undefined> {
  const ok = await passwordMatches(String(form.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 900));
    if (!process.env.ADMIN_PASSWORD) return { error: "وشەی نهێنی هێشتا لە Vercel دانەنراوە (ADMIN_PASSWORD)." };
    return { error: "وشەی نهێنی هەڵەیە. دووبارە هەوڵ بدەوە." };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, (await adminToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function publishStory(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const platforms = PLATFORMS.filter((p) => form.get(`p_${p}`) === "on");
  if (!platforms.includes("website")) platforms.unshift("website");
  const { error } = await db()
    .from("stories")
    .update({ status: "published", published_at: new Date().toISOString(), platforms })
    .eq("id", id)
    .in("status", ["pending", "skipped"]);
  if (error) throw error;
  refreshSite(id);
  revalidatePath("/admin");
}

export async function skipStory(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const { error } = await db().from("stories").update({ status: "skipped" }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function restoreStory(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const { error } = await db().from("stories").update({ status: "pending", published_at: null }).eq("id", id);
  if (error) throw error;
  refreshSite(id);
  revalidatePath("/admin");
  revalidatePath("/admin/published");
}

export async function regenerateStory(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  await regenerate(id);
  revalidatePath("/admin");
  revalidatePath(`/admin/story/${id}`);
}

export async function saveStory(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const category = text("category") as CategoryKey;
  const update: Record<string, unknown> = {
    headline: text("headline"),
    card_headline: text("card_headline"),
    body: text("body"),
    key_points: [text("kp1"), text("kp2"), text("kp3")].filter(Boolean),
    caption_instagram: text("caption_instagram"),
    caption_facebook: text("caption_facebook"),
    caption_tiktok: text("caption_tiktok"),
    edited_at: new Date().toISOString(),
  };
  if (CATEGORY_KEYS.includes(category)) update.category = category;
  if (form.get("remove_photo") === "on") Object.assign(update, { image_url: null, image_source: null, image_credit: null });
  if (!update.headline || !update.body || !update.card_headline) throw new Error("headline, card headline and body are required");
  const { error } = await db().from("stories").update(update).eq("id", id);
  if (error) throw error;
  refreshSite(id);
  revalidatePath("/admin");
  redirect(`/admin/story/${id}?saved=1`);
}

export async function markSticker(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  await db().from("stories").update({ sticker_done: true }).eq("id", id);
  revalidatePath("/admin/stickers");
}

export async function toggleSource(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const active = form.get("active") === "true";
  await db().from("sources").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/sources");
}

export async function saveTerm(form: FormData) {
  await requireAdmin();
  const english = String(form.get("english") ?? "").trim();
  const sorani = String(form.get("sorani") ?? "").trim();
  const note = String(form.get("note") ?? "").trim() || null;
  if (!english || !sorani) return;
  await db().from("glossary").upsert({ english, sorani, note, updated_at: new Date().toISOString() }, { onConflict: "english" });
  revalidatePath("/admin/glossary");
}
