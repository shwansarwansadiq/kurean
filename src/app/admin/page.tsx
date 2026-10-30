import { AdminShell } from "@/components/admin/AdminShell";
import { StoryCard } from "@/components/admin/StoryCard";
import { storiesByStatus } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { nextFreeSlot } from "@/lib/schedule";
import { ku } from "@/lib/site";
import { DAILY_LIMIT } from "@/lib/writer";

export const dynamic = "force-dynamic";

export default async function Queue() {
  const [stories, scheduled] = await Promise.all([
    storiesByStatus("pending"),
    db().from("stories").select("scheduled_at").eq("status", "approved").not("scheduled_at", "is", null),
  ]);
  const nextSlot = nextFreeSlot((scheduled.data ?? []).map((r) => new Date(r.scheduled_at as string)));
  return (
    <AdminShell active="pending" title="چاوەڕوانی پەسەندکردن">
      {stories.length ? (
        <div className="queue">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} nextSlot={nextSlot} />
          ))}
        </div>
      ) : (
        <div className="adm-empty">
          <h2>هەموو هەواڵەکان بینران</h2>
          <p>سیستەمەکە هەر کاتژمێرێک هەواڵی نوێ دەنووسێت (ڕۆژانە تا {ku(DAILY_LIMIT)} هەواڵ، لە نیوەشەوی هەولێرەوە). کە هەواڵێک ئامادە بوو لێرە دەردەکەوێت.</p>
        </div>
      )}
    </AdminShell>
  );
}
