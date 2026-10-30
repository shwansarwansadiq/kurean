import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bidi } from "@/components/Bidi";
import { Masthead } from "@/components/Masthead";
import { CategoryChip, Photo, SiteFooter, storyHref, Tracklist } from "@/components/StoryParts";
import { CATEGORY_META, ku, paragraphs, publishedStories, publishedStory, readingMinutes, siteUrl, soraniDate } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const story = await publishedStory(Number((await params).id));
  if (!story) return {};
  return {
    title: `${story.headline} · کوریەن`,
    description: story.key_points[0] ?? undefined,
    alternates: { canonical: `${siteUrl()}/news/${story.id}` },
    openGraph: {
      title: story.headline,
      description: story.key_points[0] ?? undefined,
      images: story.image_url ? [story.image_url] : undefined,
      type: "article",
      locale: "ckb_IQ",
    },
  };
}

export default async function StoryPage({ params }: Params) {
  const story = await publishedStory(Number((await params).id));
  if (!story) notFound();
  const meta = CATEGORY_META[story.category];
  const others = (await publishedStories({ limit: 20 })).filter((s) => s.id !== story.id);
  const next = others[0];
  const related = others.filter((s) => s.category === story.category).slice(0, 3);
  const sources = story.sources?.length ? story.sources : [{ name: story.source_name, url: story.source_url }];

  return (
    <>
      <Masthead note={`${meta.label} · ${ku(readingMinutes(story.body))} خولەک خوێندنەوە`} />
      <main id="main" className={`article cat-${story.category}`} style={{ ["--cat" as string]: meta.colour }}>
        <div className="art-photo">
          <Photo story={story} priority />
          <CategoryChip story={story} glass />
        </div>
        <header className="art-head">
          <h1>
            <Bidi text={story.headline} />
          </h1>
          <p className="byline">
            {soraniDate(story.published_at ?? story.created_at)} · کوریەن
          </p>
        </header>
        <div className="art-body">
          {paragraphs(story.body).map((p, i) => (
            <p key={i}>
              <Bidi text={p} />
            </p>
          ))}
        </div>
        {story.key_points.length ? (
          <aside className="points" aria-labelledby="brief">
            <h2 id="brief">بە کورتی</h2>
            <ol>
              {story.key_points.map((k, i) => (
                <li key={i}>
                  <Bidi text={k} />
                </li>
              ))}
            </ol>
          </aside>
        ) : null}
        <section className="credits" aria-labelledby="src">
          <h2 id="src">سەرچاوەکان</h2>
          <dl>
            <dt>هەواڵ لە</dt>
            <dd>
              {sources.map((s, i) => (
                <span key={s.url}>
                  {i ? "، " : ""}
                  <a href={s.url} rel="noopener" target="_blank">
                    {s.name}
                  </a>
                </span>
              ))}
            </dd>
            {story.image_credit ? (
              <>
                <dt>وێنە</dt>
                <dd>
                  {story.image_source ? (
                    <a href={story.image_source} rel="noopener" target="_blank">
                      {story.image_credit}
                    </a>
                  ) : (
                    <bdi className="lat">{story.image_credit}</bdi>
                  )}
                </dd>
              </>
            ) : null}
            <dt>نووسینی کوردی</dt>
            <dd>کوریەن</dd>
          </dl>
        </section>
        {next ? (
          <Link href={storyHref(next)} className="next">
            <span>
              <small>هەواڵی داهاتوو</small>
              <b>
                <Bidi text={next.headline} />
              </b>
            </span>
            <span className="arr" aria-hidden="true">
              ←
            </span>
          </Link>
        ) : null}
        {related.length ? (
          <section className="sec" aria-labelledby="more">
            <h2 id="more" className="sec-title">
              زیاتر لە {meta.label}
            </h2>
            <Tracklist stories={related} />
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
