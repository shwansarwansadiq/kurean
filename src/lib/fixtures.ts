/* Local preview data (KUREAN_FIXTURES=1, never in production). Sample wording, not real stories. */
import type { AdminStory } from "./admin-data";

export const fixturesOn = () => process.env.KUREAN_FIXTURES === "1" && process.env.NODE_ENV !== "production";

const base = {
  caption_instagram: "کەپشن 💜",
  caption_facebook: "کەپشن",
  caption_tiktok: "کەپشن",
  hashtags: ["#kpop"],
  needs_second_source: false,
  status: "published",
  platforms: ["website", "instagram"],
  sticker_done: false,
  edited_at: null,
  image_source: null,
  image_license: "source",
  raw_items: { score_reason: "kpop · ok" },
};
const body =
  "یەکەم تیزەری درامای «Nine to Six» بڵاوکرایەوە و هەواداران ئێستا دەتوانن یەکەم دیمەنەکانی ببینن.\n\nبەپێی سەرچاوەکان، یەکەم ئەڵقە چوارشەممە ٢٥ی تشرینی دووەم، کاتژمێر ٩ی شەو بە کاتی کۆریا پەخش دەکرێت، واتە ٣ی پاشنیوەڕۆ بە کاتی هەولێر.\n\nزنجیرەکە یەکێکە لەو درامایانەی ئەم وەرزە زۆرترین چاوەڕوانی لەسەرە.";

export const FIXTURES: AdminStory[] = [
  { ...base, id: 4, category: "kpop", headline: "خەڵاتەکانی MAMA 2026 گەورەتر دەبنەوە", card_headline: "MAMA 2026 گەورەتر دەبێتەوە", body, key_points: ["ئاهەنگی ئەمساڵ فراوانتر دەکرێت.", "ڕێکەوت و شوێن دواتر ڕادەگەیەندرێت.", "سەرچاوە: Korea Herald"], source_name: "Korea Herald", source_url: "https://koreaherald.com/x", sources: [{ name: "Korea Herald", url: "https://koreaherald.com/x", trust: 3 }], image_url: "/_dev/a.jpg", image_credit: "Korea Herald", published_at: "2026-10-30T07:00:00Z", created_at: "2026-10-30T06:00:00Z" },
  { ...base, id: 7, category: "kdrama_film", headline: "تیزەری درامای «Nine to Six» بڵاوکرایەوە", card_headline: "تیزەری «Nine to Six» بڵاوکرایەوە", body, key_points: ["تیزەری یەکەم بڵاوکرایەوە.", "پەخشی یەکەم: چوارشەممە ٢٥ی تشرینی دووەم.", "٩ی شەو لە کۆریا، ٣ی پاشنیوەڕۆ لە هەولێر."], source_name: "SBS Star", source_url: "https://sbsstar.net/x", sources: [{ name: "SBS Star", url: "https://sbsstar.net/x", trust: 3 }, { name: "Soompi", url: "https://soompi.com/x", trust: 2 }], image_url: "/_dev/b.jpg", image_credit: "SBS Star", published_at: "2026-10-30T06:00:00Z", created_at: "2026-10-30T05:00:00Z" },
  { ...base, id: 6, category: "kdrama_film", headline: "Claudia Kim دەچێتە ناو درامای «Sacred Jewel»", card_headline: "Claudia Kim لە «Sacred Jewel»", body, key_points: ["ڕۆڵێکی سەرەکی وەردەگرێت."], source_name: "Soompi", source_url: "https://soompi.com/y", sources: [{ name: "Soompi", url: "https://soompi.com/y", trust: 2 }], image_url: null, image_credit: null, published_at: "2026-10-30T05:00:00Z", created_at: "2026-10-30T04:00:00Z" },
  { ...base, id: 5, category: "korea_news", headline: "ئەکتەر Choi Bool-am لە تەمەنی ٨٧ ساڵیدا کۆچی دوایی کرد", card_headline: "Choi Bool-am کۆچی دوایی کرد", body, key_points: ["هەواڵەکە لەلایەن بنەماڵەکەیەوە پشتڕاستکرایەوە."], source_name: "Yonhap News", source_url: "https://yna.co.kr/x", sources: [{ name: "Korea Herald", url: "https://koreaherald.com/y", trust: 3 }, { name: "Yonhap News", url: "https://yna.co.kr/x", trust: 3 }, { name: "Soompi", url: "https://soompi.com/z", trust: 2 }], image_url: "/_dev/c.jpg", image_credit: "Yonhap News", published_at: "2026-10-30T04:00:00Z", created_at: "2026-10-30T03:00:00Z", raw_items: { score_reason: "korea_news · sensitive · death" } },
];
