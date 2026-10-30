import { AdminShell } from "@/components/admin/AdminShell";
import { CopyButton } from "@/components/admin/CopyButton";
import { Submit } from "@/components/admin/Submit";
import { Bidi } from "@/components/Bidi";
import { storiesByStatus, type AdminStory } from "@/lib/admin-data";
import { ku } from "@/lib/site";
import { markTikTok } from "../actions";

export const dynamic = "force-dynamic";

const caption = (s: AdminStory) =>
  `${s.caption_tiktok.trim()}\n\n${(s.hashtags ?? []).join(" ")}\nkurean.news/n/${s.id}${s.image_credit ? `\n📷 ${s.image_credit}` : ""}`;

/** Published stories as ready-made TikTok videos: download, copy the caption, post from the phone, tick it off. */
export default async function TikTok() {
  const stories = (await storiesByStatus("published", 30)).sort((a, b) => Number(!!a.tiktok_done) - Number(!!b.tiktok_done));
  return (
    <AdminShell active="tiktok" title="ڤیدیۆ بۆ تیکتۆک">
      <p className="adm-note">
        هەر هەواڵێکی بڵاوکراوە ڤیدیۆیەکی ٩:١٦ی بۆ دروست دەکرێت (نزیکەی ١٥ خولەک دوای بڵاوکردنەوە). دایبەزێنە، کەپشنەکە کۆپی بکە و لە
        تیکتۆکدا بڵاوی بکەرەوە؛ دەنگێکی ترێند لە ناو تیکتۆکدا زیاد بکە (گۆرانیی کەی-پۆپ مەخەرە سەر ڤیدیۆکە).
      </p>
      <ul className="tt-list">
        {stories.map((s) => (
          <li key={s.id} className={s.tiktok_done ? "tt done" : "tt"}>
            {s.video_url ? (
              <video className="tt-video" src={s.video_url} controls playsInline preload="metadata" />
            ) : (
              <div className="tt-video tt-wait">ڤیدیۆکە ئامادە دەکرێت…</div>
            )}
            <div className="tt-side">
              <b>
                <Bidi text={s.card_headline} />
              </b>
              <small>#{ku(s.id)}{s.kind === "chart" ? " · ڕیزبەندیی هەفتە" : ""}</small>
              <pre className="tt-cap">{caption(s)}</pre>
              <div className="tt-actions">
                {s.video_url ? (
                  <a className="btn small" href={`${s.video_url}?download=kurean-${s.id}.mp4`}>
                    دابەزاندن
                  </a>
                ) : null}
                <CopyButton text={caption(s)} />
                <form action={markTikTok}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="done" value={s.tiktok_done ? "0" : "1"} />
                  <Submit className="btn small ghost" busy="…">{s.tiktok_done ? "هێشتا نا" : "لە تیکتۆک بڵاوکرایەوە ✓"}</Submit>
                </form>
              </div>
            </div>
          </li>
        ))}
        {!stories.length ? <li className="rows-empty">هێشتا هیچ هەواڵێک بڵاونەکراوەتەوە.</li> : null}
      </ul>
    </AdminShell>
  );
}
