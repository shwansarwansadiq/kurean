import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { Bidi } from "@/components/Bidi";
import { socialPosts, storiesByStatus } from "@/lib/admin-data";
import { CATEGORY_META, ku, soraniDate } from "@/lib/site";
import { cutoffOf, getRoundup, hawlerDay, ROUNDUP_HOUR, roundupStories, storiesByIds } from "@/lib/roundup";
import { restoreStory, retrySocial } from "../actions";

/** Today's 21:00 Instagram round-up: which stories are in it and what happened. */
async function RoundupStatus() {
  const day = hawlerDay(new Date());
  const row = await getRoundup(day).catch(() => null);
  const stories = row?.story_ids.length
    ? await storiesByIds(row.story_ids)
    : await roundupStories(day, new Date(Math.min(Date.now(), cutoffOf(day).getTime()))).catch(() => []);
  const state =
    !row || row.status === "collecting"
      ? `کاتژمێر ${ku(ROUNDUP_HOUR)}:٠٠ بڵاودەبێتەوە${row?.video_url ? " · ڤیدیۆکەی ئامادەیە" : ""}`
      : row.status === "empty"
        ? "ئەمڕۆ هیچ هەواڵێک بۆ ئینستاگرام بڵاونەکرایەوە"
        : row.status === "done"
          ? "بڵاوکرایەوە"
          : "بڵاودەکرێتەوە…";
  const results = [row?.carousel_result, row?.story_result, row?.reel_result].filter(Boolean).join(" · ");
  return (
    <section className="roundup-box">
      <h2>
        کۆکراوەی ئەمڕۆ لە ئینستاگرام · {ku(stories.length)} هەواڵ
      </h2>
      <p>
        {state}. کاروسێلێکی وێنە و ڤیدیۆیەک (هەردووکیان لە ستۆریشدا) لە هەواڵەکانی ئەمڕۆ کە بە ئینستاگرامەوە بڵاوت کردوونەتەوە.
      </p>
      {stories.length ? (
        <ol>
          {stories.map((s) => (
            <li key={s.id}>
              <Bidi text={s.card_headline} />
            </li>
          ))}
        </ol>
      ) : null}
      {results ? (
        <p className="social" dir="ltr">
          {results}
        </p>
      ) : null}
    </section>
  );
}

export default async function Published() {
  const [published, skipped] = await Promise.all([storiesByStatus("published"), storiesByStatus("skipped", 20)]);
  const posts = await socialPosts(published.map((s) => s.id));
  return (
    <AdminShell active="published" title="بڵاوکراوەکان">
      <RoundupStatus />
      <ul className="rows">
        {published.map((s) => (
          <li key={s.id}>
            <span className="dot" style={{ background: CATEGORY_META[s.category].colour }} />
            <div className="row-main">
              <Link href={`/news/${s.id}`} target="_blank">
                <Bidi text={s.headline} />
              </Link>
              <small>
                {soraniDate(s.published_at ?? s.created_at)} · <bdi dir="ltr">kurean.news/n/{s.id}</bdi>
              </small>
              <div className="pub-acts">
                <Link href={`/admin/story/${s.id}`} className="btn small">دەستکاری</Link>
                {s.video_url ? (
                  <a className="btn small" href={`${s.video_url}?download=kurean-${s.id}.mp4`}>دابەزاندنی ڤیدیۆ</a>
                ) : (
                  <span className="pub-wait">ڤیدیۆکە ئامادە دەکرێت…</span>
                )}
              </div>
              {posts.get(s.id)?.length ? (
                <div className="social" dir="ltr">
                  {posts.get(s.id)!.map((p) => (
                    <span key={p.platform + p.kind} className={p.ok ? "sp ok" : "sp fail"} title={p.error ?? undefined}>
                      {p.ok ? "✓" : "✕"} {p.platform} {p.kind}
                    </span>
                  ))}
                </div>
              ) : null}
              {posts.get(s.id)?.some((p) => !p.ok) ? (
                <>
                  <p className="sp-error">{posts.get(s.id)!.find((p) => !p.ok)?.error}</p>
                  <form action={retrySocial}>
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="platforms"
                      value={[...new Set(posts.get(s.id)!.filter((p) => !p.ok).map((p) => p.platform))].join(",")}
                    />
                    <input type="hidden" name="kinds" value={[...new Set(posts.get(s.id)!.filter((p) => !p.ok).map((p) => p.kind))].join(",")} />
                    <Submit className="btn small" busy="دەنێردرێتەوە…">دووبارە ناردنەوە بۆ سۆشیاڵ میدیا</Submit>
                  </form>
                </>
              ) : null}
            </div>
            <form action={restoreStory}>
              <input type="hidden" name="id" value={s.id} />
              <Submit className="btn ghost small" busy="…">لابردن لە ماڵپەڕ</Submit>
            </form>
          </li>
        ))}
        {!published.length ? <li className="rows-empty">هێشتا هیچ هەواڵێک بڵاونەکراوەتەوە.</li> : null}
      </ul>
      <h2 className="adm-h2">پەڕێنراوەکان ({ku(skipped.length)})</h2>
      <ul className="rows muted">
        {skipped.map((s) => (
          <li key={s.id}>
            <span className="dot" style={{ background: CATEGORY_META[s.category].colour }} />
            <div className="row-main">
              <span>
                #{ku(s.id)} <Bidi text={s.headline} />
              </span>
            </div>
            <form action={restoreStory}>
              <input type="hidden" name="id" value={s.id} />
              <Submit className="btn ghost small" busy="…">گەڕاندنەوە بۆ چاوەڕوان</Submit>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
