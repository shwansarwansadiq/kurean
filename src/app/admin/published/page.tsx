import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { Bidi } from "@/components/Bidi";
import { storiesByStatus } from "@/lib/admin-data";
import { CATEGORY_META, ku, soraniDate } from "@/lib/site";
import { restoreStory } from "../actions";

export default async function Published() {
  const [published, skipped] = await Promise.all([storiesByStatus("published"), storiesByStatus("skipped", 20)]);
  return (
    <AdminShell active="published" title="بڵاوکراوەکان">
      <ul className="rows">
        {published.map((s) => (
          <li key={s.id}>
            <span className="dot" style={{ background: CATEGORY_META[s.category].colour }} />
            <div className="row-main">
              <Link href={`/news/${s.id}`} target="_blank">
                <Bidi text={s.headline} />
              </Link>
              <small>
                {soraniDate(s.published_at ?? s.created_at)} · <bdi dir="ltr">kurean.news/n/{s.id}</bdi> · {s.platforms.join(" · ")}
              </small>
            </div>
            <form action={restoreStory}>
              <input type="hidden" name="id" value={s.id} />
              <Submit className="btn ghost small" busy="…">لابردن لە ماڵپەڕ</Submit>
            </form>
          </li>
        ))}
        {!published.length ? <li className="rows-empty">هێشتا هیچ هەواڵێک بڵاونەکراوەتەوە.</li> : null}
      </ul>
      <h2 className="adm-h2">پەڕێنراوەکان ({ku(skipped.length)})</h2>
      <ul className="rows muted">
        {skipped.map((s) => (
          <li key={s.id}>
            <span className="dot" style={{ background: CATEGORY_META[s.category].colour }} />
            <div className="row-main">
              <span>
                #{ku(s.id)} <Bidi text={s.headline} />
              </span>
            </div>
            <form action={restoreStory}>
              <input type="hidden" name="id" value={s.id} />
              <Submit className="btn ghost small" busy="…">گەڕاندنەوە بۆ چاوەڕوان</Submit>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
