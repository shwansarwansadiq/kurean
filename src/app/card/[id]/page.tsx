import { notFound } from "next/navigation";
import { SocialCard } from "@/components/admin/SocialCards";
import { publishedStory } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/** The feed or story card at full size, for the image exporter. Published stories only. */
export default async function Card({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string; u?: string }> }) {
  const story = await publishedStory(Number((await params).id));
  if (!story) notFound();
  const sp = await searchParams;
  const format = sp.f === "story" ? "story" : "feed";
  // ?u=<n>: the n-th approved update of a live story.
  const updates = story.updates ?? [];
  const update = sp.u !== undefined ? updates[Number(sp.u)]?.card : undefined;
  if (sp.u !== undefined && !update) notFound();
  return (
    <main className="card-page">
      {/* The page stays left-to-right and only the card is right-to-left: headless Chromium paints an RTL page blank. */}
      <style>{`html{direction:ltr}html,body{margin:0;background:#2a1e3b}.skip{display:none}.card-page{width:1080px;direction:rtl}
        .sc .glass{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
        .sc .sc-panel{background:rgb(42 30 59 / 0.72)!important}
        .sc *{animation:none!important}`}</style>
      <SocialCard story={story} format={format} full update={update} />
    </main>
  );
}
