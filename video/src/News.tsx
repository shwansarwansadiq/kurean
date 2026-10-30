/* A news story as a 9:16 video (11 s): the photo slowly zooms, the headline arrives word by word,
   the three key points follow, and the logo card closes. Safe zones: top 220 px, bottom 250 px. */
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, EndCard, LATIN, Mark, SORANI, Sun, tokens, useSpring, useT, Wordmark } from "./brand";

export type NewsProps = { headline: string; points: string[]; image: string | null; label: string; colour: string };

export const NEWS_FRAMES = 330;
const POINTS_AT = 150;
const END_AT = 268;

const src = (image: string) => (/^https?:/.test(image) ? image : staticFile(image));

function Headline({ text, start }: { text: string; start: number }) {
  const f = useCurrentFrame();
  const words = tokens(text);
  return (
    <h1 dir="rtl" style={{ margin: 0, font: `900 92px/1.42 ${SORANI}`, color: "#fff", textWrap: "balance" }}>
      {words.map((w, i) => {
        const t = interpolate(f, [start + i * 4, start + i * 4 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginInlineEnd: "0.28em",
              opacity: t,
              transform: `translateY(${(1 - t) * 40}px)`,
              filter: `blur(${(1 - t) * 8}px)`,
              ...(w.latin ? { fontFamily: LATIN, fontWeight: 800, direction: "ltr", unicodeBidi: "isolate" } : {}),
            }}
          >
            {w.t}
          </span>
        );
      })}
    </h1>
  );
}

function Point({ text, index, start }: { text: string; index: number; start: number }) {
  const s = useSpring(start + index * 24, 15);
  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 30,
        opacity: Math.min(1, s * 1.4),
        transform: `translateX(${(1 - s) * 140}px)`,
        background: "rgba(42,30,59,0.78)",
        border: "2px solid rgba(255,255,255,0.18)",
        borderRadius: 40,
        padding: "34px 40px",
      }}
    >
      <span style={{ flex: "none", width: 76, height: 76, borderRadius: 999, background: C.gold, color: C.plum, display: "grid", placeItems: "center", font: `900 44px/1 ${SORANI}` }}>
        {"١٢٣"[index]}
      </span>
      <span style={{ font: `800 54px/1.5 ${SORANI}`, color: "#fff" }}>
        {tokens(text).map((w, i) => (
          <span key={i} style={w.latin ? { fontFamily: LATIN, fontWeight: 700, direction: "ltr", unicodeBidi: "isolate" } : undefined}>
            {w.t}{" "}
          </span>
        ))}
      </span>
    </div>
  );
}

export function News({ headline, points, image, label, colour }: NewsProps) {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, NEWS_FRAMES], [1.04, 1.18]);
  const fadeIn = useT(0, 18);
  const top = useSpring(6, 16);
  const panel = useSpring(18, 16);
  const toPoints = useT(POINTS_AT - 14, 16);
  const shade = interpolate(f, [POINTS_AT - 14, POINTS_AT + 6], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.plum, fontFamily: SORANI }}>
      {/* Photo, or the category colour with a turning sun */}
      <AbsoluteFill style={{ opacity: fadeIn }}>
        {image ? (
          <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
        ) : (
          <AbsoluteFill style={{ background: colour, overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -520, top: -260 }}>
              <Sun size={1700} turn={f * 0.2} core="#fff" coreOpacity={0.16} />
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(42,30,59,0.55) 0%, rgba(42,30,59,0) 26%, rgba(42,30,59,0) 45%, rgba(42,30,59,0.85) 100%)" }} />
      <AbsoluteFill style={{ background: C.plum, opacity: shade }} />

      {/* Top: logo and category */}
      <div style={{ position: "absolute", top: 220, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: top, transform: `translateY(${(1 - top) * -60}px)` }}>
        <span style={{ font: `800 40px/1 ${SORANI}`, color: "#fff", background: colour, padding: "22px 34px 26px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.4)" }}>{label}</span>
        <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Mark size={92} start={10} />
          <Wordmark size={74} />
        </span>
      </div>

      {/* Headline panel */}
      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 280,
          padding: "52px 56px 56px",
          borderRadius: 56,
          background: "rgba(42,30,59,0.62)",
          border: "2px solid rgba(255,255,255,0.22)",
          opacity: panel * (1 - toPoints),
          transform: `translateY(${(1 - panel) * 200 - toPoints * 80}px)`,
        }}
      >
        <Headline text={headline} start={26} />
      </div>

      {/* Key points */}
      {f >= POINTS_AT - 4 ? (
        <div style={{ position: "absolute", left: 48, right: 48, bottom: 300, display: "flex", flexDirection: "column", gap: 26 }}>
          {points.slice(0, 3).map((p, i) => (
            <Point key={i} text={p} index={i} start={POINTS_AT} />
          ))}
        </div>
      ) : null}

      <EndCard start={END_AT} />
    </AbsoluteFill>
  );
}
