export const HAND = [
  "M142 76 C128 56 138 36 162 34 C182 33 200 44 222 62 L340 158 C385 198 418 240 440 285 C470 340 468 392 445 420",
  "M142 76 L238 172",
  "M240 60 C244 30 262 10 288 10 C315 10 328 30 326 60 L322 136",
  "M186 238 C190 200 218 172 246 178 L362 312",
  "M118 298 C120 258 142 230 170 230 C186 230 196 244 200 254 L265 345",
  "M62 330 C62 305 85 292 108 296 C120 300 126 310 130 320 L182 415",
  "M62 330 C58 380 70 430 72 460 C62 482 56 496 56 510",
  "M74 465 C78 490 82 510 88 528",
  "M445 420 C405 455 350 500 332 552",
];
export const RAYS = Array.from({ length: 21 }, (_, i) => i);

/** The approved finger-heart mark with the 21-ray sun. `animated` draws it in once. */
export function Mark({ size = 34, animated = false, ink = "var(--plum)" }: { size?: number; animated?: boolean; ink?: string }) {
  return (
    <svg className={animated ? "mark mark-anim" : "mark"} viewBox="-50 -50 100 100" width={size} height={size} aria-hidden="true">
      <g transform="translate(-30.7 -11) scale(0.105)" fill="none" stroke={ink} strokeWidth="23" strokeLinecap="round" strokeLinejoin="round">
        {HAND.map((d, i) => (
          <path key={i} d={d} pathLength={1} className="mk-hand" style={{ ["--i" as string]: i }} />
        ))}
        <ellipse cx="170" cy="56" rx="19" ry="12" transform="rotate(32 170 56)" pathLength={1} className="mk-hand" />
      </g>
      <g stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round">
        {RAYS.map((i) => (
          <g key={i} transform={`rotate(${((i * 360) / 21).toFixed(3)} -2.5 -30.5)`}>
            <line x1="-2.5" y1="-40" x2="-2.5" y2="-45.5" className="mk-ray" style={{ ["--i" as string]: i }} />
          </g>
        ))}
      </g>
      <g transform="translate(-2.5 -30.5)">
        <path
          className="mk-heart"
          transform="scale(1.3)"
          d="M0 3.6 C -5 0.5 -5.4 -2.8 -3.2 -4 C -1.6 -4.8 -0.4 -4 0 -2.8 C 0.4 -4 1.6 -4.8 3.2 -4 C 5.4 -2.8 5 0.5 0 3.6 Z"
          fill="var(--berry)"
        />
      </g>
    </svg>
  );
}

export function Logo({ animated = false, size = 34 }: { animated?: boolean; size?: number }) {
  return (
    <span className="logo" dir="ltr">
      <Mark size={size} animated={animated} />
      <span className="wordmark">
        kur<span>ean</span>
      </span>
    </span>
  );
}

/** The Kurdish sun: 21 rays around a disc, drawn large and cropped behind lead stories. */
export function Sun({ className = "", ray = "var(--gold)", core = "var(--gold)" }: { className?: string; ray?: string; core?: string }) {
  return (
    <svg className={`sun ${className}`} viewBox="-100 -100 200 200" aria-hidden="true">
      <circle r="44" fill={core} className="sun-core" />
      <g stroke={ray} strokeWidth="9" strokeLinecap="round">
        {RAYS.map((i) => {
          const a = (i * 2 * Math.PI) / 21;
          return (
            <line
              key={i}
              className="sun-ray"
              style={{ ["--i" as string]: i }}
              x1={(Math.sin(a) * 58).toFixed(1)}
              y1={(-Math.cos(a) * 58).toFixed(1)}
              x2={(Math.sin(a) * 96).toFixed(1)}
              y2={(-Math.cos(a) * 96).toFixed(1)}
            />
          );
        })}
      </g>
    </svg>
  );
}
