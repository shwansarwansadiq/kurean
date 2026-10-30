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
  photo_options: [{ url: "/_dev/b.jpg", page: "https://example.com", credit: "Soompi" }, { url: "/_dev/c.jpg", page: "https://example.com", credit: "Soompi" }],
  gallery: [],
  raw_items: { score_reason: "kpop · ok" },
};
const body =
  "یەکەم تیزەری درامای «Nine to Six» بڵاوکرایەوە و هەواداران ئێستا دەتوانن یەکەم دیمەنەکانی ببینن.\n\nبەپێی سەرچاوەکان، یەکەم ئەڵقە چوارشەممە ٢٥ی تشرینی دووەم، کاتژمێر ٩ی شەو بە کاتی کۆریا پەخش دەکرێت، واتە ٣ی پاشنیوەڕۆ بە کاتی هەولێر.\n\nزنجیرەکە یەکێکە لەو درامایانەی ئەم وەرزە زۆرترین چاوەڕوانی لەسەرە.";

export const FIXTURES: AdminStory[] = [
  { ...base, id: 4, category: "kpop", headline: "خەڵاتەکانی MAMA 2026 گەورەتر دەبنەوە", card_headline: "MAMA 2026 گەورەتر دەبێتەوە", body, key_points: ["ئاهەنگی ئەمساڵ فراوانتر دەکرێت.", "ڕێکەوت و شوێن دواتر ڕادەگەیەندرێت.", "سەرچاوە: Korea Herald"], source_name: "Korea Herald", source_url: "https://koreaherald.com/x", sources: [{ name: "Korea Herald", url: "https://koreaherald.com/x", trust: 3 }], image_url: "/_dev/a.jpg", image_credit: "Korea Herald", published_at: "2026-10-30T07:00:00Z", created_at: "2026-10-30T06:00:00Z" },
  { ...base, id: 7, category: "kdrama_film", headline: "تیزەری درامای «Nine to Six» بڵاوکرایەوە", card_headline: "تیزەری «Nine to Six» بڵاوکرایەوە", body, key_points: ["تیزەری یەکەم بڵاوکرایەوە.", "پەخشی یەکەم: چوارشەممە ٢٥ی تشرینی دووەم.", "٩ی شەو لە کۆریا، ٣ی پاشنیوەڕۆ لە هەولێر."], source_name: "SBS Star", source_url: "https://sbsstar.net/x", sources: [{ name: "SBS Star", url: "https://sbsstar.net/x", trust: 3 }, { name: "Soompi", url: "https://soompi.com/x", trust: 2 }], image_url: "/_dev/b.jpg", image_credit: "SBS Star", published_at: "2026-10-30T06:00:00Z", created_at: "2026-10-30T05:00:00Z" },
  { ...base, id: 6, category: "kdrama_film", headline: "Claudia Kim دەچێتە ناو درامای «Sacred Jewel»", card_headline: "Claudia Kim لە «Sacred Jewel»", body, key_points: ["ڕۆڵێکی سەرەکی وەردەگرێت."], source_name: "Soompi", source_url: "https://soompi.com/y", sources: [{ name: "Soompi", url: "https://soompi.com/y", trust: 2 }], image_url: null, image_credit: null, published_at: "2026-10-30T05:00:00Z", created_at: "2026-10-30T04:00:00Z" },
  { ...base, id: 5, category: "korea_news", headline: "ئەکتەر Choi Bool-am لە تەمەنی ٨٧ ساڵیدا کۆچی دوایی کرد", card_headline: "Choi Bool-am کۆچی دوایی کرد", body, key_points: ["هەواڵەکە لەلایەن بنەماڵەکەیەوە پشتڕاستکرایەوە."], source_name: "Yonhap News", source_url: "https://yna.co.kr/x", sources: [{ name: "Korea Herald", url: "https://koreaherald.com/y", trust: 3 }, { name: "Yonhap News", url: "https://yna.co.kr/x", trust: 3 }, { name: "Soompi", url: "https://soompi.com/z", trust: 2 }], image_url: "/_dev/c.jpg", image_credit: "Yonhap News", published_at: "2026-10-30T04:00:00Z", created_at: "2026-10-30T03:00:00Z", raw_items: { score_reason: "korea_news · sensitive · death" } },
  {
    ...base, id: 9, category: "kpop", kind: "chart", chart_week: "circle-digital-2026-43",
    headline: "ڕیزبەندیی هەفتانەی کۆریا: «NEON»ی A2O لە پلەی یەکەم دەمێنێتەوە", card_headline: "١٠ گۆرانیی سەرەوەی کۆریا", body,
    key_points: ["«NEON» بۆ هەفتەی دووەم یەکەمە.", "SOYEON بەرز بووەوە بۆ پلەی دووەم.", "IVE بە گۆرانییەکی نوێ هاتە ناو ١٠ی سەرەوە."],
    source_name: "Circle Chart", source_url: "https://circlechart.kr", sources: [{ name: "Circle Chart", url: "https://circlechart.kr", trust: 3 }],
    image_url: null, image_credit: null, published_at: "2026-10-30T08:00:00Z", created_at: "2026-10-30T08:00:00Z",
    chart_top: [
      { rank: 1, title: "NEON", artist: "A2O, A2O LITE", artist_ckb: "ئەی تو ئۆ", move: "same", change: 0 },
      { rank: 2, title: "Toesahalgeyeo (Narr. Gian84)", artist: "SOYEON", artist_ckb: "سۆیۆن", move: "up", change: 1 },
      { rank: 3, title: "Kkumkkudeon Eorireun Doeeotnayo?", artist: "Meomureu", artist_ckb: "مەمورو", move: "down", change: 1 },
      { rank: 4, title: "LOVE ATTACK", artist: "RESCENE", artist_ckb: "ڕیسین", move: "same", change: 0 },
      { rank: 5, title: "Deja Vu", artist: "RESCENE", artist_ckb: "ڕیسین", move: "up", change: 2 },
      { rank: 6, title: "REDRED", artist: "CORTIS", artist_ckb: "کۆرتیس", move: "down", change: 1 },
      { rank: 7, title: "Gapjagi", artist: "I.O.I", artist_ckb: "ئای ئۆ ئای", move: "down", change: 1 },
      { rank: 8, title: "BAD", artist: "ATEEZ", artist_ckb: "ئەیتیز", move: "up", change: 1 },
      { rank: 9, title: "Pretty Girl", artist: "RESCENE", artist_ckb: "ڕیسین", move: "down", change: 1 },
      { rank: 10, title: "Looks Can Kill", artist: "IVE", artist_ckb: "ئایڤ", move: "new", change: 0 },
    ],
  },
];

