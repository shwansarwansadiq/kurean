/* eslint-disable @next/next/no-img-element -- photos come from our storage bucket at their posted size */
import Link from "next/link";
import { CATEGORY_META, ku, readingMinutes, type Story } from "@/lib/site";
import { Bidi } from "./Bidi";
import { Clocks } from "./Clocks";
import { KoreaChart } from "./KoreaChart";
import { latestChart } from "@/lib/chart";
import { Sun } from "./Logo";

export const storyHref = (s: Pick<Story, "id">) => `/news/${s.id}`;

/** The source photo with its credit, or a branded card in the category colour when there is none. */
export function Photo({ story, priority = false, className = "" }: { story: Story; priority?: boolean; className?: string }) {
  const meta = CATEGORY_META[story.category];
  if (story.image_url) {
    return (
      <figure className={`photo ${className}`}>
        <img
          src={story.image_url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
        {story.image_credit ? <figcaption className="glass credit">وێنە: <bdi className="lat">{story.image_credit}</bdi></figcaption> : null}
      </figure>
    );
  }
  return (
    <div className={`photo branded ${className}`} style={{ background: meta.colour }} aria-hidden="true">
      <Sun className="branded-sun" />
      <b>
        <Bidi text={story.card_headline} />
      </b>
    </div>
  );
}

export function CategoryChip({ story, glass = false }: { story: Pick<Story, "category">; glass?: boolean }) {
  const meta = CATEGORY_META[story.category];
  return (
    <span className={glass ? "chip glass" : "chip"}>
      <i style={{ background: meta.colour }} />
      {meta.label}
    </span>
  );
}

/** The day's stories as an album tracklist: number, title, category, reading time. */
export function Tracklist({ stories, start = 1 }: { stories: Story[]; start?: number }) {
  return (
    <ol className="tracks">
      {stories.map((s, i) => (
        <li key={s.id}>
          <Link href={storyHref(s)} className="track">
            <span className="n">{String(i + start).padStart(2, "0")}</span>
            <span className="t">
              <Bidi text={s.headline} />
              <span className="c">
                <i style={{ background: CATEGORY_META[s.category].colour }} />
                {CATEGORY_META[s.category].label}
              </span>
            </span>
            {s.image_url ? (
              <img className="thumb" src={s.image_url} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="thumb branded" style={{ background: CATEGORY_META[s.category].colour }}>
                <Sun />
              </span>
            )}
            <span className="d">{ku(readingMinutes(s.body))} خولەک</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export async function SiteFooter() {
  const chart = await latestChart();
  return (
    <footer className="site-foot">
      <Clocks />
      <KoreaChart week={chart} />
      <div className="follow">
        <p>هەموو ڕۆژێک هەواڵی کۆری بە کوردی. شوێنمان بکەوە:</p>
        <div className="handles" dir="ltr">
          <a href="https://www.instagram.com/kurean.news" className="handle" rel="noopener">Instagram</a>
          <a href="https://www.tiktok.com/@kurean.news" className="handle" rel="noopener">TikTok</a>
          <a href="https://www.facebook.com/kurean.news" className="handle" rel="noopener">Facebook</a>
        </div>
        <span className="handle-name" dir="ltr">@kurean.news</span>
        <small>هەموو هەواڵێک سەرچاوەکەی لەگەڵدایە و پێش بڵاوکردنەوە دەخوێنرێتەوە. <a href="/privacy">تایبەتمەندی</a></small>
      </div>
    </footer>
  );
}
