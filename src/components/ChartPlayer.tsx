"use client";
/**
 * Plays the chart's official YouTube videos inside Kurean with YouTube's own embedded player (youtube-nocookie,
 * loaded only after a tap). The video stays visible (YouTube's rules: no audio-only, at least 200×200 px).
 * The rows are server-rendered links to YouTube; this only takes over their clicks, so without script they still work.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type QueueItem = { rank: number; yt: string; title: string; artist: string; spotify: string | null }; // a Spotify link (track or search)

type YTPlayer = { loadVideoById(id: string): void; destroy(): void };
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube player did not load"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const DIGITS = "٠١٢٣٤٥٦٧٨٩";
const ku = (n: number) => String(n).replace(/\d/g, (d) => DIGITS[Number(d)]);

export function ChartPlayer({ queue }: { queue: QueueItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const indexRef = useRef<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  indexRef.current = index;

  const next = useCallback(() => {
    setIndex((i) => (i === null ? 0 : i + 1 < queue.length ? i + 1 : null));
  }, [queue.length]);

  // Clicks on any play link or "play all" in the chart.
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const el = (ev.target as Element | null)?.closest<HTMLElement>("[data-yt], [data-yt-all]");
      if (!el) return;
      const i = el.hasAttribute("data-yt-all") ? 0 : queue.findIndex((q) => String(q.rank) === el.dataset.yt);
      if (i < 0) return;
      ev.preventDefault();
      returnFocus.current = el;
      setFailed(false);
      setOpen(true);
      setIndex(i);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [queue]);

  // Start or switch the video.
  useEffect(() => {
    if (index === null) return;
    const item = queue[index];
    if (!item) return;
    let cancelled = false;
    if (player.current) {
      player.current.loadVideoById(item.yt);
      return;
    }
    loadApi()
      .then((YT) => {
        if (cancelled || !host.current) return;
        const mount = document.createElement("div");
        host.current.replaceChildren(mount);
        player.current = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId: item.yt,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
          events: {
            onStateChange: (e: { data: number }) => {
              if (e.data === 0) next(); // ended → the next song down the chart
            },
            onError: () => next(), // removed or region-blocked: skip it
          },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [index, queue, next]);

  // Mark the playing row in the chart.
  useEffect(() => {
    const rank = index === null ? null : queue[index]?.rank;
    document.querySelectorAll(".kc-row[data-playing], .kc-one[data-playing]").forEach((r) => r.removeAttribute("data-playing"));
    if (open && rank) document.querySelector(`[data-rank="${rank}"]`)?.setAttribute("data-playing", "");
  }, [index, open, queue]);

  const close = useCallback(() => {
    setOpen(false);
    player.current?.destroy();
    player.current = null;
    // Let the card slide away before clearing it.
    window.setTimeout(() => {
      if (!player.current) setIndex(null);
    }, 220);
    returnFocus.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // The queue ran out.
  useEffect(() => {
    if (open && index === null && player.current) close();
  }, [open, index, close]);

  const item = index === null ? null : queue[index];
  if (!queue.length) return null;
  return (
    <div className="kp" data-open={open ? "" : undefined} role="region" aria-label="لێدەری ڕیزبەندی" aria-hidden={!open}>
      <div className="kp-bar">
        {item ? (
          <>
            <span className="kp-n">{ku(item.rank)}</span>
            <span className="kp-t">
              <b className="lat" dir="ltr">{item.title}</b>
              <bdi className="lat">{item.artist}</bdi>
            </span>
          </>
        ) : null}
        <button type="button" className="kp-x" onClick={close} aria-label="داخستن" tabIndex={open ? 0 : -1}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </div>
      <div className="kp-video">
        <div ref={host} className="kp-host" />
        {failed ? <p className="kp-fail">لێدەری یوتیوب نەکرایەوە. دەتوانیت لە یوتیوب خۆیدا گوێی لێبگریت.</p> : null}
      </div>
      <div className="kp-ctl">
        <button type="button" onClick={() => setIndex((i) => (i && i > 0 ? i - 1 : i))} disabled={!index} tabIndex={open ? 0 : -1}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>
          پێشوو
        </button>
        {item?.spotify ? (
          <a className="kp-sp" href={item.spotify} target="_blank" rel="noopener" tabIndex={open ? 0 : -1}>
            <SpotifyIcon /> <span className="lat">Spotify</span>
          </a>
        ) : <span />}
        <button type="button" onClick={next} disabled={index === null || index + 1 >= queue.length} tabIndex={open ? 0 : -1}>
          دواتر
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 4L6 8l4 4" /></svg>
        </button>
      </div>
    </div>
  );
}

/** Spotify's icon in its own green, as its brand guidelines ask when linking to a track. */
export function SpotifyIcon() {
  return (
    <svg className="sp-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1ED760" />
      <path
        d="M17.2 16.6a.75.75 0 0 1-1 .25c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 1 1-.33-1.46c4.5-1 8.4-.56 11.5 1.36.35.21.46.68.24 1.04Zm1.4-3.2a.94.94 0 0 1-1.3.31c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.55-1.8c4.3-1.3 9.7-.68 13.4 1.6.44.27.58.85.31 1.3Zm.12-3.3C14.9 7.8 8.5 7.6 4.8 8.7a1.13 1.13 0 1 1-.66-2.16c4.3-1.3 11.3-1.05 15.7 1.6a1.13 1.13 0 0 1-1.15 1.95Z"
        fill="#000"
      />
    </svg>
  );
}
