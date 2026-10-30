/** Device, OS, browser and in-app source from a User-Agent string, without a library. */

export const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|telegrambot|embedly|curl|wget|python|node-fetch|axios|go-http|java\/|monitor|uptime|vercel/i;

export function isBot(ua: string | null | undefined): boolean {
  return !ua || BOT.test(ua);
}

export function parseUA(ua: string) {
  const device = /ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|ipod|android/i.test(ua) ? "mobile" : "desktop";
  const os = /iphone|ipad|ipod/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os x|macintosh/i.test(ua)
          ? "macOS"
          : /cros/i.test(ua)
            ? "ChromeOS"
            : /linux/i.test(ua)
              ? "Linux"
              : "other";
  const browser = /instagram/i.test(ua)
    ? "Instagram app"
    : /fban|fbav|fb_iab/i.test(ua)
      ? "Facebook app"
      : /musical_ly|bytedancewebview|tiktok/i.test(ua)
        ? "TikTok app"
        : /edg\//i.test(ua)
          ? "Edge"
          : /opr\/|opera/i.test(ua)
            ? "Opera"
            : /samsungbrowser/i.test(ua)
              ? "Samsung Internet"
              : /firefox|fxios/i.test(ua)
                ? "Firefox"
                : /crios|chrome/i.test(ua)
                  ? "Chrome"
                  : /safari/i.test(ua)
                    ? "Safari"
                    : "other";
  return { device, os, browser };
}

const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|naver|brave)\./i;

/** Where a visit came from: UTM first, then the referrer, then the in-app browser it was opened in. */
export function trafficSource(opts: { utmSource?: string | null; referrerHost?: string | null; ua: string; ownHost: string }): string {
  const u = (opts.utmSource ?? "").toLowerCase();
  if (u) {
    if (/insta|^ig$/.test(u)) return "instagram";
    if (/facebook|^fb$|meta/.test(u)) return "facebook";
    if (/tiktok|^tt$/.test(u)) return "tiktok";
    if (/google|bing|search/.test(u)) return "search";
    return "referral";
  }
  const h = (opts.referrerHost ?? "").toLowerCase().replace(/^www\./, "");
  if (h && h !== opts.ownHost) {
    if (/instagram\.com$/.test(h)) return "instagram";
    if (/facebook\.com$|fb\.me$|fb\.com$/.test(h)) return "facebook";
    if (/tiktok\.com$/.test(h)) return "tiktok";
    if (SEARCH.test(h)) return "search";
    if (/t\.co$|twitter\.com$|x\.com$|telegram|t\.me$|whatsapp|snapchat|threads\.net$|reddit\.com$|youtube\.com$/.test(h)) return "social";
    return "referral";
  }
  // In-app browsers often send no referrer; their User-Agent still says where the visit came from.
  if (/instagram/i.test(opts.ua)) return "instagram";
  if (/fban|fbav|fb_iab/i.test(opts.ua)) return "facebook";
  if (/musical_ly|bytedancewebview|tiktok/i.test(opts.ua)) return "tiktok";
  return "direct";
}
