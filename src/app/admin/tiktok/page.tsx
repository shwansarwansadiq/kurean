import { AdminShell } from "@/components/admin/AdminShell";
import { CopyButton } from "@/components/admin/CopyButton";
import { Submit } from "@/components/admin/Submit";
import { Bidi } from "@/components/Bidi";
import { storiesByStatus, type AdminStory } from "@/lib/admin-data";
import { ku } from "@/lib/site";
import { hawlerTime } from "@/lib/schedule";
import { DRAFTS_PER_DAY, tiktokConfigured, tiktokStatus } from "@/lib/tiktok";
import { markTikTok, sendToTikTok } from "../actions";

export const dynamic = "force-dynamic";

const caption = (s: AdminStory) =>
  `${s.caption_tiktok.trim()}\n\n${(s.hashtags ?? []).join(" ")}\nkurean.news/n/${s.id}${s.image_credit ? `\n📷 ${s.image_credit}` : ""}`;

const NOTICE: Record<string, string> = {
  connected: "تیکتۆک پەیوەست کرا. لەمەودوا ڤیدیۆی هەواڵە بڵاوکراوەکان وەک ڕەشنووس دەچنە ئینبۆکسی تیکتۆکەکەت.",
  denied: "ڕێگەت نەدا. هەر کاتێک ویستت دووبارە پەیوەستی بکەوە.",
  "bad-state": "پەیوەستکردن تەواو نەبوو (ماوەکەی بەسەرچوو). دووبارە هەوڵ بدەوە.",
  failed: "تیکتۆک پەیوەست نەکرا. دووبارە هەوڵ بدەوە؛ ئەگەر دووبارە بوویەوە، پێم بڵێ.",
  "no-code": "تیکتۆک هیچ کۆدێکی نەناردەوە. دووبارە هەوڵ بدەوە.",
  "no-key": "کلیلەکانی ئەپی تیکتۆک هێشتا لە Vercel دانەنراون (TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET).",
};

/** Where this story's TikTok draft is, in a few words. */
function draftLine(s: AdminStory): string | null {
  const r = s.tiktok_result;
  if (!r) return null;
  if (r === "sent" && s.tiktok_sent_at) return `ڕەشنووسەکە نێردرا بۆ ئینبۆکسی تیکتۆک · ${hawlerTime(s.tiktok_sent_at)}`;
  if (r === "queued") return "لە نۆرەدایە بۆ ئینبۆکسی تیکتۆک";
  if (r === "sending") return "دەنێردرێت…";
  if (r.startsWith("waiting")) return "تیکتۆک تەنها ٥ ڕەشنووسی چاوەڕوان لە ٢٤ کاتژمێردا وەردەگرێت؛ دواتر دەنێردرێت";
  return `نەنێردرا: ${r}`;
}

/** Published stories as ready-made TikTok videos: drafts in the TikTok inbox, or download; copy the caption, post, tick it off. */
export default async function TikTok({ searchParams }: { searchParams: Promise<{ tt?: string }> }) {
  const { tt } = await searchParams;
  const [all, status] = await Promise.all([storiesByStatus("published", 30), tiktokConfigured() ? tiktokStatus() : Promise.resolve({ connected: false })]);
  const stories = all.sort((a, b) => Number(!!a.tiktok_done) - Number(!!b.tiktok_done));
  return (
    <AdminShell active="tiktok" title="ڤیدیۆ بۆ تیکتۆک">
      {tt && NOTICE[tt] ? <p className={tt === "connected" ? "flag ok" : "flag warn"}>{NOTICE[tt]}</p> : null}
      <div className="tt-connect">
        {status.connected ? (
          <p>
            <b>تیکتۆک پەیوەستە.</b> ڤیدیۆی هەر هەواڵێک کە بە تیکتۆکەوە بڵاوی دەکەیتەوە، وەک ڕەشنووس دەچێتە ئینبۆکسی تیکتۆکەکەت (لە
            ٢٤ کاتژمێردا تا {ku(DRAFTS_PER_DAY)} ڕەشنووس). لە تیکتۆکدا ئاگادارکردنەوەکە بکەرەوە، دەنگێکی ترێند زیاد بکە، کەپشنەکەی خوارەوە
            بلکێنە و بڵاوی بکەرەوە.
          </p>
        ) : (
          <p>
            <b>تیکتۆک هێشتا پەیوەست نییە.</b> کە پەیوەستی بکەیت، ڤیدیۆکان خۆیان وەک ڕەشنووس دەچنە ئینبۆکسی تیکتۆکەکەت. تا ئەو کاتە:
            دایبەزێنە و لە تیکتۆکدا بڵاوی بکەرەوە.
          </p>
        )}
        {tiktokConfigured() ? (
          <a className={status.connected ? "btn small ghost" : "btn small pub"} href="/api/tiktok/connect">
            {status.connected ? "دووبارە پەیوەستکردن" : "پەیوەستکردنی تیکتۆک"}
          </a>
        ) : null}
      </div>
      <p className="adm-note">دەنگێکی ترێند لە ناو تیکتۆکدا زیاد بکە؛ گۆرانیی کەی-پۆپ مەخەرە سەر ڤیدیۆکە خۆی.</p>
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
              {draftLine(s) ? <p className={s.tiktok_result === "sent" ? "tt-draft ok" : "tt-draft"}>{draftLine(s)}</p> : null}
              <pre className="tt-cap">{caption(s)}</pre>
              <div className="tt-actions">
                {s.video_url ? (
                  <a className="btn small" href={`${s.video_url}?download=kurean-${s.id}.mp4`}>
                    دابەزاندن
                  </a>
                ) : null}
                <CopyButton text={caption(s)} />
                {status.connected && s.video_url && !s.tiktok_done && s.tiktok_result !== "queued" && s.tiktok_result !== "sending" ? (
                  <form action={sendToTikTok}>
                    <input type="hidden" name="id" value={s.id} />
                    <Submit className="btn small" busy="…">{s.tiktok_sent_at || s.tiktok_result ? "دووبارە ناردن بۆ ئینبۆکس" : "ناردن بۆ ئینبۆکسی تیکتۆک"}</Submit>
                  </form>
                ) : null}
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
