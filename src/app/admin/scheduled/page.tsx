import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { Bidi } from "@/components/Bidi";
import { PLATFORM_LABEL, type AdminStory } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { hawlerMidnight, hawlerTime, WINDOW_END_H, WINDOW_START_H } from "@/lib/schedule";
import { CATEGORY_META, ku, soraniDate } from "@/lib/site";
import { publishStory, spreadSchedule, unscheduleStory } from "../actions";

export const dynamic = "force-dynamic";

function dayLabel(d: Date, now: Date): string {
  const days = Math.round((hawlerMidnight(d).getTime() - hawlerMidnight(now).getTime()) / 86_400_000);
  if (days === 0) return "ئەمڕۆ";
  if (days === 1) return "بەیانی";
  return soraniDate(d);
}

/** Approved stories waiting for their time, by day; they publish themselves (site + chosen social media). */
export default async function Scheduled() {
  const { data } = await db()
    .from("stories")
    .select("id, category, card_headline, platforms, scheduled_at")
    .eq("status", "approved")
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });
  const rows = (data ?? []) as Pick<AdminStory, "id" | "category" | "card_headline" | "platforms" | "scheduled_at">[];
  const now = new Date();
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const label = dayLabel(new Date(r.scheduled_at!), now);
    groups.set(label, [...(groups.get(label) ?? []), r]);
  }
  return (
    <AdminShell active="scheduled" title="خشتەی بڵاوکردنەوە">
      <div className="sched-top">
        <p className="adm-note">
          هەواڵە پەسەندکراوەکان لە کاتی خۆیاندا خۆیان بڵاودەبنەوە (ماڵپەڕ و ئەو پلاتفۆرمانەی هەڵتبژاردوون). کاتی بڵاوکردنەوە: لە{" "}
          {ku(String(WINDOW_START_H).padStart(2, "0"))}:٠٠ تا {ku(WINDOW_END_H)}:٠٠ی هەولێر، لانیکەم یەک کاتژمێر لە نێوانیاندا.
        </p>
        {rows.length > 1 ? (
          <form action={spreadSchedule}>
            <Submit className="btn" busy="ڕێکدەخرێت…">
              بە یەکسانی دابەشیان بکە
            </Submit>
          </form>
        ) : null}
      </div>
      {rows.length ? (
        [...groups].map(([label, list]) => (
          <section key={label} className="sched-day">
            <h2>{label}</h2>
            <ul className="rows">
              {list.map((s) => (
                <li key={s.id} className="sched-row">
                  <span className="sched-time lat">{ku(hawlerTime(s.scheduled_at!))}</span>
                  <div className="row-main">
                    <span className="sched-cat" style={{ background: CATEGORY_META[s.category].colour }}>{CATEGORY_META[s.category].label}</span>
                    <Bidi text={s.card_headline} />
                    <small dir="ltr">{(s.platforms ?? []).map((p) => PLATFORM_LABEL[p as keyof typeof PLATFORM_LABEL] ?? p).join(" · ")}</small>
                  </div>
                  <div className="sched-acts">
                    <form action={publishStory}>
                      <input type="hidden" name="id" value={s.id} />
                      {(s.platforms ?? []).map((p) => (
                        <input key={p} type="hidden" name={`p_${p}`} value="on" />
                      ))}
                      <Submit className="btn small" busy="…">ئێستا</Submit>
                    </form>
                    <form action={unscheduleStory}>
                      <input type="hidden" name="id" value={s.id} />
                      <Submit className="btn small ghost" busy="…">بگەڕێنەوە بۆ لیست</Submit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <div className="adm-empty">
          <h2>هیچ شتێک لە خشتەدا نییە</h2>
          <p>لە لیستی چاوەڕوان، «بیخە خشتەوە» دابگرە بۆ ئەوەی هەواڵێک لە کاتی بەتاڵی داهاتوودا بڵاوببێتەوە.</p>
        </div>
      )}
    </AdminShell>
  );
}
