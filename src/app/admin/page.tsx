import { AdminShell } from "@/components/admin/AdminShell";
import { StoryCard } from "@/components/admin/StoryCard";
import { storiesByStatus } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { nextFreeSlot } from "@/lib/schedule";
import { ku } from "@/lib/site";
import { DAILY_LIMIT, URGENT_LIMIT } from "@/lib/writer";
import { pendingUpdates } from "@/lib/updates";
import { Bidi } from "@/components/Bidi";
import { Submit } from "@/components/admin/Submit";
import { hawlerTime } from "@/lib/schedule";
import { approveUpdate, skipUpdateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Queue() {
  const [stories, scheduled, updates] = await Promise.all([
    storiesByStatus("pending"),
    db().from("stories").select("scheduled_at").eq("status", "approved").not("scheduled_at", "is", null),
    pendingUpdates().catch(() => []),
  ]);
  // Urgent and live stories first: they are the ones readers want now.
  stories.sort((a, b) => Number(!!b.event_id) - Number(!!a.event_id) || Number(!!b.urgent) - Number(!!a.urgent));
  const nextSlot = nextFreeSlot((scheduled.data ?? []).map((r) => new Date(r.scheduled_at as string)));
  return (
    <AdminShell active="pending" title="چاوەڕوانی پەسەندکردن">
      {updates.length ? (
        <section className="upd-box" aria-labelledby="upd-h">
          <h2 id="upd-h">نوێکاری بۆ هەواڵە بڵاوکراوەکان · {ku(updates.length)}</h2>
          <ul>
            {updates.map((u) => (
              <li key={u.id}>
                <small>
                  {hawlerTime(u.created_at)} · <Bidi text={u.headline} />
                </small>
                <p>
                  <Bidi text={u.text} />
                </p>
                <div className="upd-acts">
                  <form action={approveUpdate}>
                    <input type="hidden" name="id" value={u.id} />
                    <Submit className="btn small pub" busy="…">زیادی بکە و بڵاوی بکەرەوە</Submit>
                  </form>
                  <form action={skipUpdateAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <Submit className="btn small ghost" busy="…">پشتگوێی بخە</Submit>
                  </form>
                  <span dir="ltr" className="upd-src">{u.sources.map((x) => x.name).join(" · ")}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {stories.length ? (
        <div className="queue">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} nextSlot={nextSlot} />
          ))}
        </div>
      ) : (
        <div className="adm-empty">
          <h2>هەموو هەواڵەکان بینران</h2>
          <p>
            سیستەمەکە هەر ١٥ خولەک جارێک سەرچاوەکان دەپشکنێت (لە شەوانی ئاهەنگدا هەر ٥ خولەک جارێک). ڕۆژانە تا {ku(DAILY_LIMIT)} هەواڵی ئاسایی،
            بەسەر ڕۆژدا دابەشکراو، و تا {ku(URGENT_LIMIT)} هەواڵی خێرا. کە هەواڵێک ئامادە بوو لێرە و لە تێلێگرام دەردەکەوێت.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
