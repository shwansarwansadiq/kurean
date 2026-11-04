import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/StoryParts";

export const metadata = { title: "مەرجەکانی بەکارهێنان · کوریەن" };

/** Terms of use (Sorani and English); also the terms link for the KUREAN apps on Meta and TikTok. */
export default function Terms() {
  return (
    <>
      <Masthead />
      <main id="main" className="article">
        <header className="art-head">
          <h1>مەرجەکانی بەکارهێنان</h1>
        </header>
        <div className="art-body">
          <p>کوریەن (kurean.news) ماڵپەڕێکی هەواڵە بە کوردیی سۆرانی دەربارەی کولتووری کۆریا. خوێندنەوەی هەواڵەکان بێبەرامبەرە و پێویستی بە هەژمار نییە.</p>
          <p>هەواڵەکان لە سەرچاوە ناوبراوەکانەوە نووسراونەتەوە و هەر هەواڵێک بەستەری سەرچاوەکەی لەگەڵە. هەوڵ دەدەین ڕاست و ورد بین؛ ئەگەر هەڵەیەکت بینی، پێمان بڵێ.</p>
          <p>وێنە و ناوەڕۆکی کەسانی تر هی خاوەنەکانیانن و ناویان دەهێنرێت. ئەگەر خاوەنی ناوەڕۆکێکیت و دەتەوێت لابرێت، نامە بنێرە بۆ <bdi className="lat">@kurean.news</bdi>؛ یەکسەر لایدەبەین.</p>
          <p>ئەپەکانی KUREAN لە Meta و تیکتۆک تەنها بۆ بڵاوکردنەوەی ناوەڕۆکی خۆمان لە هەژمارەکانی خۆمان بەکاردێن. بڕوانە <a href="/privacy">سیاسەتی تایبەتمەندی</a>.</p>
        </div>
        <div className="art-body" dir="ltr" lang="en" style={{ fontFamily: "var(--latin)", fontSize: 15, lineHeight: 1.7 }}>
          <p>
            <strong>Terms of use (English).</strong> Kurean (kurean.news) is a free Sorani Kurdish news website about Korean culture.
            Reading needs no account. Every story is written from the sources it names and links to; we aim to be accurate and correct
            mistakes when told. Photos and other third-party content belong to their owners and are credited; rights holders can ask
            for removal by messaging @kurean.news, and we remove it promptly. The KUREAN apps on Meta (Facebook, Instagram) and TikTok
            are used only by Kurean to publish its own content to its own accounts (@kurean.news); on TikTok, videos are sent as drafts
            to our own inbox and posted by us. See the <a href="/privacy">privacy policy</a>. Content is provided as is, without warranty.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
