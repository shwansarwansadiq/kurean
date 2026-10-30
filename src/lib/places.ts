/**
 * Places in Korea for the scenery stories, with their Sorani names (written by hand, not by a model).
 * `must`: words that must appear in the Pexels description or address, so a photo of somewhere else is not used.
 */
export type Place = { en: string; ckb: string; query: string; must: string[] };

/** A wider theme counts only when the description names Korea or one of its cities. */
const KOREA = ["korea", "seoul", "busan", "jeju", "incheon", "gyeongju", "daegu", "gangneung"];

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
  // Wider themes (Shwan, 31 Oct): still only Korea — the description must name Korea or a Korean city.
  { en: "Mountains of Korea", ckb: "چیاکانی کۆریا", query: "Korea mountain", must: KOREA },
  { en: "Autumn in Korea", ckb: "پاییز لە کۆریا", query: "Korea autumn", must: KOREA },
  { en: "Winter in Korea", ckb: "زستان لە کۆریا", query: "Korea snow winter", must: KOREA },
  { en: "Streets of Seoul", ckb: "شەقامەکانی سیئۆڵ", query: "Seoul street", must: ["seoul"] },
  { en: "Seoul from above", ckb: "سیئۆڵ لە سەرەوە", query: "Seoul aerial city", must: ["seoul"] },
  { en: "Korean coast", ckb: "کەناراوەکانی کۆریا", query: "Korea sea coast", must: KOREA },
  { en: "Korean palace", ckb: "کۆشکێکی کۆری", query: "Korea palace", must: KOREA },
  { en: "Hanok houses", ckb: "خانووی هانۆک", query: "hanok", must: ["hanok"] },
  { en: "Korean market", ckb: "بازاڕێکی کۆری", query: "Korea market", must: KOREA },
  { en: "Korea at night", ckb: "کۆریا بە شەو", query: "Korea night", must: KOREA },
];

export const MUSIC = ["han-river", "jeju-breeze", "seoul-night", "blossom"] as const;
