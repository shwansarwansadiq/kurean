/* The weekly chart as a 10 → 1 countdown (about 18 s). Each song gets its moment; number one lands on berry
   with the sun turning behind it; the logo card closes. Safe zones: top 220 px, bottom 250 px. */
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EndCard, ku, LATIN, Mark, SAFE, SORANI, Sun, tokens, useSpring, useT, Wordmark, easeOut } from "./brand";

export type ChartItem = { rank: number; title: string; artist: string; artist_ckb: string | null; move: "up" | "down" | "same" | "new"; change: number };
export type ChartProps = { week: number; top: ChartItem[] };

const INTRO = 54;
const STEP = 36;
const ONE_AT = INTRO + 9 * STEP; // 378
const END_AT = ONE_AT + 96; // 474
export const CHART_FRAMES = END_AT + 66; // 540

function MovePill({ m, big = false }: { m: ChartItem; big?: boolean }) {
  const size = big ? 46 : 40;
  const base = { display: "inline-flex", alignItems: "center", gap: 10, font: `800 ${size}px/1 ${SORANI}`, padding: big ? "18px 30px 22px" : "16px 26px 20px", borderRadius: 999 } as const;
  if (m.move === "new") return <span style={{ ...base, background: C.gold, color: C.plum }}>نوێ لە ڕیزبەندیدا</span>;
  if (m.move === "same") return <span style={{ ...base, background: "rgba(255,255,255,0.14)", color: "#fff" }}>لە شوێنی خۆی</span>;
  const up = m.move === "up";
  return (
    <span style={{ ...base, background: up ? "rgba(63,168,142,0.28)" : "rgba(232,80,138,0.28)", color: up ? "#8EF0D2" : "#FFB0CC" }}>
      <svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={up ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"} />
      </svg>
      {ku(m.change)} پلە {up ? "سەرکەوت" : "دابەزی"}
    </span>
  );
}

function Ladder({ current }: { current: number }) {
  return (
    <div dir="rtl" style={{ position: "absolute", top: SAFE.top + 110, left: SAFE.left, right: SAFE.right, display: "flex", justifyContent: "space-between" }}>
      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => {
        const on = r === current;
        const done = r > current;
        return (
          <span
            key={r}
            style={{
              width: 70,
              height: 70,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              font: `900 36px/1 ${SORANI}`,
              background: on ? C.gold : done ? "rgba(255,255,255,0.14)" : "transparent",
              color: on ? C.plum : "rgba(255,255,255,0.7)",
              border: on || done ? "none" : "2px solid rgba(255,255,255,0.2)",
              transform: `scale(${on ? 1.15 : 1})`,
            }}
          >
            {ku(r)}
          </span>
        );
      })}
    </div>
  );
}

function RankScene({ m, start }: { m: ChartItem; start: number }) {
  const f = useCurrentFrame();
  const num = useSpring(start, 12);
  const title = useSpring(start + 5, 15);
  const artist = useT(start + 10, 12);
  const pill = useSpring(start + 14, 11);
  const out = interpolate(f, [start + STEP - 7, start + STEP], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  if (f < start || f >= start + STEP) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: SAFE.left, right: SAFE.right, top: SAFE.top + 220, bottom: SAFE.bottom, display: "flex", flexDirection: "column", justifyContent: "center", gap: 34, opacity: 1 - out, transform: `translateX(${-out * 160}px)` }}>
      <span style={{ font: `900 300px/0.9 ${SORANI}`, color: C.gold, transform: `scale(${1.6 - 0.6 * num})`, opacity: Math.min(1, num * 1.5), transformOrigin: "right center" }}>{ku(m.rank)}</span>
      <b dir="ltr" style={{ font: `800 88px/1.08 ${LATIN}`, color: "#fff", textAlign: "right", letterSpacing: "-0.02em", opacity: title, transform: `translateY(${(1 - title) * 60}px)`, overflowWrap: "anywhere" }}>
        {m.title}
      </b>
      <span style={{ font: `700 52px/1.4 ${SORANI}`, color: "rgba(255,255,255,0.8)", opacity: artist }}>
        <bdi style={{ fontFamily: LATIN, fontWeight: 700 }}>{m.artist}</bdi>
        {m.artist_ckb ? ` · ${m.artist_ckb}` : ""}
      </span>
      <span style={{ transform: `scale(${pill})`, transformOrigin: "right center", alignSelf: "flex-start" }}>
        <MovePill m={m} />
      </span>
    </div>
  );
}

