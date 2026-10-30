import Link from "next/link";
import { Bidi } from "@/components/Bidi";
import { Sun } from "@/components/Logo";
import { Masthead } from "@/components/Masthead";
import { CategoryChip, Photo, SiteFooter, storyHref, Tracklist } from "@/components/StoryParts";
import { CATEGORY_KEYS, CATEGORY_META, issueNumber, ku, publishedStories, readingMinutes } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stories, issue] = await Promise.all([publishedStories({ limit: 40 }), issueNumber()]);
  const [lead, ...rest] = stories;
  const today = rest.slice(0, 8);

  return (
    <>
      <Masthead issue={issue} active="all" />
      <main id="main">
        {lead ? (
          <article className={`lead cat-${lead.category}`}>
            <Link href={storyHref(lead)} className="lead-link">
              <div className="lead-media">
                <Photo story={lead} priority className="lead-photo" />
                <CategoryChip story={lead} glass />
              </div>
              <div className="field" style={{ background: CATEGORY_META[lead.category].colour }}>
                <Sun className="field-sun" />
                <h1 className="lead-title">
                  <Bidi text={lead.headline} />
                </h1>
                {lead.key_points[0] ? (
                  <p className="lead-dek">
                    <Bidi text={lead.key_points[0]} />
                  </p>
                ) : null}
                <div className="lead-meta">
                  <span>
                    سەرچاوە: <bdi className="lat">{lead.source_name}</bdi>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{ku(readingMinutes(lead.body))} خولەک</span>
                </div>
                <span className="read">هەواڵەکە بخوێنەوە ←</span>
              </div>
            </Link>
          </article>
        ) : (
          <section className="empty field" style={{ background: "var(--berry)" }}>
            <Sun className="field-sun spin" />
            <h1 className="lead-title">یەکەم هەواڵ بەم زووانە دێت</h1>
            <p className="lead-dek">کوریەن هەواڵی کەی-پۆپ، دراما، فیلم و کولتووری کۆری بە کوردی دەنووسێت. شوێنمان بکەوە تا یەکەم هەواڵ لەدەست نەدەیت.</p>
          </section>
        )}

        {today.length ? (
          <section className="sec" aria-labelledby="today">
            <h2 id="today" className="sec-title">
              لیستی ئەمڕۆ <small>{ku(today.length)} هەواڵ</small>
            </h2>
            <Tracklist stories={today} start={2} />
          </section>
        ) : null}

        {CATEGORY_KEYS.map((k) => {
          const inCat = stories.filter((s) => s.category === k && s.id !== lead?.id).slice(0, 3);
          if (!inCat.length) return null;
          const meta = CATEGORY_META[k];
          return (
            <section key={k} className="chapter" style={{ background: meta.colour }} aria-labelledby={`ch-${k}`}>
              <div className="chapter-head">
                <h2 id={`ch-${k}`}>{meta.label}</h2>
                <Link href={`/category/${meta.slug}`} className="more glass">
                  هەمووی ←
                </Link>
              </div>
              <ul className="chapter-list">
                {inCat.map((s) => (
                  <li key={s.id}>
                    <Link href={storyHref(s)}>
                      <Bidi text={s.headline} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </>
  );
}
