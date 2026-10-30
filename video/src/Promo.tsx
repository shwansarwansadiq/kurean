/* Kurean's 9:16 promo (28 s): everything the site does, in the brand's colour chapters.
   1 mark draws itself · 2 "Korean news in Kurdish" · 3 the four categories · 4 every story credited ·
   5 Seoul ↔ Hawler clocks · 6 the weekly top 100 you can play · 7 videos and socials · 8 kurean.news */
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { C, easeOut, EndCard, ku, LATIN, Mark, SAFE, safePad, SORANI, Sun, useSpring, useT, Wordmark, WORD } from "./brand";

export const PROMO_FRAMES = 870;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function Words({ text, start, size, color = "#fff", step = 5, weight = 900 }: { text: string; start: number; size: number; color?: string; step?: number; weight?: number }) {
  const f = useCurrentFrame();
  return (
    <div dir="rtl" style={{ font: `${weight} ${size}px/1.3 ${SORANI}`, color }}>
      {text.split(" ").map((w, i) => {
        const t = interpolate(f, [start + i * step, start + i * step + 12], [0, 1], { ...clamp, easing: easeOut });
        return (
          <span key={i} style={{ display: "inline-block", marginInlineEnd: "0.25em", opacity: t, transform: `translateY(${(1 - t) * 60}px) scale(${0.9 + 0.1 * t})`, filter: `blur(${(1 - t) * 10}px)` }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* 1 — the mark draws itself on blush */
function Intro() {
  const f = useCurrentFrame();
  const word = useSpring(40, 14);
  const ckb = useT(52, 14);
  const out = useT(70, 10);
  return (
    <AbsoluteFill style={{ background: C.blush, alignItems: "center", justifyContent: "center", padding: safePad, opacity: 1 - out }}>
      <div style={{ position: "absolute", width: 2000, left: -460, top: -200, opacity: 0.12 }}>
        <Sun size={2000} grow={useT(10, 40)} turn={f * 0.3} core={C.berry} />
      </div>
      <Mark size={440} start={4} ink={C.plum} />
      <div dir="ltr" style={{ marginTop: 10, transform: `scale(${word})`, font: `800 170px/1 ${WORD}`, color: C.plum }}>
        kur<span style={{ color: C.berry }}>ean</span>
      </div>
      <div style={{ marginTop: 26, opacity: ckb, font: `900 92px/1 ${SORANI}`, color: C.berryDeep }}>کوریەن</div>
    </AbsoluteFill>
  );
}

/* 2 — what it is */
function Promise_() {
  const f = useCurrentFrame();
  const flag = useT(36, 20);
  return (
    <AbsoluteFill style={{ background: C.plum, justifyContent: "center", padding: safePad }}>
      <div style={{ position: "absolute", right: -620, top: -380, opacity: 0.28 }}>
        <Sun size={1700} grow={useT(0, 30)} turn={f * 0.4} core={C.berry} />
      </div>
      <Words text="هەواڵی کۆری" start={4} size={132} />
      <Words text="بە کوردی" start={14} size={132} color={C.gold} />
      <div style={{ marginTop: 50, height: 14, width: `${flag * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, ${C.berry}, ${C.gold})` }} />
      <div dir="rtl" style={{ marginTop: 40, opacity: useT(44, 14), font: `700 54px/1.55 ${SORANI}`, color: "rgba(255,255,255,0.85)" }}>
        کەی-پۆپ، دراما، فیلم و کولتووری کۆری، هەموو ڕۆژێک بە کوردی
      </div>
    </AbsoluteFill>
  );
}

/* 3 — the four categories, each its own album colour */
const CATS = [
  { label: "کەی-پۆپ", line: "گروپ و ئایدڵەکانت", colour: C.berry },
  { label: "دراما و فیلم", line: "زنجیرە و فیلمە نوێکان", colour: C.lilac },
  { label: "کولتوور", line: "خواردن، گەشت و ژیانی کۆری", colour: C.mint },
  { label: "هەواڵی کۆریا", line: "ئەوەی لە کۆریا ڕوودەدات", colour: C.blue },
];
function Categories() {
  const f = useCurrentFrame();
  const STEP = 34;
  return (
    <AbsoluteFill style={{ background: C.plum }}>
      {CATS.map((c, i) => {
        const t = interpolate(f, [i * STEP, i * STEP + 16], [0, 1], { ...clamp, easing: easeOut });
        const h = (1920 - SAFE.top + 60 - SAFE.bottom) / 4;
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: SAFE.top - 60 + i * h, height: h, background: c.colour, transform: `translateX(${(1 - t) * 1080}px)`, display: "flex", alignItems: "center", padding: `0 ${SAFE.right}px 0 ${SAFE.left}px`, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: -260, top: -280, opacity: 0.22 }}>
              <Sun size={760} turn={f * 0.5 + i * 40} core="#fff" coreOpacity={0.4} />
            </div>
            <div dir="rtl" style={{ position: "relative", width: "100%" }}>
              <div style={{ font: `900 104px/1.2 ${SORANI}`, color: "#fff" }}>{c.label}</div>
              <div style={{ font: `700 46px/1.4 ${SORANI}`, color: "rgba(255,255,255,0.92)", opacity: interpolate(f, [i * STEP + 10, i * STEP + 22], [0, 1], clamp) }}>{c.line}</div>
            </div>
            <span style={{ position: "absolute", left: SAFE.left, font: `900 100px/1 ${SORANI}`, color: "rgba(255,255,255,0.35)" }}>{ku(i + 1)}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* 4 — trust: every story checked and credited */
const SOURCES = ["Yonhap News", "Korea Herald", "SBS Star", "Soompi"];
function Credited() {
  const f = useCurrentFrame();
  const check = useSpring(70, 10);
  return (
    <AbsoluteFill style={{ background: C.blush, justifyContent: "center", padding: safePad }}>
      <Words text="هەموو هەواڵێک" start={2} size={104} color={C.plum} />
      <Words text="سەرچاوەکەی لەگەڵدایە" start={10} size={104} color={C.berry} />
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 18 }}>
        {SOURCES.map((s, i) => {
          const t = interpolate(f, [24 + i * 7, 38 + i * 7], [0, 1], { ...clamp, easing: easeOut });
          return (
            <div key={s} dir="rtl" style={{ display: "flex", alignItems: "center", gap: 24, background: "#fff", borderRadius: 32, padding: "20px 32px", boxShadow: "0 18px 40px -26px rgba(42,30,59,0.5)", opacity: t, transform: `translateX(${(1 - t) * 200}px)` }}>
              <span style={{ font: `800 44px/1 ${SORANI}`, color: "#5E4F72" }}>سەرچاوە:</span>
              <span style={{ font: `800 54px/1 ${LATIN}`, color: C.plum }}>{s}</span>
            </div>
          );
        })}
      </div>
      <div dir="rtl" style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 24, opacity: Math.min(1, check * 1.3) }}>
        <span style={{ width: 96, height: 96, borderRadius: 999, background: C.mint, display: "grid", placeItems: "center", transform: `scale(${check})` }}>
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <span style={{ font: `800 50px/1.4 ${SORANI}`, color: C.plum }}>پێش بڵاوکردنەوە دەخوێنرێتەوە</span>
      </div>
    </AbsoluteFill>
  );
}

/* 5 — Seoul and Hawler, six hours apart */
function Clock({ city, time, note, bg, fg, start, top }: { city: string; time: string; note: string; bg: string; fg: string; start: number; top: boolean }) {
  const s = useSpring(start, 14);
  return (
    <div style={{ flex: top ? "0 0 880px" : 1, background: bg, color: fg, display: "flex", flexDirection: "column", justifyContent: top ? "flex-end" : "flex-start", padding: top ? `0 ${SAFE.right}px 70px ${SAFE.left}px` : `80px ${SAFE.right}px 0 ${SAFE.left}px`, transform: `translateY(${(1 - s) * 300}px)`, opacity: Math.min(1, s * 1.4) }}>
      <div dir="rtl" style={{ font: `800 60px/1.3 ${SORANI}`, opacity: 0.9 }}>{city}</div>
      <div dir="ltr" style={{ font: `800 250px/1 ${LATIN}`, letterSpacing: "-0.04em", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{time}</div>
      <div dir="rtl" style={{ font: `800 52px/1.4 ${SORANI}` }}>{note}</div>
    </div>
  );
}
function Clocks() {
  const f = useCurrentFrame();
  const m = 25 + Math.floor(f / 20); // the minutes tick on
  const mm = String(m % 60).padStart(2, "0");
  return (
    <AbsoluteFill style={{ background: C.plum, display: "flex", flexDirection: "column" }}>
      <Clock city="ئێستا لە سیئۆڵ" time={`20:${mm}`} note="کاتی پەخشی دراماکانە" bg={C.plum} fg="#fff" start={0} top />
      <Clock city="ئێستا لە هەولێر" time={`14:${mm}`} note="کۆریا ٦ کاتژمێر لە پێشەوەیە" bg={C.gold} fg={C.plum} start={8} top={false} />
    </AbsoluteFill>
  );
}

/* 6 — the weekly top 100, playable */
const TOP = [
  ["NEON", "A2O, A2O LITE"],
  ["Toesahalgeyeo", "SOYEON"],
  ["LOVE ATTACK", "RESCENE"],
  ["REDRED", "CORTIS"],
  ["BAD", "ATEEZ"],
  ["Looks Can Kill", "IVE"],
  ["LEMONADE", "aespa"],
  ["CRASH", "ALLDAY PROJECT"],
  ["I SPY", "NCT WISH"],
  ["Whiplash", "aespa"],
];
function TopHundred() {
  const f = useCurrentFrame();
  const head = useSpring(2, 15);
  const press = interpolate(f, [92, 98, 104], [1, 0.9, 1], clamp);
  const playing = f >= 100;
  const player = useSpring(104, 15);
  return (
    <AbsoluteFill style={{ background: C.mist, padding: `${SAFE.top}px ${SAFE.right}px 0 ${SAFE.left}px` }}>
      <div dir="rtl" style={{ opacity: head, transform: `translateY(${(1 - head) * -40}px)` }}>
        <div style={{ font: `900 96px/1.25 ${SORANI}`, color: C.plum }}>١٠٠ گۆرانیی کۆریا</div>
        <div style={{ font: `800 44px/1.4 ${SORANI}`, color: C.berry }}>هەر هەفتە، ڕیزبەندیی <span style={{ fontFamily: LATIN, whiteSpace: "nowrap" }}>Circle Chart</span></div>
      </div>
      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14 }}>
        {TOP.slice(0, 5).map(([t, a], i) => {
          const s = interpolate(f, [14 + i * 5, 28 + i * 5], [0, 1], { ...clamp, easing: easeOut });
          const first = i === 0;
          return (
            <div key={i} dir="rtl" style={{ display: "grid", gridTemplateColumns: "80px 96px 1fr", alignItems: "center", gap: 22, background: first ? C.berry : "#fff", color: first ? "#fff" : C.plum, borderRadius: 30, padding: "18px 26px", opacity: s, transform: `translateX(${(1 - s) * 160}px)` }}>
              <span style={{ font: `900 ${first ? 84 : 58}px/1 ${SORANI}`, color: first ? C.gold : C.berryDeep, textAlign: "center" }}>{ku(i + 1)}</span>
              <span style={{ width: 96, height: 96, borderRadius: 20, background: first ? C.plum : C.lilac, display: "grid", placeItems: "center", transform: first ? `scale(${press})` : undefined }}>
                {first && playing ? (
                  <span style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 50 }}>
                    {[0, 1, 2, 3].map((k) => (
                      <i key={k} style={{ width: 10, height: 50, borderRadius: 4, background: C.gold, transform: `scaleY(${0.3 + 0.7 * Math.abs(Math.sin((f + k * 7) / 5))})`, transformOrigin: "bottom" }} />
                    ))}
                  </span>
                ) : (
                  <svg viewBox="0 0 16 16" width="44" height="44"><path d="M5 3.5v9l7.5-4.5z" fill="#fff" /></svg>
                )}
              </span>
              <span style={{ minWidth: 0 }}>
                <b dir="ltr" style={{ display: "block", font: `800 46px/1.2 ${LATIN}`, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</b>
                <span dir="ltr" style={{ display: "block", font: `600 32px/1.3 ${LATIN}`, textAlign: "right", opacity: 0.7 }}>{a}</span>
              </span>
            </div>
          );
        })}
      </div>
      {/* the player card rising, like on the site */}
      <div style={{ position: "absolute", left: SAFE.left - 20, right: SAFE.right - 30, bottom: SAFE.bottom - 20, background: C.plum, borderRadius: 44, padding: 22, transform: `translateY(${(1 - player) * 900}px)`, boxShadow: "0 40px 90px -30px rgba(42,30,59,0.8)" }}>
        <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: 22, padding: "4px 8px 22px" }}>
          <span style={{ width: 70, height: 70, borderRadius: 999, background: C.gold, color: C.plum, display: "grid", placeItems: "center", font: `900 40px/1 ${SORANI}` }}>١</span>
          <span style={{ font: `800 50px/1.2 ${LATIN}`, color: "#fff" }}>NEON</span>
          <span style={{ marginInlineStart: "auto", font: `800 44px/1 ${SORANI}`, color: "#fff", background: C.berry, padding: "18px 30px 24px", borderRadius: 999 }}>بیکەرەوە</span>
        </div>
        <div style={{ height: 300, borderRadius: 28, background: `linear-gradient(135deg, ${C.berry}, ${C.lilac} 55%, ${C.blue})`, display: "grid", placeItems: "center", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", opacity: 0.35 }}>
            <Sun size={900} turn={f * 0.8} core="#fff" coreOpacity={0.3} />
          </div>
          <div dir="rtl" style={{ position: "relative", font: `900 54px/1.4 ${SORANI}`, color: "#fff", textAlign: "center" }}>
            هەموو ١٠٠ گۆرانییەکە
            <br />
            لە کوریەندا لێبدە
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* 7 — videos and socials */
const NETS = ["Instagram", "TikTok", "Facebook"];
function Socials() {
  const f = useCurrentFrame();
  const phone = useSpring(4, 16);
  return (
    <AbsoluteFill style={{ background: C.plum, alignItems: "center", justifyContent: "center", padding: safePad }}>
      <div style={{ position: "absolute", left: -600, bottom: -700, opacity: 0.2 }}>
        <Sun size={1800} turn={-f * 0.3} core={C.berry} />
      </div>
      <div dir="rtl" style={{ textAlign: "center", marginBottom: 36, opacity: useT(0, 14) }}>
        <div style={{ font: `900 92px/1.3 ${SORANI}`, color: "#fff" }}>ڤیدیۆ و هەواڵ</div>
        <div style={{ font: `800 48px/1.4 ${SORANI}`, color: C.gold }}>لە پەڕەکانی سۆشیاڵ میدیاشدا</div>
      </div>
      {/* a phone showing a story card */}
      <div style={{ width: 330, height: 586, borderRadius: 54, background: C.plum, border: "14px solid #120c1c", transform: `translateY(${(1 - phone) * 400}px) rotate(${(1 - phone) * -8}deg)`, overflow: "hidden", position: "relative", boxShadow: "0 50px 100px -30px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "absolute", left: -260, top: -240, opacity: 0.5 }}>
          <Sun size={800} turn={f * 0.6} core={C.berry} coreOpacity={0.9} />
        </div>
        <div dir="ltr" style={{ position: "absolute", top: 60, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
          <Mark size={56} start={10} />
          <Wordmark size={44} />
        </div>
        <div dir="rtl" style={{ position: "absolute", left: 26, right: 26, bottom: 40, background: "rgba(42,30,59,0.72)", borderRadius: 30, padding: "26px 28px", font: `900 32px/1.5 ${SORANI}`, color: "#fff" }}>
          هەواڵی ئەمڕۆ لە ١١ چرکەدا
        </div>
      </div>
      <div style={{ marginTop: 36, display: "flex", gap: 14 }}>
        {NETS.map((n, i) => {
          const s = useSpring(30 + i * 6, 12);
          return (
            <span key={n} style={{ transform: `scale(${s})`, font: `800 34px/1 ${LATIN}`, color: C.plum, background: "#fff", padding: "18px 24px", borderRadius: 999 }}>
              {n}
            </span>
          );
        })}
      </div>
      <div dir="ltr" style={{ marginTop: 26, font: `800 60px/1 ${LATIN}`, color: "#fff", opacity: useT(52, 12) }}>@kurean.news</div>
    </AbsoluteFill>
  );
}

const SCENES: [number, number, () => React.ReactElement][] = [
  [0, 82, Intro],
  [80, 100, Promise_],
  [178, 150, Categories],
  [326, 120, Credited],
  [444, 100, Clocks],
  [542, 170, TopHundred],
  [710, 100, Socials],
];

export function Promo() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.plum, fontFamily: SORANI }}>
      {SCENES.map(([from, len, Scene], i) => {
        // each scene wipes in from the bottom over the last one
        const local = f - from;
        const wipe = i === 0 ? 0 : interpolate(local, [0, 12], [100, 0], { ...clamp, easing: easeOut });
        return (
          <Sequence key={i} from={from} durationInFrames={len + 12}>
            <AbsoluteFill style={{ clipPath: `inset(${wipe}% 0 0 0)` }}>
              <Scene />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <Sequence from={806}>
        <EndCard start={0} />
      </Sequence>
    </AbsoluteFill>
  );
}
