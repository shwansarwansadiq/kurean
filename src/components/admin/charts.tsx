/* Small SVG charts for /admin/analytics. Server-rendered; exact values in <title> tooltips. */
import { compact, exact, type Digits } from "@/lib/numbers";

type Series = { name: string; color: string; values: number[] };

/** Daily line chart: first series gets a soft area fill; the last point of each series is marked. */
export function LineChart({ labels, series, digits }: { labels: string[]; series: Series[]; digits: Digits }) {
  const W = 640, H = 220, L = 44, R = 26, T = 12, B = 28;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const x = (i: number) => L + (labels.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f);
  const every = Math.max(1, Math.ceil(labels.length / 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={series.map((s) => s.name).join(" / ")} style={{ direction: "ltr" }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" className="tick">{compact(t, digits)}</text>
        </g>
      ))}
      {labels.map((l, i) => (i % every === 0 || i === labels.length - 1 ? (
        <text key={l} x={x(i)} y={H - 8} textAnchor="middle" className="tick">{l.slice(5)}</text>
      ) : null))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        return (
          <g key={s.name}>
            {si === 0 && s.values.length > 1 ? (
              <polygon points={`${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}`} fill={s.color} opacity="0.12" />
            ) : null}
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={i === s.values.length - 1 ? 4.5 : 9} fill={i === s.values.length - 1 ? s.color : "transparent"}>
                <title>{`${labels[i]} · ${s.name}: ${exact(v, digits)}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** Ranked horizontal bars with the exact value at the end. */
export function Bars({ rows, digits, format = compact }: { rows: { label: string; value: number; color?: string; note?: string }[]; digits: Digits; format?: (n: number, d: Digits) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="empty-note">هێشتا داتا نییە.</p>;
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${exact(r.value, digits)}`}>
          <span className="bar-label">{r.label}{r.note ? <small> {r.note}</small> : null}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(100 * r.value) / max}%`, background: r.color ?? "var(--berry)" }} /></span>
          <span className="bar-val">{format(r.value, digits)}</span>
        </li>
      ))}
    </ul>
  );
}

const PALETTE = ["#E8508A", "#9B7BEA", "#3FA88E", "#3A5BD9", "#FFB938", "#2A1E3B", "#B8A6EE", "#8C7A9C"];

/** Donut with a legend that carries the numbers (colour is never the only cue). */
export function Donut({ rows, digits }: { rows: { label: string; value: number; color?: string }[]; digits: Digits }) {
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return <p className="empty-note">هێشتا داتا نییە.</p>;
  let acc = 0;
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="ڕێژە">
        {rows.map((r, i) => {
          const frac = r.value / total;
          const el = (
            <circle key={r.label} cx="70" cy="70" r={R} fill="none" stroke={r.color ?? PALETTE[i % PALETTE.length]} strokeWidth="22"
              strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C} transform="rotate(-90 70 70)">
              <title>{`${r.label}: ${exact(r.value, digits)} (${(frac * 100).toFixed(1)}%)`}</title>
            </circle>
          );
          acc += frac;
          return el;
        })}
        <text x="70" y="76" textAnchor="middle" className="donut-total">{compact(total, digits)}</text>
      </svg>
      <ul className="legend">
        {rows.map((r, i) => (
          <li key={r.label}>
            <i style={{ background: r.color ?? PALETTE[i % PALETTE.length] }} />
            <span>{r.label}</span>
            <b>{((100 * r.value) / total).toFixed(1).replace(/\.0$/, "")}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Visits by weekday and hour (Asia/Baghdad). Darker = more page views. */
export function Heatmap({ cells, days, digits }: { cells: { dow: number; hour: number; pageviews: number }[]; days: string[]; digits: Digits }) {
  const max = Math.max(1, ...cells.map((c) => c.pageviews));
  const at = (d: number, h: number) => cells.find((c) => c.dow === d && c.hour === h)?.pageviews ?? 0;
  const order = [6, 0, 1, 2, 3, 4, 5]; // Saturday first, as the Kurdish week runs
  return (
    <div className="heat-wrap">
      <table className="heat">
        <thead>
          <tr><th />{Array.from({ length: 24 }, (_, h) => <th key={h} dir="ltr">{h % 3 === 0 ? h : ""}</th>)}</tr>
        </thead>
        <tbody>
          {order.map((d) => (
            <tr key={d}>
              <th scope="row">{days[d]}</th>
              {Array.from({ length: 24 }, (_, h) => {
                const v = at(d, h);
                return (
                  <td key={h} title={`${days[d]} ${h}:00 — ${exact(v, digits)}`} style={{ background: v ? `rgb(232 80 138 / ${0.12 + (0.88 * v) / max})` : undefined }} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
