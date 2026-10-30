/* eslint-disable @next/next/no-img-element -- Pixabay/Pexels previews */
import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { db } from "@/lib/db";
import { ku } from "@/lib/site";
import { REPEAT_DAYS } from "@/lib/scenery";
import { searchScenery, setScenery } from "../actions";

export const dynamic = "force-dynamic";

type Item = {
  id: number;
  kind: "photo" | "video";
  url: string;
  page_url: string;
  place_ckb: string;
  place_en: string;
  photographer: string;
  source: string | null;
  status: string;
  music: string | null;
  video_url: string | null;
  last_posted_at: string | null;
};

function Preview({ s }: { s: Item }) {
  if (s.video_url) return <video className="sc-prev" src={s.video_url} controls playsInline preload="metadata" />;
  if (s.kind === "video") return <video className="sc-prev" src={s.url} muted playsInline preload="metadata" controls />;
  return <img className="sc-prev" src={`${s.url}?auto=compress&w=360`} alt={s.place_en} loading="lazy" />;
}

/** Korea's nature and landmarks between the news: approve the week's candidates; approved ones post themselves. */
export default async function SceneryPage() {
  const { data } = await db()
    .from("scenery")
    .select("id, kind, url, page_url, place_ckb, place_en, photographer, source, status, music, video_url, last_posted_at")
    .neq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(80);
  const items = (data ?? []) as Item[];
  const pending = items.filter((s) => s.status === "pending");
  const approved = items.filter((s) => s.status === "approved");
  const { data: q } = await db().from("social_queue").select("due_at, result, done_at").order("created_at", { ascending: false }).limit(1);
  const last = q?.[0];
  const hasKey = !!(process.env.PIXABAY_API_KEY || process.env.PEXELS_API_KEY);
  return (
    <AdminShell active="scenery" title="دیمەنی کۆریا">
      <div className="sched-top">
        <p className="adm-note">
          لە نێوان هەواڵەکاندا لە ستۆریی ئینستاگرام و فەیسبووک: ٢٠ خولەک دوای هەر هەواڵێک، یەک دیمەنی پەسەندکراو (وێنە یان ڤیدیۆ) لەگەڵ
          مۆسیقای خۆمان بڵاودەبێتەوە. هەمان دیمەن تا {ku(REPEAT_DAYS)} ڕۆژ دووبارە نابێتەوە. هەموو هەفتەیەک دیمەنی نوێ دێت.
        </p>
        {hasKey ? (
          <form action={searchScenery}>
            <Submit className="btn" busy="دەگەڕێت…">ئێستا دیمەنی نوێ بدۆزەوە</Submit>
          </form>
        ) : (
          <p className="flag warn">کلیلی Pixabay هێشتا دانەنراوە (PIXABAY_API_KEY لە Vercel).</p>
        )}
      </div>
      {last ? (
        <p className="adm-note">
          دوایین: {last.done_at ? last.result ?? "" : "چاوەڕێی کاتی خۆیەتی"}
        </p>
      ) : null}

      <h2 className="sc-h">چاوەڕوانی پەسەندکردن · {ku(pending.length)}</h2>
      <ul className="sc-grid">
        {pending.map((s) => (
          <li key={s.id} className="sc-item">
            <Preview s={s} />
            <b>{s.place_ckb}</b>
            <small dir="ltr">
              {s.kind === "video" ? "Video" : "Photo"} · <a href={s.page_url} target="_blank" rel="noopener">{s.photographer} · {s.source === "pixabay" ? "Pixabay" : "Pexels"}</a>
            </small>
            <div className="sc-acts">
              <form action={setScenery}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="status" value="approved" />
                <Submit className="btn small pub" busy="…">پەسەند</Submit>
              </form>
              <form action={setScenery}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="status" value="rejected" />
                <Submit className="btn small ghost" busy="…">نا</Submit>
              </form>
            </div>
          </li>
        ))}
        {!pending.length ? <li className="rows-empty">هیچ دیمەنێکی نوێ نییە.</li> : null}
      </ul>

      <h2 className="sc-h">کتێبخانەی پەسەندکراو · {ku(approved.length)}</h2>
      <ul className="sc-grid">
        {approved.map((s) => (
          <li key={s.id} className="sc-item">
            <Preview s={s} />
            <b>{s.place_ckb}</b>
            <small>{s.video_url ? (s.last_posted_at ? "بڵاوکراوەتەوە" : "ئامادەیە") : "ڤیدیۆکەی دروست دەکرێت…"}{s.music ? <> · <span dir="ltr">♪ {s.music}</span></> : null}</small>
            <form action={setScenery}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="status" value="rejected" />
              <Submit className="btn small ghost" busy="…">لابردن</Submit>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
