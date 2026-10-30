/* eslint-disable @next/next/no-img-element */
import { Bidi } from "@/components/Bidi";
import { Mark, Sun } from "@/components/Logo";
import type { AdminStory } from "@/lib/admin-data";
import { CATEGORY_META, ku } from "@/lib/site";
import type { ChartTopItem } from "@/lib/chart-story";
import "./social.css";

/**
 * The social designs at their real pixel size (1080 wide), scaled down to preview.
 * Phase 5 exports these same layouts as images for the feed post and the story.
 */
type CardStory = Pick<AdminStory, "id" | "category" | "card_headline" | "image_url" | "image_credit"> & {
  kind?: string | null;
  chart_week?: string | null;
  chart_top?: ChartTopItem[] | null;
};

function Move({ m }: { m: ChartTopItem }) {
  if (m.move === "new") return <span className="cc-mv new">نوێ</span>;
  if (m.move === "same") return <span className="cc-mv same"><svg viewBox="0 0 12 12"><path d="M3 6h6" /></svg></span>;
  return (
    <span className={`cc-mv ${m.move}`}>
      <svg viewBox="0 0 12 12"><path d={m.move === "up" ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"} /></svg>
      {ku(m.change)}
    </span>
  );
}

/** The weekly top 10 as a feed post or story: number one on a berry band, 2-10 as a tracklist. */
function ChartCard({ story, format, h }: { story: CardStory; format: "feed" | "story"; h: number }) {
  const top = story.chart_top ?? [];
  const [one, ...rest] = top;
  const week = Number(/-(\d+)$/.exec(story.chart_week ?? "")?.[1] ?? 0);
  return (
    <div className={`sc cc cc-${format}`} id="card" style={{ height: h }}>
      <Sun className="cc-sun" />
      <div className="cc-in">
        <div className="cc-top">
          <span className="sc-logo" dir="ltr">
            <Mark size={70} ink="#fff" />
            <span>kur<i>ean</i></span>
          </span>
          <span className="cc-chip">ڕیزبەندیی هەفتە</span>
        </div>
        <h3 className="cc-title">١٠ گۆرانیی سەرەوەی کۆریا</h3>
        <p className="cc-sub">
          {week ? <>هەفتەی {ku(week)} · </> : null}
          <span className="lat">Circle Chart</span>
        </p>
        {one ? (
          <div className="cc-one">
            <span className="cc-one-n">{ku(1)}</span>
            <span className="cc-one-t">
              <b className="lat" dir="ltr">{one.title}</b>
              <span>
                <bdi className="lat">{one.artist}</bdi>
                {one.artist_ckb ? <> · {one.artist_ckb}</> : null}
              </span>
            </span>
            <Move m={one} />
          </div>
        ) : null}
        <ol className="cc-list">
          {rest.map((m) => (
            <li key={m.rank}>
              <span className="cc-n">{ku(m.rank)}</span>
              <span className="cc-t">
                <b className="lat" dir="ltr">{m.title}</b>
                <bdi className="lat">{m.artist}</bdi>
              </span>
              <Move m={m} />
            </li>
          ))}
        </ol>
        <div className="cc-foot">
          <span className="sc-more">هەموو ١٠٠ گۆرانییەکە ببینە و بیکەرەوە لە</span>
          <span dir="ltr" className="sc-link">kurean.news</span>
        </div>
      </div>
    </div>
  );
}

export function SocialCard({ story, format, full = false }: { story: CardStory; format: "feed" | "story"; full?: boolean }) {
  const meta = CATEGORY_META[story.category];
  const h = format === "feed" ? 1350 : 1920;
  const card = story.kind === "chart" && story.chart_top?.length ? <ChartCard story={story} format={format} h={h} /> : (
      <div className={`sc sc-${format}`} id="card" style={{ height: h, ["--cat" as string]: meta.colour }}>
        <div className="sc-photo">
          {story.image_url ? (
            <img src={story.image_url} alt="" />
          ) : (
            <div className="sc-branded" style={{ background: meta.colour }}>
              <Sun className="sc-sun" />
            </div>
          )}
        </div>
        <div className="sc-top">
          <span className="sc-logo" dir="ltr">
            <Mark size={78} ink="#fff" />
            <span>
              kur<i>ean</i>
            </span>
          </span>
          <span className="sc-chip glass">{meta.label}</span>
        </div>
        <div className="sc-panel glass">
          <h3>
            <Bidi text={story.card_headline} />
          </h3>
          <div className="sc-foot">
            <span className="sc-more">زانیاری زیاتر لە</span>
            <span dir="ltr" className="sc-link">kurean.news</span>
          </div>
        </div>
      </div>
  );
  if (full) return card;
  return (
    <div className="sc-frame" style={{ aspectRatio: `1080 / ${h}` }}>
      {card}
    </div>
  );
}
