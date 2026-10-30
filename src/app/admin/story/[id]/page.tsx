import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PhotoPanel } from "@/components/admin/PhotoPanel";
import { SocialCard } from "@/components/admin/SocialCards";
import { Submit } from "@/components/admin/Submit";
import { adminStory } from "@/lib/admin-data";
import { CATEGORY_KEYS, CATEGORY_META, ku } from "@/lib/site";
import { publishStory, saveStory } from "../../actions";

export default async function EditStory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const story = await adminStory(Number((await params).id));
  if (!story) notFound();
  const saved = (await searchParams).saved === "1";
  const kp = [...story.key_points, "", "", ""].slice(0, 3);
  return (
    <AdminShell active="pending" title={`هەواڵی #${ku(story.id)}`}>
      <Link href="/admin" className="back">→ گەڕانەوە بۆ لیست</Link>
      {saved ? <p className="toast" role="status">پاشەکەوت کرا.</p> : null}
      <section className="designs" aria-label="دیزاینی سۆشیاڵ میدیا">
        <figure>
          <SocialCard story={story} format="feed" />
          <figcaption>پۆستی فید · 1080×1350</figcaption>
        </figure>
        <figure>
          <SocialCard story={story} format="story" />
          <figcaption>ستۆری · 1080×1920</figcaption>
        </figure>
        <figure>
          {story.video_url ? (
            <video className="tt-video vid-prev" src={story.video_url} controls playsInline preload="metadata" />
          ) : (
            <div className="tt-video tt-wait vid-prev">ڤیدیۆکە ئامادە دەکرێت (نزیکەی ١٥ خولەک)</div>
          )}
          <figcaption>ڤیدیۆ · تیکتۆک و ڕیڵز</figcaption>
        </figure>
      </section>
      <PhotoPanel story={story} />
      <form action={saveStory} className="edit">
        <input type="hidden" name="id" value={story.id} />
        <label>
          بەش
          <select name="category" defaultValue={story.category}>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_META[k].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          سەردێڕ
          <input name="headline" defaultValue={story.headline} required />
        </label>
        <label>
          سەردێڕی کارت (لەسەر وێنەکە)
          <input name="card_headline" defaultValue={story.card_headline} required />
        </label>
        <label>
          دەق
          <textarea name="body" defaultValue={story.body} rows={12} required />
        </label>
        <fieldset>
          <legend>بە کورتی</legend>
          {kp.map((k, i) => (
            <input key={i} name={`kp${i + 1}`} defaultValue={k} aria-label={`خاڵی ${ku(i + 1)}`} />
          ))}
        </fieldset>
        <label>
          کەپشنی ئینستاگرام
          <textarea name="caption_instagram" defaultValue={story.caption_instagram} rows={5} />
        </label>
        <label>
          کەپشنی فەیسبووک
          <textarea name="caption_facebook" defaultValue={story.caption_facebook} rows={5} />
        </label>
        <label>
          کەپشنی تیکتۆک
          <textarea name="caption_tiktok" defaultValue={story.caption_tiktok} rows={3} />
        </label>
        {story.image_url ? (
          <label className="check">
            <input type="checkbox" name="remove_photo" /> وێنەکە لاببە و کارتی براند بەکاربهێنە
          </label>
        ) : null}
        <Submit className="btn" busy="پاشەکەوت دەکرێت…">پاشەکەوت</Submit>
      </form>
      {story.status !== "published" ? (
        <form action={publishStory} className="edit-publish">
          <input type="hidden" name="id" value={story.id} />
          <input type="hidden" name="p_instagram" value="on" />
          <input type="hidden" name="p_facebook" value="on" />
          <Submit className="btn pub" busy="بڵاودەکرێتەوە…">بڵاوی بکەوە (ماڵپەڕ، ئینستاگرام، فەیسبووک)</Submit>
        </form>
      ) : null}
    </AdminShell>
  );
}