function NumberOne({ m, week }: { m: ChartItem; week: number }) {
  const f = useCurrentFrame();
  const wipe = interpolate(f, [ONE_AT, ONE_AT + 14], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const burst = useT(ONE_AT + 4, 26);
  const num = useSpring(ONE_AT + 8, 9);
  const title = useSpring(ONE_AT + 18, 14);
  const rest = useT(ONE_AT + 28, 14);
  if (f < ONE_AT) return null;
  return (
    <AbsoluteFill style={{ background: C.berry, clipPath: `inset(${wipe}% 0 0 0)` }}>
      <div style={{ position: "absolute", left: -560, top: 140, opacity: 0.5 }}>
        <Sun size={2200} grow={burst} turn={(f - ONE_AT) * 0.4} core={C.gold} coreOpacity={0.35} />
      </div>
      <div dir="rtl" style={{ position: "absolute", left: SAFE.left, right: SAFE.right, top: SAFE.top + 180, bottom: SAFE.bottom, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        <span style={{ font: `800 50px/1 ${SORANI}`, color: C.plum, background: C.gold, alignSelf: "flex-start", padding: "20px 34px 26px", borderRadius: 999, opacity: rest }}>
          یەکەمی هەفتەی {ku(week)}
        </span>
        <span style={{ font: `900 400px/0.85 ${SORANI}`, color: C.gold, transform: `scale(${0.4 + 0.6 * num})`, transformOrigin: "right center", textShadow: "0 30px 80px rgba(42,30,59,0.35)" }}>{ku(1)}</span>
        <b dir="ltr" style={{ font: `800 100px/1.04 ${LATIN}`, color: "#fff", textAlign: "right", letterSpacing: "-0.03em", opacity: title, transform: `translateY(${(1 - title) * 70}px)`, overflowWrap: "anywhere" }}>
          {m.title}
        </b>
        <span style={{ font: `800 58px/1.4 ${SORANI}`, color: "#fff", opacity: rest }}>
          <bdi style={{ fontFamily: LATIN }}>{m.artist}</bdi>
          {m.artist_ckb ? ` · ${m.artist_ckb}` : ""}
        </span>
        <span style={{ opacity: rest, alignSelf: "flex-start" }}>
          <MovePill m={m} big />
        </span>
      </div>
    </AbsoluteFill>
  );
}

export function Chart({ week, top }: ChartProps) {
  const f = useCurrentFrame();
  const head = useSpring(4, 16);
  const ladder = useT(30, 14);
  const current = f < INTRO ? 11 : f >= ONE_AT ? 1 : 10 - Math.floor((f - INTRO) / STEP);
  const titleWords = tokens("١٠ گۆرانیی سەرەوەی کۆریا");
  const introOut = useT(INTRO - 8, 8);
  const sub = useT(26, 12);
  return (
    <AbsoluteFill style={{ background: C.plum, fontFamily: SORANI, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -700, top: 900, opacity: 0.16 }}>
        <Sun size={1900} turn={f * 0.15} core={C.berry} />
      </div>

      <div style={{ position: "absolute", top: SAFE.top, left: SAFE.left, right: SAFE.right, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: head, transform: `translateY(${(1 - head) * -50}px)` }}>
        <span style={{ font: `800 40px/1 ${SORANI}`, color: C.plum, background: C.gold, padding: "22px 34px 26px", borderRadius: 999 }}>ڕیزبەندیی هەفتە</span>
        <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Mark size={88} start={6} />
          <Wordmark size={70} />
        </span>
      </div>

      <div style={{ opacity: ladder }}>
        <Ladder current={current} />
      </div>

      {/* Intro title */}
      {f < INTRO ? (
        <div dir="rtl" style={{ position: "absolute", left: SAFE.left, right: SAFE.right, top: 560, opacity: 1 - introOut }}>
          <h1 style={{ margin: 0, font: `900 124px/1.3 ${SORANI}`, color: "#fff" }}>
            {titleWords.map((w, i) => {
              const t = interpolate(f, [8 + i * 5, 20 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
              return (
                <span key={i} style={{ display: "inline-block", marginInlineEnd: "0.25em", opacity: t, transform: `translateY(${(1 - t) * 50}px)` }}>
                  {w.t}
                </span>
              );
            })}
          </h1>
          <p style={{ margin: "20px 0 0", font: `700 58px/1.4 ${SORANI}`, color: "rgba(255,255,255,0.75)", opacity: sub }}>
            هەفتەی {ku(week)} · <span style={{ fontFamily: LATIN }}>Circle Chart</span>
          </p>
        </div>
      ) : null}

      {top
        .filter((m) => m.rank >= 2 && m.rank <= 10)
        .map((m) => (
          <RankScene key={m.rank} m={m} start={INTRO + (10 - m.rank) * STEP} />
        ))}

      {top[0] ? <NumberOne m={top[0]} week={week} /> : null}
      <EndCard start={END_AT} />
    </AbsoluteFill>
  );
}