/* Local preview of the footer chart: names as Circle Chart writes them (week 43, 2026), Kurdish names sample wording. */
const chartRows: [string, string, number | null, string?, string?, string?, string?][] = [
  ["NEON", "A2O, A2O LITE", 1, "NEON", "", "A2O, A2O LITE", "ئەی تو ئۆ، ئەی تو ئۆ لایت"],
  ["퇴사할게여 (Narr. 기안84)", "소연 (SOYEON)", 3, "Toesahalgeyeo (Narr. Kian84)", "دەستلەکار دەکێشمەوە", "SOYEON", "سۆیۆن"],
  ["꿈꾸던 어른이 되었나요?", "머무르", 2, "Kkumkkudeon Eoreuni Doeeonnayo?", "ئەو گەورەیە بوویت کە خەونت پێوە دەبینی؟", "Meomureu", "مەمورو"],
  ["LOVE ATTACK", "RESCENE (리센느)", 4, "LOVE ATTACK", "", "RESCENE", "ڕیسین"],
  ["Deja Vu", "RESCENE (리센느)", 7, "Deja Vu", "", "RESCENE", "ڕیسین"],
  ["REDRED", "CORTIS (코르티스)", 5, "REDRED", "", "CORTIS", "کۆرتیس"],
  ["갑자기", "아이오아이 (I.O.I)", 6, "Gapjagi", "لەناکاو", "I.O.I", "ئای ئۆ ئای"],
  ["BAD", "ATEEZ (에이티즈)", 9, "BAD", "", "ATEEZ", "ئەیتیز"],
  ["Pretty Girl", "RESCENE (리센느)", 8, "Pretty Girl", "", "RESCENE", "ڕیسین"],
  ["Looks Can Kill", "IVE (아이브)", null, "Looks Can Kill", "", "IVE", "ئایڤ"],
  ["LEMONADE", "aespa", 10, "LEMONADE", "", "aespa", "ئێسپا"],
  ["노스탈지아", "BIG Naughty (서동현)", 13, "Noseutalji-a", "نۆستالجیا", "BIG Naughty", "بیگ نۆتی"],
  ["Drowning", "WOODZ (조승연)", 12, "Drowning", "", "WOODZ", "وودز"],
  ["사랑하게 될 거야", "한로로", 16, "Saranghage Doel Geoya", "خۆشت دەوێم", "Hanroro", "هانرۆرۆ"],
  ["CRASH", "ALLDAY PROJECT", 11, "CRASH", "", "ALLDAY PROJECT", "ئۆڵدەی پرۆجێکت"],
];
export const FIXTURE_CHART = {
  id: "circle-digital-2026-43",
  year: 2026,
  week: 43,
  period: "2026.10.18~2026.10.24",
  fetched_at: "2026-10-30T06:00:00Z",
  entries: Array.from({ length: 100 }, (_, i) => {
    const [title, artist, prev, title_latin, title_ckb, artist_latin, artist_ckb] = chartRows[i % chartRows.length];
    const rank = i + 1;
    const p = i < chartRows.length ? prev : i % 7 === 0 ? null : rank + ((i % 5) - 2);
    return {
      rank,
      prev: p,
      move: (!p ? "new" : p > rank ? "up" : p < rank ? "down" : "same") as "up" | "down" | "same" | "new",
      change: p ? Math.abs(p - rank) : 0,
      id: String(1000 + i),
      title,
      artist,
      cover: i % 4 === 3 ? null : `/_dev/${"abc"[i % 3]}.jpg`,
      title_latin,
      title_ckb: title_ckb || null,
      artist_latin,
      artist_ckb,
      youtube_id: i % 5 === 4 ? null : "M7lc1UVf-VE",
      spotify_id: i % 3 === 2 ? null : "4uLU6hMCjMI75M1A2tKUQC",
    };
  }),
};
