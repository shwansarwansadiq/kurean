/* A scenery story (8.5 s): a Korea landscape or landmark from Pexels with a slow drift, the place name in Sorani,
   the photographer's credit, the Kurean mark, and one of Kurean's own music loops. Inside TikTok/Reels safe areas. */
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, easeOut, LATIN, Mark, SAFE, SORANI, useSpring, useT, Wordmark } from "./brand";

export type SceneryProps = { kind: "photo" | "video"; src: string; placeCkb: string; placeEn: string; photographer: string; music: string };
export const SCENERY_FRAMES = 255;

const media = (src: string) => (/^https?:/.test(src) ? src : staticFile(src));

function Pin() {
  return (
    <svg viewBox="0 0 24 24" width="66" height="66" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill={C.berry} />
      <circle cx="12" cy="10" r="2.8" fill="#fff" />
    </svg>
  );
}

export function Scenery({ kind, src, placeCkb, placeEn, photographer, music }: SceneryProps) {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = useT(0, 14);
  const card = useSpring(18, 15);
  const credit = useT(34, 14);
  const top = useSpring(6, 16);
  const out = interpolate(f, [durationInFrames - 12, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  // A slow drift for photos (videos already move).
  const zoom = interpolate(f, [0, durationInFrames], [1.06, 1.16]);
  const pan = interpolate(f, [0, durationInFrames], [-18, 18]);
  return (
    <AbsoluteFill style={{ background: C.plum }}>
      <Audio
        src={staticFile(`music/${music}.m4a`)}
        volume={(fr) => interpolate(fr, [0, 12, durationInFrames - 30, durationInFrames], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <AbsoluteFill style={{ opacity: fadeIn }}>
        {kind === "video" ? (
          <OffthreadVideo src={media(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Img src={media(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom}) translateX(${pan}px)` }} />
        )}
      </AbsoluteFill>
      {/* Shade only where the words sit, so the picture stays the star */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(42,30,59,0.5) 0%, rgba(42,30,59,0) 22%, rgba(42,30,59,0) 50%, rgba(42,30,59,0.72) 100%)" }} />

      <div style={{ position: "absolute", top: SAFE.top, left: SAFE.left, right: SAFE.right, display: "flex", justifyContent: "flex-end", opacity: top, transform: `translateY(${(1 - top) * -40}px)` }}>
        <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Mark size={84} start={8} />
          <Wordmark size={64} />
        </span>
      </div>

      <div dir="rtl" style={{ position: "absolute", left: SAFE.left, right: SAFE.right, bottom: SAFE.bottom, display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            alignSelf: "flex-start",
            background: "rgba(42,30,59,0.62)",
            border: "2px solid rgba(255,255,255,0.22)",
            borderRadius: 44,
            padding: "26px 34px 30px",
            opacity: card,
            transform: `translateY(${(1 - card) * 120}px)`,
          }}
        >
          <Pin />
          <span style={{ display: "grid" }}>
            <span style={{ font: `900 54px/1.4 ${SORANI}`, color: "#fff", textWrap: "balance" }}>{placeCkb}</span>
            <span dir="ltr" style={{ font: `600 32px/1.3 ${LATIN}`, color: "rgba(255,255,255,0.8)", textAlign: "right" }}>{placeEn}</span>
          </span>
        </div>
        <span dir="ltr" style={{ alignSelf: "flex-start", font: `600 28px/1 ${LATIN}`, color: "rgba(255,255,255,0.88)", opacity: credit, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
          Photo: {photographer} · Pexels
        </span>
      </div>
      <AbsoluteFill style={{ background: C.plum, opacity: out }} />
    </AbsoluteFill>
  );
}
