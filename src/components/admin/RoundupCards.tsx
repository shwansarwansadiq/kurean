/* The daily round-up's own slides (Shwan, 6 Nov), at real size like SocialCards: the cover lists the day's headlines
   as a numbered tracklist (the site's "album" idea), the end slide sends people to kurean.news. 1080×1350 or ×1920. */
import { Bidi } from "@/components/Bidi";
import { Mark, Sun } from "@/components/Logo";
import { CATEGORY_META, ku } from "@/lib/site";
import type { RoundupStory } from "@/lib/roundup";
import "./social.css";

export function RoundupCover({ dateLabel, stories, format }: { dateLabel: string; stories: RoundupStory[]; format: "feed" | "story" }) {
  const h = format === "feed" ? 1350 : 1920;
  const dense = stories.length > 5;
  return (
    <div className={`sc rc rc-${format}${dense ? " rc-dense" : ""}`} id="card" style={{ height: h }}>
      <Sun className="cc-sun" />
      <div className="cc-in">
        <div className="cc-top">
          <span className="sc-logo" dir="ltr">
            <Mark size={70} ink="#fff" />
            <span>kur<i>ean</i></span>
          </span>
          <span className="cc-chip">هەواڵەکانی ڕۆژ</span>
        </div>
        <h3 className="rc-title">هەواڵەکانی ئەمڕۆی کۆریا</h3>
        <p className="cc-sub">
          {dateLabel} · {ku(stories.length)} هەواڵ
        </p>
        <ol className="rc-list">
          {stories.map((s, i) => (
            <li key={s.id} style={{ ["--cat" as string]: CATEGORY_META[s.category].colour }}>
              <span className="rc-n">{ku(i + 1)}</span>
              <span className="rc-h">
                <small>{CATEGORY_META[s.category].label}</small>
                <b>
                  <Bidi text={s.card_headline} />
                </b>
              </span>
            </li>
          ))}
        </ol>
        <div className="cc-foot rc-foot">
          {format === "feed" ? (
            <span className="sc-more">
              ڕایبکێشە بۆ هەموویان <span aria-hidden="true">←</span>
            </span>
          ) : (
            <span className="sc-more">هەموو هەواڵەکان لە</span>
          )}
          <span dir="ltr" className="sc-link">kurean.news</span>
        </div>
      </div>
    </div>
  );
}

export function RoundupEnd({ format }: { format: "feed" | "story" }) {
  const h = format === "feed" ? 1350 : 1920;
  return (
    <div className={`sc re re-${format}`} id="card" style={{ height: h }}>
      <Sun className="re-sun" />
      <div className="re-in">
        <span className="re-logo" dir="ltr">
          <Mark size={190} ink="#fff" />
          <span>kur<i>ean</i></span>
        </span>
        <p className="re-line">هەموو ڕۆژێک هەواڵی کۆریا بە کوردی</p>
        <p className="re-cats">کەی-پۆپ · دراما و فیلم · کولتوور · هەواڵی کۆریا</p>
        <span dir="ltr" className="sc-link re-link">kurean.news</span>
        <p className="re-follow">
          <bdi className="lat" dir="ltr">@kurean.news</bdi> فۆڵۆ بکە بۆ هەواڵی ئەمڕۆ
        </p>
      </div>
    </div>
  );
}
