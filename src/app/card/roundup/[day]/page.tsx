import { notFound } from "next/navigation";
import { RoundupCover, RoundupEnd } from "@/components/admin/RoundupCards";
import { cutoffOf, dayLabel, getRoundup, roundupStories, storiesByIds } from "@/lib/roundup";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/** The daily round-up's cover or end slide at full size, for the image exporter. Published stories only. */
export default async function RoundupSlide({ params, searchParams }: { params: Promise<{ day: string }>; searchParams: Promise<{ slide?: string; f?: string }> }) {
  const { day } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) notFound();
  const { slide, f } = await searchParams;
  const format = f === "story" ? "story" : "feed";
  let body;
  if (slide === "end") body = <RoundupEnd format={format} />;
  else {
    const row = await getRoundup(day);
    const stories = row?.story_ids.length ? await storiesByIds(row.story_ids) : await roundupStories(day, new Date(Math.min(Date.now(), cutoffOf(day).getTime())));
    if (!stories.length) notFound();
    body = <RoundupCover dateLabel={dayLabel(day)} stories={stories} format={format} />;
  }
  return (
    <main className="card-page">
      <style>{`html{direction:ltr}html,body{margin:0;background:#2a1e3b}.skip{display:none}.card-page{width:1080px;direction:rtl}.sc *{animation:none!important}`}</style>
      {body}
    </main>
  );
}
