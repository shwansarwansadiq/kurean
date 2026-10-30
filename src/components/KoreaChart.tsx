/* eslint-disable @next/next/no-img-element -- album covers are Circle Chart's own 70 px thumbnails, shown at or below that size */
import { periodDates, type ChartEntry, type ChartWeek } from "../lib/chart";
import { ku } from "../lib/site";

const MONTHS = [
  "کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران",
  "تەممووز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم",
];

/** "١٨ تا ٢٤ی تشرینی یەکەم", or across months "٢٨ی ئەیلوول تا ٤ی تشرینی یەکەم". */
export function soraniPeriod(period: string): string {
  const p = periodDates(period);
  if (!p) return "";
  const [a, b] = [p.from, p.to];
  if (a.getUTCMonth() === b.getUTCMonth()) return `${ku(a.getUTCDate())} تا ${ku(b.getUTCDate())}ی ${MONTHS[b.getUTCMonth()]}`;
  return `${ku(a.getUTCDate())}ی ${MONTHS[a.getUTCMonth()]} تا ${ku(b.getUTCDate())}ی ${MONTHS[b.getUTCMonth()]}`;
}

export function moveLabel(e: Pick<ChartEntry, "move" | "change">): string {
  if (e.move === "new") return "نوێ هاتە ناو چارتەکە";
  if (e.move === "same") return "لە شوێنی خۆی ماوە";
  return `${ku(e.change)} پلە ${e.move === "up" ? "سەرکەوت" : "دابەزی"}`;
}

function Move({ e }: { e: ChartEntry }) {
  const label = moveLabel(e);
  if (e.move === "new") {
    return (
      <span className="kc-mv new" title={label}>
        نوێ<span className="sr"> · {label}</span>
      </span>
    );
  }
  if (e.move === "same") {
    return (
      <span className="kc-mv same" title={label}>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6h6" /></svg>
        <span className="sr">{label}</span>
      </span>
    );
  }
  return (
    <span className={`kc-mv ${e.move}`} title={label}>
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d={e.move === "up" ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"} />
      </svg>
      <span aria-hidden="true">{ku(e.change)}</span>
      <span className="sr">{label}</span>
    </span>
  );
}

function Cover({ e, size }: { e: ChartEntry; size: number }) {
  return e.cover ? (
    <img className="kc-cover" src={e.cover} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
  ) : (
    <span className="kc-cover none" aria-hidden="true">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.4" /></svg>
    </span>
  );
}

const title = (e: ChartEntry) => e.title_latin || e.title;
const artist = (e: ChartEntry) => e.artist_latin || e.artist;

function Row({ e }: { e: ChartEntry }) {
  return (
    <li className="kc-row" title={`${e.title} · ${e.artist}`}>
      <span className="kc-n">
        {ku(e.rank)}
        <Move e={e} />
      </span>
      <Cover e={e} size={44} />
      <span className="kc-t">
        <b className="lat" dir="ltr">{title(e)}</b>
        <span className="kc-a">
          <bdi className="lat">{artist(e)}</bdi>
          {e.artist_ckb ? <span className="ckb"> · {e.artist_ckb}</span> : null}
        </span>
      </span>
    </li>
  );
}

/** Korea's top 100 songs this week, under the Seoul and Hawler clocks. */
export function KoreaChart({ week }: { week: ChartWeek | null }) {
  if (!week || week.entries.length < 10) return null;
  const [one, ...rest] = week.entries;
  const top = rest.slice(0, 9);
  const more = rest.slice(9);
  const when = soraniPeriod(week.period);
  return (
    <section className="kchart" aria-labelledby="kchart-h">
      <div className="kc-in">
        <header className="kc-head">
          <h2 id="kchart-h">
            {ku(week.entries.length)} گۆرانییەکەی ئەم هەفتەیەی کۆریا
          </h2>
          <p>
            <span className="kc-bit">چارتی دیجیتاڵی <bdi className="lat">Circle Chart</bdi></span>
            <span className="kc-bit">هەفتەی {ku(week.week)}</span>
            {when ? <span className="kc-bit">{when}</span> : null}
          </p>
        </header>

        <div className="kc-grid">
          <figure className="kc-one" title={`${one.title} · ${one.artist}`}>
            <div className="kc-one-top">
              <span className="kc-one-n" aria-label="یەکەم">{ku(1)}</span>
              <span className="kc-eq" aria-hidden="true"><i /><i /><i /><i /></span>
              <Move e={one} />
            </div>
            <b className="kc-one-t lat" dir="ltr">{title(one)}</b>
            <figcaption className="kc-one-a">
              <Cover e={one} size={56} />
              <span>
                <bdi className="lat">{artist(one)}</bdi>
                {one.artist_ckb ? <small>{one.artist_ckb}</small> : null}
              </span>
            </figcaption>
          </figure>

          <ol className="kc-list kc-top" start={2}>
            {top.map((e) => <Row key={e.id} e={e} />)}
          </ol>
        </div>

        {more.length ? (
          <details className="kc-more">
            <summary>
              <span>ڕیزی {ku(more[0].rank)} تا {ku(more[more.length - 1].rank)}</span>
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
            </summary>
            <ol className="kc-list kc-all" start={more[0].rank}>
              {more.map((e) => <Row key={e.id} e={e} />)}
            </ol>
          </details>
        ) : null}

        <p className="kc-credit">
          سەرچاوە:{" "}
          <a href="https://circlechart.kr/page_chart/onoff.circle?nationGbn=T&serviceGbn=ALL" rel="noopener" className="lat">
            Circle Chart
          </a>{" "}
          (کۆمەڵەی ناوەڕۆکی مۆسیقای کۆریا)، هەر هەفتە خۆی نوێ دەبێتەوە. بەرگی ئەلبوومەکان هی خاوەنەکانیانە.
        </p>
      </div>
    </section>
  );
}
