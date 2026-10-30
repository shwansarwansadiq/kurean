import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/StoryParts";

export const metadata = { title: "تایبەتمەندی · کوریەن" };

export default function Privacy() {
  return (
    <>
      <Masthead />
      <main id="main" className="article">
        <header className="art-head">
          <h1>سیاسەتی تایبەتمەندی</h1>
        </header>
        <div className="art-body">
          <p>کوریەن ماڵپەڕێکی هەواڵە. هەژمار دروست ناکەین و داتای خوێنەران نافرۆشین. ژمارەی خوێنەران بە ئامرازێکی خۆمان دەژمێرین، بێ کوکی و بێ هەڵگرتنی ناونیشانی IP؛ بە ڕازیبوونی خۆت ناسنامەیەکی هەڕەمەکی لە وێبگەڕەکەت هەڵدەگرین. <a href="/measure">چۆن دەپێوین</a>.</p>
          <p>ئەپی KUREAN لە Meta تەنها بۆ بڵاوکردنەوەی هەواڵەکانمان لە پەڕەی فەیسبووک و ئینستاگرامی خۆمان (@kurean.news) بەکاردێت. هیچ داتایەکی بەکارهێنەران لە فەیسبووک یان ئینستاگرام وەرناگرێت.</p>
          <p>بۆ هەر پرسیارێک یان داوای لابردنی ناوەڕۆک، نامە بنێرە بۆ <bdi className="lat">@kurean.news</bdi>.</p>
        </div>
        <div className="art-body" dir="ltr" lang="en" style={{ fontFamily: "var(--latin)", fontSize: 15, lineHeight: 1.7 }}>
          <p>
            <strong>Privacy policy (English).</strong> Kurean is a news website. We do not create reader accounts or sell data. We count readers with
            our own first-party tool: no cookies, no stored IP addresses, and a random ID in your browser only if you agree (see /measure). The KUREAN Meta app is used only to publish our own stories to our own
            Facebook Page and Instagram account (@kurean.news); it does not collect data about Facebook or Instagram users. For
            questions or removal requests, message @kurean.news.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
