import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Bars, Donut, Heatmap, LineChart } from "@/components/admin/charts";
import { analytics, DEVICE_LABEL, DOW_LABEL, headlines, incomplete, parseRange, previousRange, SOURCE_LABEL, type Analytics } from "@/lib/analytics";
import { change, compact, duration, exact, pct, ratio, toDigits, type Digits } from "@/lib/numbers";
import { CATEGORY_KEYS, CATEGORY_META, type CategoryKey } from "@/lib/site";

type Search = { r?: string; from?: string; to?: string; cat?: string; d?: string };

const RANGES = [
  { key: "today", label: "ئەمڕۆ" },
  { key: "7d", label: "٧ ڕۆژ" },
  { key: "30d", label: "٣٠ ڕۆژ" },
  { key: "90d", label: "٩٠ ڕۆژ" },
];

function Delta({ now, before, invert = false }: { now: number | null; before: number | null; invert?: boolean }) {
  const c = change(now, before);
  if (c === null) return <span className="delta none">—</span>;
  const up = c > 0;
  const good = invert ? !up : up;
  return (
    <span className={`delta ${c === 0 ? "none" : good ? "good" : "bad"}`} dir="ltr">
      {c === 0 ? "=" : up ? "▲" : "▼"} {Math.abs(c).toFixed(1)}%
    </span>
  );
}

