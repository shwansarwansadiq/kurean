import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { db } from "@/lib/db";
import { ku, soraniDate } from "@/lib/site";
import { toggleSource } from "../actions";

type Row = { id: string; name: string; site_url: string; trust: number; active: boolean; last_checked_at: string | null; last_item_at: string | null };

export default async function Sources() {
  const { data } = await db().from("sources").select("id, name, site_url, trust, active, last_checked_at, last_item_at").order("active", { ascending: false }).order("trust", { ascending: false });
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count: failed } = await db().from("raw_items").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since);
  return (
    <AdminShell active="sources" title="سەرچاوەکان">
      {failed ? <p className="flag warn">{ku(failed)} هەواڵ لە ٢٤ کاتژمێری ڕابردوودا نەنووسران. Vercel → Logs ببینە.</p> : null}
      <ul className="rows">
        {((data ?? []) as Row[]).map((s) => (
          <li key={s.id} className={s.active ? undefined : "off"}>
            <div className="row-main">
              <a href={s.site_url} target="_blank" rel="noopener" dir="ltr" className="lat-strong">
                {s.name}
              </a>
              <small>
                متمانە {ku(s.trust)} لە ٣ · دوایین پشکنین: {s.last_checked_at ? soraniDate(s.last_checked_at, false) : "هەرگیز"}
                {s.last_item_at ? ` · دوایین هەواڵ: ${soraniDate(s.last_item_at, false)}` : ""}
              </small>
            </div>
            <form action={toggleSource}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="active" value={String(s.active)} />
              <Submit className="btn ghost small" busy="…">{s.active ? "ڕاگرتن" : "چالاککردن"}</Submit>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
