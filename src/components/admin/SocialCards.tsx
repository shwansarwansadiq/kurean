/* eslint-disable @next/next/no-img-element */
import { Bidi } from "@/components/Bidi";
import { Mark, Sun } from "@/components/Logo";
import type { AdminStory } from "@/lib/admin-data";
import { CATEGORY_META } from "@/lib/site";

/**
 * The social designs at their real pixel size (1080 wide), scaled down to preview.
 * Phase 5 exports these same layouts as images for the feed post and the story.
 */
export function SocialCard({ story, format }: { story: AdminStory; format: "feed" | "story" }) {
  const meta = CATEGORY_META[story.category];
  const h = format === "feed" ? 1350 : 1920;
  return (
    <div className="sc-frame" style={{ aspectRatio: `1080 / ${h}` }}>
      <div className={`sc sc-${format}`} style={{ height: h, ["--cat" as string]: meta.colour }}>
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
            <span dir="ltr" className="sc-link">kurean.news/n/{story.id}</span>
            {story.image_credit ? (
              <span className="sc-credit">
                وێنە: <bdi>{story.image_credit}</bdi>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
