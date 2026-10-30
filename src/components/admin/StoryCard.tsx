/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { findPhoto, publishStory, regenerateStory, scheduleStory, skipStory } from "@/app/admin/actions";
import { Bidi } from "@/components/Bidi";
import { isSensitive, photoStatus, PLATFORM_LABEL, PLATFORMS, type AdminStory } from "@/lib/admin-data";
import { CATEGORY_META, ku, soraniDate } from "@/lib/site";
import { hawlerTime, toHawlerInput } from "@/lib/schedule";
import { Submit } from "./Submit";

/** `nextSlot`: the next free posting time, shown on the schedule button. */
export function StoryCard({ story, nextSlot }: { story: AdminStory; nextSlot: Date }) {
  const meta = CATEGORY_META[story.category];
  const sources = story.sources?.length ? story.sources : [{ name: story.source_name, url: story.source_url, trust: undefined }];
  const sensitive = isSensitive(story);
  const photo = photoStatus(story);
  return (
    <article className="card" aria-labelledby={`h-${story.id}`}>
      <div className="card-media">
        {story.image_url ? (
          <img src={story.image_url} alt="" loading="lazy" />
        ) : (
          <div className="card-noimg" style={{ background: meta.colour }}>
            کارتی براند
          </div>
        )}
        <span className="pill glass">{meta.label}</span>
        {story.image_credit ? <span className="card-credit glass">وێنە: <bdi>{story.image_credit}</bdi></span> : null}
      </div>
      <div className="card-in">
        <div className={`photo-status ${photo.tone}`}>
          <span>{photo.label}</span>
          {photo.tone !== "ok" && story.image_license !== "removed" ? (
            <form action={findPhoto}>
              <input type="hidden" name="id" value={story.id} />
              <Submit className="btn small" busy="دەگەڕێت…">وێنەی ئازاد بدۆزەوە</Submit>
            </form>
          ) : null}
        </div>
        <div className="card-top">
          <span>
            #{ku(story.id)} · {soraniDate(story.created_at, false)}
          </span>
          <span>{ku(sources.length)} سەرچاوە</span>
        </div>
        <h2 id={`h-${story.id}`}>
          <Bidi text={story.headline} />
        </h2>
        <ul className="card-points">
          {story.key_points.map((k, i) => (
            <li key={i}>
              <Bidi text={k} />
            </li>
          ))}
        </ul>
        <div className="src" dir="ltr">
          {sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener">
              {s.name}
              {s.trust ? <i>{s.trust}</i> : null}
            </a>
          ))}
        </div>
        {sensitive ? <p className="flag">بابەتی هەستیار: تەنها ئەوەی پشتڕاستکراوەتەوە نووسراوە. پێش بڵاوکردنەوە بیخوێنەوە.</p> : null}
        {story.needs_second_source ? <p className="flag warn">تەنها یەک سەرچاوەی لاواز. باشترە چاوەڕێی سەرچاوەی دووەم بکەیت.</p> : null}

        <form action={publishStory} className="pub-form">
          <input type="hidden" name="id" value={story.id} />
          <fieldset className="plat">
            <legend>بڵاوکردنەوە لە</legend>
            {PLATFORMS.map((p) => (
              <label key={p} className={p === "website" ? "locked" : undefined}>
                <input type="checkbox" name={`p_${p}`} defaultChecked={p !== "tiktok"} disabled={p === "website" || p === "tiktok"} />
                <span>{PLATFORM_LABEL[p]}{p === "tiktok" ? " (بەم زووانە)" : ""}</span>
              </label>
            ))}
          </fieldset>
          <div className="when">
            <Submit className="btn pub" busy="بڵاودەکرێتەوە… (تا یەک خولەک)" name="mode" value="now">
              ئێستا بڵاوی بکەوە
            </Submit>
            <Submit className="btn sched" busy="دەخرێتە خشتەوە…" formAction={scheduleStory} name="mode" value="next">
              بیخە خشتەوە · <span className="lat">{ku(hawlerTime(nextSlot))}</span>
            </Submit>
          </div>
          <details className="when-at">
            <summary>کاتێکی تر هەڵبژێرە</summary>
            <div>
              <input type="datetime-local" name="at" defaultValue={toHawlerInput(nextSlot)} step={300} aria-label="کاتی بڵاوکردنەوە (کاتی هەولێر)" />
              <Submit className="btn small" busy="…" formAction={scheduleStory} name="mode" value="at">
                لەم کاتەدا
              </Submit>
            </div>
          </details>
        </form>
        <div className="acts">
          <Link href={`/admin/story/${story.id}`} className="btn">
            دەستکاری
          </Link>
          <form action={regenerateStory}>
            <input type="hidden" name="id" value={story.id} />
            <Submit busy="دەنووسرێتەوە…">نووسینەوە</Submit>
          </form>
          <form action={skipStory}>
            <input type="hidden" name="id" value={story.id} />
            <Submit className="btn ghost" busy="…">
              پەڕاندن
            </Submit>
          </form>
        </div>
      </div>
    </article>
  );
}
