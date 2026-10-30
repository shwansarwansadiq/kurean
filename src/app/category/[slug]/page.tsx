import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sun } from "@/components/Logo";
import { Masthead } from "@/components/Masthead";
import { SiteFooter, Tracklist } from "@/components/StoryParts";
import { categoryFromSlug, CATEGORY_META, issueNumber, ku, publishedStories } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const key = categoryFromSlug((await params).slug);
  return key ? { title: `${CATEGORY_META[key].label} · کوریەن` } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const key = categoryFromSlug((await params).slug);
  if (!key) notFound();
  const meta = CATEGORY_META[key];
  const [stories, issue] = await Promise.all([publishedStories({ category: key, limit: 40 }), issueNumber()]);

  return (
    <>
      <Masthead issue={issue} active={key} />
      <main id="main" data-category={key}>
        <section className="cat-head field" style={{ background: meta.colour }}>
          <Sun className="field-sun" />
          <h1>{meta.label}</h1>
          <p>{stories.length ? `${ku(stories.length)} هەواڵ` : "هێشتا هەواڵ لەم بەشەدا نییە."}</p>
        </section>
        {stories.length ? (
          <section className="sec">
            <Tracklist stories={stories} />
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
