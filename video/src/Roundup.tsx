/* The day's news in one 9:16 video (Shwan, 6 Nov), posted at 21:00 as a Reel and story with Kurean's own music.
   Intro (date and count) → each story for 3.5 s (photo drifting, number, category, headline) → logo end card.
   All text inside the TikTok/Reels safe area. */
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EndCard, ku, LATIN, Mark, SAFE, SORANI, Sun, tokens, useSpring, useT, Wordmark } from "./brand";

export type RoundupItem = { headline: string; image: string | null; label: string; colour: string };
export type RoundupProps = { dateLabel: string; items: RoundupItem[]; music: string };

export const INTRO = 75;
export const PER_ITEM = 105;
export const OUTRO = 90;
export const roundupFrames = (n: number) => INTRO + Math.max(1, n) * PER_ITEM + OUTRO;

const src = (image: string) => (/^https?:/.test(image) ? image : staticFile(image));

function Words({ text, size, weight = 900 }: { text: string; size: number; weight?: number }) {
  // Each word as its own box with a physical gap (as in News): a Latin run stays whole and on the right side.
  return (
    <>
      {tokens(text).map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            marginLeft: "0.28em",
            ...(w.latin ? { fontFamily: LATIN, fontWeight: weight - 100, direction: "ltr" as const, unicodeBidi: "isolate" as const, fontSize: size * 0.94 } : {}),
          }}
        >
          {w.t}
        </span>
      ))}
    </>
  );
}

function Intro({ dateLabel, count }: { dateLabel: string; count: number }) {
  const f = useCurrentFrame();
  const top = useSpring(4, 16);
  const title = useSpring(10, 15);
  const sub = useT(22, 14);
  const grow = useT(0, 30);
  const out = interpolate(f, [INTRO - 12, INTRO], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.plum, opacity: out }}>
      <div style={{ position: "absolute", left: -560, top: 1180, opacity: 0.22 }}>
        <Sun size={1500} grow={grow} turn={f * 0.3} core={C.berry} />
      </div>
      <div style={{ position: "absolute", top: SAFE.top, left: SAFE.left, right: SAFE.right, display: "flex", justifyContent: "flex-end", opacity: top }}>
        <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Mark size={92} start={2} />
          <Wordmark size={74} />
        </span>
      </div>
      <div dir="rtl" style={{ position: "absolute", left: SAFE.left, right: SAFE.right, top: 700, display: "flex", flexDirection: "column", gap: 28 }}>
        <span style={{ alignSelf: "flex-start", font: `800 40px/1 ${SORANI}`, background: C.gold, color: C.plum, padding: "20px 32px 24px", borderRadius: 999, opacity: sub }}>
          {ku(count)} هەواڵ
        </span>
        <h1 style={{ margin: 0, font: `900 120px/1.25 ${SORANI}`, color: "#fff", opacity: title, transform: `translateY(${(1 - title) * 60}px)` }}>
          هەواڵەکانی ئەمڕۆی کۆریا
        </h1>
        <p style={{ margin: 0, font: `700 52px/1.4 ${SORANI}`, color: "rgba(255,255,255,0.78)", opacity: sub }}>{dateLabel}</p>
      </div>
    </AbsoluteFill>
  );
}

function Item({ item, n, total }: { item: RoundupItem; n: number; total: number }) {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, PER_ITEM], [1.04, 1.14]);
  const fade = interpolate(f, [0, 10, PER_ITEM - 8, PER_ITEM], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panel = useSpring(6, 16);
  const badge = useSpring(2, 13);
  return (
    <AbsoluteFill style={{ background: C.plum, opacity: fade }}>
      {item.image ? (
        <Img src={src(item.image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      ) : (
        <AbsoluteFill style={{ background: item.colour, overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -520, top: -260 }}>
            <Sun size={1700} turn={f * 0.2} core="#fff" coreOpacity={0.16} />
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(42,30,59,0.6) 0%, rgba(42,30,59,0) 28%, rgba(42,30,59,0) 42%, rgba(42,30,59,0.9) 100%)" }} />
      <div style={{ position: "absolute", top: SAFE.top, left: SAFE.left, right: SAFE.right, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ font: `800 38px/1 ${SORANI}`, color: "#fff", background: item.colour, padding: "20px 32px 24px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.4)" }}>{item.label}</span>
        <span style={{ font: `800 40px/1 ${SORANI}`, color: "#fff", textShadow: "0 2px 14px rgba(42,30,59,0.6)" }}>
          {ku(n)} لە {ku(total)}
        </span>
      </div>
      <div
        dir="rtl"
        style={{
          position: "absolute",
          left: SAFE.left - 16,
          right: SAFE.right - 20,
          bottom: SAFE.bottom,
          padding: "44px 52px 50px",
          borderRadius: 56,
          background: "rgba(42,30,59,0.7)",
          border: "2px solid rgba(255,255,255,0.22)",
          opacity: panel,
          transform: `translateY(${(1 - panel) * 140}px)`,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: -54,
            right: 44,
            width: 108,
            height: 108,
            borderRadius: 999,
            background: C.gold,
            color: C.plum,
            display: "grid",
            placeItems: "center",
            font: `900 64px/1 ${SORANI}`,
            transform: `scale(${badge})`,
          }}
        >
          {ku(n)}
        </span>
        <h2 style={{ margin: "26px 0 0", font: `900 66px/1.45 ${SORANI}`, color: "#fff", textWrap: "balance" }}>
          <Words text={item.headline} size={66} />
        </h2>
      </div>
    </AbsoluteFill>
  );
}

export function Roundup({ dateLabel, items, music }: RoundupProps) {
  const { durationInFrames } = useVideoConfig();
  const f = useCurrentFrame();
  const volume = interpolate(f, [0, 15, durationInFrames - 30, durationInFrames], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const end = INTRO + items.length * PER_ITEM;
  return (
    <AbsoluteFill style={{ background: C.plum, fontFamily: SORANI }}>
      <Audio src={staticFile(`music/${music}.m4a`)} loop volume={volume} />
      <Sequence durationInFrames={INTRO}>
        <Intro dateLabel={dateLabel} count={items.length} />
      </Sequence>
      {items.map((item, i) => (
        <Sequence key={i} from={INTRO + i * PER_ITEM} durationInFrames={PER_ITEM}>
          <Item item={item} n={i + 1} total={items.length} />
        </Sequence>
      ))}
      <EndCard start={end} />
    </AbsoluteFill>
  );
}
