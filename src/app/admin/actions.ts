"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, isAdminToken, passwordMatches } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/site";
import { collectPhotoOptions, refreshPhoto, regenerate } from "@/lib/writer";
import { download, looksLikeAgencyPhoto, store } from "@/lib/photo";
import { publishSocial } from "@/lib/social";
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
  // The site first, then social media: the cards link back to the published article.
  await publishSocial(id, platforms);
  revalidatePath("/admin");
  revalidatePath("/admin/published");
}

export async function retrySocial(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const platforms = String(form.get("platforms") ?? "").split(",").filter(Boolean);
  await publishSocial(id, platforms);
  revalidatePath("/admin/published");
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
  // Removing a photo (for example after a rights holder's warning) keeps it removed: no automatic re-check.
  if (form.get("remove_photo") === "on")
    Object.assign(update, { image_url: null, image_source: null, image_credit: null, image_license: "removed", photo_checked_at: new Date().toISOString() });
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

export async function findPhoto(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  await refreshPhoto(id);
  refreshSite(id);
  revalidatePath("/admin");
  revalidatePath(`/admin/story/${id}`);
}

type GalleryItem = { url: string; credit: string | null; page: string | null };

function refreshStoryPages(id: number) {
  refreshSite(id);
  revalidatePath("/admin");
  revalidatePath(`/admin/story/${id}`);
}

/** Pick one of the source articles' photos as the main photo. It is copied into our storage first. */
export async function setOptionAsMain(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const url = String(form.get("url"));
  const d = await download(url);
  if (!d) throw new Error("The photo could not be downloaded from the source site.");
  const stored = await store(d, `story-${id}-pick`);
  if (!stored) throw new Error("The photo could not be saved.");
  await db()
    .from("stories")
    .update({
      image_url: stored,
      image_source: String(form.get("page") || "") || null,
      image_credit: String(form.get("credit") || "") || null,
      image_license: looksLikeAgencyPhoto(url, d.bytes) ? "source-agency" : "source",
      photo_checked_at: new Date().toISOString(),
    })
    .eq("id", id);
  refreshStoryPages(id);
}

/** A photo Shwan uploaded himself (the browser already put it in storage through a signed upload URL). */
export async function applyOwnPhoto(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const path = String(form.get("path"));
  if (!path.startsWith(`own/story-${id}-`)) throw new Error("bad upload path");
  const url = db().storage.from("story-images").getPublicUrl(path).data.publicUrl;
  const target = String(form.get("target") ?? "main");
  if (target === "gallery") {
    await addToGallery(id, { url, credit: null, page: null });
  } else {
    await db()
      .from("stories")
      .update({ image_url: url, image_source: null, image_credit: null, image_license: "own", photo_checked_at: new Date().toISOString() })
      .eq("id", id);
  }
  refreshStoryPages(id);
}

/** Signed URL the browser uploads Shwan's photo to directly (Vercel limits request bodies to 4.5 MB). */
export async function photoUploadUrl(id: number, ext: string): Promise<{ path: string; url: string }> {
  await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("bad story id");
  const safe = ["jpg", "png", "webp"].includes(ext) ? ext : "jpg";
  const path = `own/story-${id}-${Date.now().toString(36)}.${safe}`;
  const { data, error } = await db().storage.from("story-images").createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("could not create upload URL");
  return { path, url: data.signedUrl };
}

async function addToGallery(id: number, item: GalleryItem) {
  const { data } = await db().from("stories").select("gallery").eq("id", id).single();
  const gallery = ((data as { gallery: GalleryItem[] } | null)?.gallery ?? []).filter((g) => g.url !== item.url);
  await db().from("stories").update({ gallery: [...gallery, item].slice(0, 12) }).eq("id", id);
}

/** Add one of the source articles' other photos to the article (copied into our storage). */
export async function addOptionToGallery(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const d = await download(String(form.get("url")));
  if (!d) throw new Error("The photo could not be downloaded from the source site.");
  const stored = await store(d, `story-${id}-extra`);
  if (!stored) throw new Error("The photo could not be saved.");
  await addToGallery(id, { url: stored, credit: String(form.get("credit") || "") || null, page: String(form.get("page") || "") || null });
  refreshStoryPages(id);
}

export async function removeFromGallery(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  const url = String(form.get("url"));
  const { data } = await db().from("stories").select("gallery").eq("id", id).single();
  const gallery = ((data as { gallery: GalleryItem[] } | null)?.gallery ?? []).filter((g) => g.url !== url);
  await db().from("stories").update({ gallery }).eq("id", id);
  refreshStoryPages(id);
}

export async function findMorePhotos(form: FormData) {
  await requireAdmin();
  const id = idOf(form);
  await collectPhotoOptions(id);
  revalidatePath(`/admin/story/${id}`);
}