function Card({ label, value, now, before, invert, hint }: { label: string; value: string; now: number | null; before: number | null; invert?: boolean; hint?: string }) {
  return (
    <div className="kpi" title={hint}>
      <span className="kpi-label">{label}</span>
      <b className="kpi-value">{value}</b>
      <Delta now={now} before={before} invert={invert} />
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const prev = previousRange(range);
  const cat = CATEGORY_KEYS.includes(sp.cat as CategoryKey) ? (sp.cat as CategoryKey) : null;
  const digits: Digits = sp.d === "ku" ? "kurdish" : "latin";
  let a: Analytics, b: Analytics;
  try {
    [a, b] = await Promise.all([analytics(range, cat), analytics(prev, cat)]);
  } catch (e) {
    return (
      <AdminShell active="analytics" title="شیکاری">
        <p className="flag warn">شیکاری ئامادە نییە: {e instanceof Error ? e.message : String(e)}. ئایا migrate-005 لە Supabase کار پێکراوە؟</p>
      </AdminShell>
    );
  }
  const heads = await headlines(a.articles.map((x) => x.story_id));
  const t = a.totals, p = b.totals;
  const returning = ratio(t.returning_visitors, t.consented_visitors);
  const returningPrev = ratio(p.returning_visitors, p.consented_visitors);
  const qs = (over: Partial<Search>) => {
    const q = new URLSearchParams();
    const merged = { r: range.key === "custom" ? "custom" : range.key, from: sp.from, to: sp.to, cat: cat ?? undefined, d: sp.d, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/admin/analytics?${q}`;
  };
  const N = (n: number | null | undefined) => compact(n, digits);
  const X = (n: number | null | undefined) => exact(n, digits);
  const D = (s: string) => toDigits(s, digits);
  const partial = incomplete(range, a.first_event);
  const catLabel = (k: string) => (k in CATEGORY_META ? CATEGORY_META[k as CategoryKey].label : k === "none" ? "پەڕەی سەرەکی و تر" : k);

  return (
    <AdminShell active="analytics" title="شیکاری">
      <nav className="seg sub" aria-label="بەشەکان">
        <Link href={qs({ cat: undefined })} className={!cat ? "on" : undefined}>هەموو</Link>
        {CATEGORY_KEYS.map((k) => (
          <Link key={k} href={qs({ cat: k })} className={cat === k ? "on" : undefined}>
            <i className="dot" style={{ background: CATEGORY_META[k].colour }} /> {CATEGORY_META[k].label}
          </Link>
        ))}
      </nav>

      <div className="an-tools">
        <div className="chips">
          {RANGES.map((r) => (
            <Link key={r.key} href={qs({ r: r.key, from: undefined, to: undefined })} className={range.key === r.key ? "chip-on" : undefined}>{r.label}</Link>
          ))}
        </div>
        <form className="custom" action="/admin/analytics">
          <input type="hidden" name="r" value="custom" />
          {cat ? <input type="hidden" name="cat" value={cat} /> : null}
          {sp.d ? <input type="hidden" name="d" value={sp.d} /> : null}
          <input type="date" name="from" defaultValue={sp.from} aria-label="لە" required />
          <input type="date" name="to" defaultValue={sp.to} aria-label="تا" required />
          <button className="btn small" type="submit">پیشاندان</button>
        </form>
        <Link className="btn ghost small" href={qs({ d: digits === "kurdish" ? undefined : "ku" })}>{digits === "kurdish" ? "123" : "١٢٣"}</Link>
      </div>

      <p className="an-meta">
        {cat ? `${catLabel(cat)} · ` : ""}بەراورد لەگەڵ ماوەی پێشوو ({D(String(range.days))} ڕۆژ) · ئامادەکرا: {D(new Date(a.generated_at).toLocaleString("en-GB", { timeZone: "Asia/Baghdad" }))}
        {partial ? <span className="partial"> · ماوەکە تەواو نییە (ئەمڕۆ هێشتا بەردەوامە یان ژماردن دواتر دەستیپێکرد)</span> : null}
      </p>

      <section className="kpis" aria-label="کورتە">
        <Card label="خوێنەری جیاواز" value={N(t.visitors)} now={t.visitors} before={p.visitors} hint="Unique visitors" />
        <Card label="بینینی پەڕە" value={N(t.pageviews)} now={t.pageviews} before={p.pageviews} hint="Pageviews" />
        <Card label="کاتی خوێندنەوە" value={duration(t.avg_engaged_ms, digits)} now={t.avg_engaged_ms} before={p.avg_engaged_ms} hint="Average engaged time per page (active tab)" />
        <Card label="گەڕاوەکان" value={pct(returning === null ? null : returning * 100, digits)} now={returning} before={returningPrev} hint="Returning visitors (of those who allowed counting)" />
        <Card label="پەڕە بۆ هەر سەردانێک" value={t.pages_per_session === null ? "—" : D(t.pages_per_session.toFixed(1))} now={t.pages_per_session} before={p.pages_per_session} hint="Pages per session" />
        <Card label="تەنها یەک پەڕە" value={pct(t.bounce_pct, digits)} now={t.bounce_pct} before={p.bounce_pct} invert hint="Bounce rate" />
        <Card label="سەردان" value={N(t.sessions)} now={t.sessions} before={p.sessions} hint="Sessions" />
        <Card label="قووڵی سکرۆڵ" value={pct(t.avg_scroll, digits)} now={t.avg_scroll} before={p.avg_scroll} hint="Average deepest scroll on a page" />
      </section>

      <section className="panel">
        <h2 className="adm-h2">خوێنەران و بینین بە ڕۆژ</h2>
        {a.daily.length ? (
          <LineChart
            digits={digits}
            labels={a.daily.map((d) => d.day)}
            series={[
              { name: "بینین", color: "#E8508A", values: a.daily.map((d) => d.pageviews) },
              { name: "خوێنەر", color: "#2A1E3B", values: a.daily.map((d) => d.visitors) },
            ]}
          />
        ) : <p className="empty-note">هێشتا داتا نییە بۆ ئەم ماوەیە.</p>}
        <p className="legend-inline"><i style={{ background: "#E8508A" }} /> بینین <i style={{ background: "#2A1E3B" }} /> خوێنەر</p>
      </section>

      <div className="an-grid">
        {!cat ? (
          <section className="panel">
            <h2 className="adm-h2">بەشەکان</h2>
            <Bars digits={digits} rows={a.categories.map((c) => ({
              label: catLabel(c.key),
              value: c.pageviews ?? 0,
              color: c.key in CATEGORY_META ? CATEGORY_META[c.key as CategoryKey].colour : "#8C7A9C",
              note: `· ${duration(c.avg_engaged_ms ?? null, digits)}`,
            }))} />
          </section>
        ) : null}
        <section className="panel">
          <h2 className="adm-h2">سەرچاوەی خوێنەران</h2>
          <Donut digits={digits} rows={a.sources.map((s) => ({ label: SOURCE_LABEL[s.key] ?? s.key, value: s.pageviews ?? 0 }))} />
          {a.referrers.length ? <><h3 className="an-h3">ماڵپەڕەکان</h3><Bars digits={digits} rows={a.referrers.map((r) => ({ label: r.key, value: r.pageviews ?? 0, color: "#9B7BEA" }))} /></> : null}
        </section>
        <section className="panel">
          <h2 className="adm-h2">ئامێر</h2>
          <Donut digits={digits} rows={a.devices.map((d) => ({ label: DEVICE_LABEL[d.key] ?? d.key, value: d.visitors ?? 0 }))} />
          <h3 className="an-h3">سیستەم</h3>
          <Bars digits={digits} rows={a.os.map((o) => ({ label: o.key, value: o.visitors ?? 0, color: "#2A1E3B" }))} />
          <h3 className="an-h3">وێبگەڕ</h3>
          <Bars digits={digits} rows={a.browsers.map((o) => ({ label: o.key, value: o.visitors ?? 0, color: "#9B7BEA" }))} />
          <h3 className="an-h3">زمانی وێبگەڕ</h3>
          <Bars digits={digits} rows={a.langs.map((o) => ({ label: o.key, value: o.visitors ?? 0, color: "#3FA88E" }))} />
        </section>
        <section className="panel">
          <h2 className="adm-h2">وڵات</h2>
          <Bars digits={digits} rows={a.countries.map((c) => ({ label: c.key, value: c.visitors ?? 0, color: "#3A5BD9" }))} />
          <h3 className="an-h3">شار</h3>
          <Bars digits={digits} rows={a.cities.map((c) => ({ label: c.key, note: String(c.country ?? ""), value: c.visitors ?? 0, color: "#3A5BD9" }))} />
        </section>
      </div>

      <section className="panel">
        <h2 className="adm-h2">کاتی سەردان (کاتی هەولێر)</h2>
        <Heatmap cells={a.heatmap} days={DOW_LABEL} digits={digits} />
      </section>

      <div className="an-grid">
        <section className="panel">
          <h2 className="adm-h2">قووڵی خوێندنەوە</h2>
          <p className="adm-note">لە سەدا چەندی بینینی هەواڵەکان گەیشتنە ئەم ئاستە.</p>
          <Bars digits={digits} format={(n, d) => pct(n, d)} rows={[
            { label: "٢٥٪", value: a.scroll.reached25 ?? 0 },
            { label: "٥٠٪", value: a.scroll.reached50 ?? 0 },
            { label: "٧٥٪", value: a.scroll.reached75 ?? 0 },
            { label: "کۆتایی", value: a.scroll.reached100 ?? 0 },
          ]} />
        </section>
        <section className="panel">
          <h2 className="adm-h2">پەڕەی کۆتایی سەردان</h2>
          <Bars digits={digits} rows={a.exits.map((e) => ({ label: e.key, value: Number(e.exits ?? 0), color: "#8C7A9C" }))} />
          {a.campaigns.length ? <><h3 className="an-h3">کەمپەینەکان (UTM)</h3><Bars digits={digits} rows={a.campaigns.map((c) => ({ label: c.key, note: String(c.source ?? ""), value: c.pageviews ?? 0, color: "#FFB938" }))} /></> : null}
        </section>
      </div>

      <section className="panel">
        <div className="ph-head">
          <h2 className="adm-h2">باشترین ٢٠ هەواڵ</h2>
          <a className="btn ghost small" href={`/admin/analytics/export?${new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString(), ...(cat ? { cat } : {}) })}`}>CSV</a>
        </div>
        {a.articles.length ? (
          <div className="table-wrap">
            <table className="terms an-table">
              <thead>
                <tr><th>هەواڵ</th><th>بینین</th><th>خوێنەر</th><th>کات</th><th>سکرۆڵ</th></tr>
              </thead>
              <tbody>
                {a.articles.map((r) => (
                  <tr key={r.story_id}>
                    <td><Link href={`/news/${r.story_id}`} target="_blank"><i className="dot" style={{ background: CATEGORY_META[r.category as CategoryKey]?.colour }} /> {heads.get(r.story_id) ?? `#${r.story_id}`}</Link></td>
                    <td className="num">{X(r.pageviews)}</td>
                    <td className="num">{X(r.visitors)}</td>
                    <td className="num">{duration(r.avg_engaged_ms, digits)}</td>
                    <td className="num">{pct(r.avg_scroll, digits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty-note">هێشتا هیچ هەواڵێک نەخوێندراوەتەوە لەم ماوەیەدا.</p>}
      </section>

      <div className="an-grid">
        <section className="panel">
          <h2 className="adm-h2">ڕیکلام</h2>
          <p className="adm-note">هێشتا هیچ شوێنی ڕیکلام لە ماڵپەڕەکەدا نییە، بۆیە ژمارەی پیشاندان، بینراوی، CTR و نرخ هێشتا نییە. کاتێک شوێنی ڕیکلام زیاد کرا، ئێرە پڕ دەبێت.</p>
        </section>
        <section className="panel">
          <h2 className="adm-h2">متمانەی داتا</h2>
          <ul className="facts">
            <li><span>ڕازیبوون بە ژماردن</span><b>{pct(t.consent_pct, digits)}</b></li>
            <li><span>بۆت و کرۆلەر</span><b>دەرکراون</b></li>
            <li><span>سەردانی خۆت (داشبۆرد)</span><b>دەرکراوە</b></li>
            <li><span>دەستپێکی ژماردن</span><b dir="ltr">{a.first_event ? D(new Date(a.first_event).toLocaleDateString("en-GB", { timeZone: "Asia/Baghdad" })) : "—"}</b></li>
          </ul>
          <Link href="/measure" target="_blank" className="btn ghost small">چۆن دەپێوین</Link>
        </section>
      </div>
    </AdminShell>
  );
}
