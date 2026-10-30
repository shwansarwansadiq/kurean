import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/StoryParts";

export const metadata = { title: "چۆن دەپێوین · How we measure · کوریەن" };

const METRICS: [string, string, string][] = [
  ["خوێنەری جیاواز", "Unique visitors", "Distinct browsers in the period. Without consent a browser is counted once per day (a salted hash of the day, network address and browser that cannot be reversed; the address is never stored). With consent a random ID kept in the browser lets us recognise return visits."],
  ["بینینی پەڕە", "Pageviews", "Every page opened on kurean.news by a person. Bots, crawlers, link previews and our own editor's visits are excluded."],
  ["سەردان", "Sessions", "Pages read in one browser tab without closing it."],
  ["پەڕە بۆ هەر سەردانێک", "Pages per session", "Pageviews ÷ sessions."],
  ["تەنها یەک پەڕە", "Bounce rate", "Sessions with exactly one page ÷ all sessions."],
  ["کاتی خوێندنەوە", "Engaged time", "Time a page is visible and the reader has scrolled, tapped or typed within the last 30 seconds. Background tabs and idle time are not counted. Shown as the average per page."],
  ["قووڵی سکرۆڵ", "Scroll depth", "How far down an article a reader scrolled (deepest point, 0–100%). We report the share of article views that reached 25, 50, 75% and the end."],
  ["گەڕاوەکان", "Returning visitors", "Of visitors who allowed counting, those first seen before the period began."],
  ["سەرچاوە", "Traffic source", "UTM tags first, then the referring site, then the in-app browser (Instagram, Facebook, TikTok) the page was opened in."],
  ["شوێن", "Country and city", "From the network location provided by our host at the time of the visit. The address itself is not stored."],
  ["ئامێر", "Device, OS, browser", "Read from the browser's User-Agent."],
];

export default function Measure() {
  return (
    <>
      <Masthead />
      <main id="main" className="article">
        <header className="art-head">
          <h1>چۆن دەپێوین</h1>
          <p className="byline" dir="ltr" lang="en">How we measure</p>
        </header>
        <div className="art-body">
          <p>کوریەن خوێنەرانی خۆی بە ئامرازێکی خۆی دەژمێرێت، بێ کوکی و بێ هەڵگرتنی ناونیشانی IP. هیچ داتایەک نافرۆشین و بە کەسی تر نادەین.</p>
          <p dir="ltr" lang="en" style={{ fontFamily: "var(--latin)", fontSize: 15 }}>
            Kurean counts its readers with its own first-party tool. No cookies, no third-party trackers, no stored IP addresses.
            All times are Asia/Baghdad. Days still in progress, and days before counting began, are labelled as incomplete.
          </p>
        </div>
        <dl className="measure">
          {METRICS.map(([ku, en, def]) => (
            <div key={en}>
              <dt>{ku} <bdi className="lat">· {en}</bdi></dt>
              <dd dir="ltr" lang="en">{def}</dd>
            </div>
          ))}
        </dl>
      </main>
      <SiteFooter />
    </>
  );
}
