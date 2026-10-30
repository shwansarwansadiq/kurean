/* Kurean's brand for video: colours, fonts (self-hosted, so renders never depend on a font server), the mark and the sun. */
import "@fontsource/noto-kufi-arabic/500.css";
import "@fontsource/noto-kufi-arabic/700.css";
import "@fontsource/noto-kufi-arabic/800.css";
import "@fontsource/noto-kufi-arabic/900.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/baloo-2/800.css";
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { HAND, RAYS } from "../../src/components/Logo";

export const C = {
  berry: "#E8508A",
  berryDeep: "#B8336A",
  plum: "#2A1E3B",
  blush: "#FFF2F7",
  gold: "#FFB938",
  lilac: "#9B7BEA",
  mist: "#EEE8FF",
  mint: "#3FA88E",
  blue: "#3A5BD9",
};
export const SORANI = '"Rabar", "Noto Kufi Arabic", sans-serif';
export const LATIN = '"Inter", sans-serif';
export const WORD = '"Baloo 2", "Inter", sans-serif';

export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

/** TikTok/Reels safe area on 1080×1920: the top bar, the right-hand buttons (like, comment, share)
    and the caption + username at the bottom cover these margins, so text and logos stay inside. */
export const SAFE = { top: 230, right: 180, bottom: 470, left: 64 };
export const safePad = `${SAFE.top}px ${SAFE.right}px ${SAFE.bottom}px ${SAFE.left}px`;

/** 0→1 over [from, from+len] with the brand's ease-out. */
export function useT(from: number, len: number) {
  const f = useCurrentFrame();
  return interpolate(f, [from, from + len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
}

export function useSpring(from: number, damping = 14) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - from, fps, config: { damping, stiffness: 140, mass: 0.8 } });
}

const DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const ku = (n: number | string) => String(n).replace(/\d/g, (d) => DIGITS[Number(d)]);

/** Sorani text with Latin names kept whole and set in Inter (so "Park Bo Gum" never reverses). */
export function tokens(text: string): { t: string; latin: boolean }[] {
  const re = /«?[A-Za-z0-9][A-Za-z0-9.'’&:!?\-]*(?:\s+[A-Za-z0-9][A-Za-z0-9.'’&:!?\-]*)*»?/g;
  const out: { t: string; latin: boolean }[] = [];
  let last = 0;
  const push = (s: string) => s.split(/\s+/).filter(Boolean).forEach((w) => out.push({ t: w, latin: false }));
  for (const m of text.matchAll(re)) {
    if (!/[A-Za-z]/.test(m[0])) continue;
    push(text.slice(last, m.index));
    out.push({ t: m[0], latin: true });
    last = (m.index ?? 0) + m[0].length;
  }
  push(text.slice(last));
  return out;
}

/** The finger-heart mark, drawn in from `start`: the hand's strokes, then the 21 rays, then the heart. */
export function Mark({ size, start, ink = "#fff" }: { size: number; start: number; ink?: string }) {
  const f = useCurrentFrame();
  const draw = (i: number) => interpolate(f, [start + i * 2, start + i * 2 + 16], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const ray = (i: number) => interpolate(f, [start + 18 + i * 0.8, start + 26 + i * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const heart = spring({ frame: f - (start + 30), fps: 30, config: { damping: 9, stiffness: 160 } });
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size}>
      <g transform="translate(-30.7 -11) scale(0.105)" fill="none" stroke={ink} strokeWidth="23" strokeLinecap="round" strokeLinejoin="round">
        {HAND.map((d, i) => (
          <path key={i} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={draw(i)} />
        ))}
        <ellipse cx="170" cy="56" rx="19" ry="12" transform="rotate(32 170 56)" pathLength={1} strokeDasharray="1" strokeDashoffset={draw(9)} />
      </g>
      <g stroke={C.gold} strokeWidth="2.2" strokeLinecap="round">
        {RAYS.map((i) => (
          <g key={i} transform={`rotate(${((i * 360) / 21).toFixed(3)} -2.5 -30.5)`}>
            <line x1="-2.5" y1="-40" x2="-2.5" y2="-45.5" opacity={ray(i)} transform={`translate(0 ${(1 - ray(i)) * 4})`} />
          </g>
        ))}
      </g>
      <g transform={`translate(-2.5 -30.5) scale(${1.3 * heart})`}>
        <path d="M0 3.6 C -5 0.5 -5.4 -2.8 -3.2 -4 C -1.6 -4.8 -0.4 -4 0 -2.8 C 0.4 -4 1.6 -4.8 3.2 -4 C 5.4 -2.8 5 0.5 0 3.6 Z" fill={C.berry} />
      </g>
    </svg>
  );
}

/** The 21-ray Kurdish sun; `grow` 0→1 extends the rays, `turn` rotates it in degrees. */
export function Sun({ size, grow = 1, turn = 0, ray = C.gold, core = C.gold, coreOpacity = 1 }: { size: number; grow?: number; turn?: number; ray?: string; core?: string; coreOpacity?: number }) {
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} style={{ transform: `rotate(${turn}deg)` }}>
      <circle r={44 * (0.6 + 0.4 * grow)} fill={core} opacity={coreOpacity} />
      <g stroke={ray} strokeWidth="9" strokeLinecap="round">
        {RAYS.map((i) => {
          const a = (i * 2 * Math.PI) / 21;
          const r2 = 58 + 38 * grow;
          return <line key={i} x1={(Math.sin(a) * 58).toFixed(1)} y1={(-Math.cos(a) * 58).toFixed(1)} x2={(Math.sin(a) * r2).toFixed(1)} y2={(-Math.cos(a) * r2).toFixed(1)} opacity={grow} />;
        })}
      </g>
    </svg>
  );
}

export function Wordmark({ size }: { size: number }) {
  return (
    <span dir="ltr" style={{ font: `800 ${size}px/1 ${WORD}`, color: "#fff", letterSpacing: "-0.01em" }}>
      kur<span style={{ color: C.berry }}>ean</span>
    </span>
  );
}

/** The closing card shared by every video: plum field opening from the centre, the mark drawing itself, the address. */
export function EndCard({ start }: { start: number }) {
  const f = useCurrentFrame();
  const open = interpolate(f, [start, start + 16], [0, 150], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const txt = useT(start + 34, 14);
  const pill = useSpring(start + 42);
  const sunGrow = useT(start + 6, 30);
  const word = useT(start + 26, 12);
  if (f < start) return null;
  return (
    <div style={{ position: "absolute", inset: 0, background: C.plum, clipPath: `circle(${open}% at 50% 50%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, padding: safePad }}>
      <div style={{ position: "absolute", width: 1600, height: 1600, left: -260, top: 160, opacity: 0.12 }}>
        <Sun size={1600} grow={sunGrow} turn={(f - start) * 0.25} core={C.berry} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }} dir="ltr">
        <Mark size={220} start={start + 8} />
        <span style={{ opacity: word }}>
          <Wordmark size={140} />
        </span>
      </div>
      <div dir="rtl" style={{ opacity: txt, transform: `translateY(${(1 - txt) * 30}px)`, font: `800 58px/1.5 ${SORANI}`, color: "#fff", textAlign: "center" }}>
        هەواڵی کۆری بە کوردی
      </div>
      <div dir="ltr" style={{ transform: `scale(${pill})`, font: `800 64px/1 ${LATIN}`, background: "#fff", color: C.berryDeep, padding: "30px 54px", borderRadius: 999 }}>
        kurean.news
      </div>
    </div>
  );
}
