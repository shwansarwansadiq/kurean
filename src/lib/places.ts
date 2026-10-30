/**
 * Places in Korea for the scenery stories, with their Sorani names (written by hand, not by a model).
 * `must`: words that must appear in the Pexels description or address, so a photo of somewhere else is not used.
 */
export type Place = { en: string; ckb: string; query: string; must: string[] };

export const PLACES: Place[] = [
  { en: "Gyeongbokgung Palace, Seoul", ckb: "کۆشکی گیۆنگبۆکگونگ، سیئۆڵ", query: "Gyeongbokgung palace", must: ["gyeongbokgung"] },
  { en: "Changdeokgung Palace, Seoul", ckb: "کۆشکی چانگدۆکگونگ، سیئۆڵ", query: "Changdeokgung", must: ["changdeokgung"] },
  { en: "Bukchon Hanok Village, Seoul", ckb: "گوندی هانۆکی بوکچۆن، سیئۆڵ", query: "Bukchon hanok village", must: ["bukchon", "hanok"] },
  { en: "N Seoul Tower", ckb: "تاوەری ئێن سیئۆڵ", query: "N Seoul Tower Namsan", must: ["namsan", "seoul tower"] },
  { en: "Han River, Seoul", ckb: "ڕووباری هان، سیئۆڵ", query: "Han river Seoul", must: ["han river", "hangang"] },
  { en: "Seoul at night", ckb: "سیئۆڵ بە شەو", query: "Seoul night city", must: ["seoul"] },
  { en: "Jeju Island", ckb: "دوورگەی جێجو", query: "Jeju island", must: ["jeju"] },
  { en: "Seongsan Ilchulbong, Jeju", ckb: "سۆنگسان ئیلچولبۆنگ، جێجو", query: "Seongsan Ilchulbong", must: ["seongsan", "ilchulbong"] },
  { en: "Hallasan, Jeju", ckb: "چیای هالاسان، جێجو", query: "Hallasan mountain", must: ["hallasan"] },
  { en: "Seoraksan", ckb: "چیای سۆراکسان", query: "Seoraksan mountain", must: ["seoraksan", "seorak"] },
  { en: "Gamcheon Culture Village, Busan", ckb: "گوندی کولتووریی گامچۆن، بوسان", query: "Gamcheon culture village Busan", must: ["gamcheon"] },
  { en: "Haeundae Beach, Busan", ckb: "کەناری هەئوندێ، بوسان", query: "Haeundae beach Busan", must: ["haeundae"] },
  { en: "Gwangan Bridge, Busan", ckb: "پردی گوانگان، بوسان", query: "Gwangan bridge Busan", must: ["gwangan"] },
  { en: "Busan", ckb: "بوسان", query: "Busan Korea", must: ["busan"] },
  { en: "Bulguksa Temple, Gyeongju", ckb: "پەرستگای بولگوکسا، گیۆنگجو", query: "Bulguksa temple", must: ["bulguksa"] },
  { en: "Gyeongju", ckb: "گیۆنگجو", query: "Gyeongju Korea", must: ["gyeongju"] },
  { en: "Nami Island", ckb: "دوورگەی نامی", query: "Nami island Korea", must: ["nami"] },
  { en: "Cherry blossoms in Korea", ckb: "شکۆفەی گێلاس لە کۆریا", query: "cherry blossom Korea", must: ["korea", "seoul", "busan", "jinhae", "gyeongju"] },
  { en: "Boseong green tea fields", ckb: "کێڵگەکانی چای سەوزی بۆسۆنگ", query: "Boseong green tea", must: ["boseong"] },
  { en: "Korean temple", ckb: "پەرستگایەکی کۆری", query: "Korean temple", must: ["korea"] },
];

export const MUSIC = ["han-river", "jeju-breeze", "seoul-night", "blossom"] as const;
