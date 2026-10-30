import { AdminShell } from "@/components/admin/AdminShell";
import { StoryCard } from "@/components/admin/StoryCard";
import { storiesByStatus } from "@/lib/admin-data";

export default async function Queue() {
  const stories = await storiesByStatus("pending");
  return (
    <AdminShell active="pending" title="چاوەڕوانی پەسەندکردن">
      {stories.length ? (
        <div className="queue">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      ) : (
        <div className="adm-empty">
          <h2>هەموو هەواڵەکان بینران</h2>
          <p>سیستەمەکە هەر کاتژمێرێک هەواڵی نوێ دەنووسێت (ڕۆژانە تا ٨ هەواڵ). کە هەواڵێک ئامادە بوو لێرە دەردەکەوێت.</p>
        </div>
      )}
    </AdminShell>
  );
}
