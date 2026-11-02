"use client";
/* eslint-disable @next/next/no-img-element -- Pixabay/Pexels files */
/**
 * What a scenery candidate will look like once it is made (Shwan, 2 Nov): the clip with the place card, the credit,
 * the Kurean mark and its music, before he approves it. The finished MP4 is only rendered after approval, so this
 * draws the same layout over the source clip (positions follow `video/src/Scenery.tsx`). Tap to play with music.
 */
import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/Logo";

type Props = { kind: "photo" | "video"; src: string; placeCkb: string; placeEn: string; photographer: string; source: string; music: string };

const PLAY_EVENT = "kurean:scenery-play";

export function SceneryPreview({ kind, src, placeCkb, placeEn, photographer, source, music }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const stop = () => {
    video.current?.pause();
    audio.current?.pause();
    setPlaying(false);
  };

  // Only one preview plays at a time.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== src) stop();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [src]);

  const toggle = async () => {
    if (playing) return stop();
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: src }));
    setPlaying(true);
    if (video.current) video.current.currentTime = 0;
    if (audio.current) {
      audio.current.currentTime = 0;
      audio.current.volume = 0.9;
    }
    await Promise.allSettled([video.current?.play(), audio.current?.play()]);
  };

  return (
    <button type="button" className={`scp${playing ? " is-playing" : ""}`} onClick={toggle} aria-label={playing ? "ڕاگرتن" : "پیشاندان لەگەڵ مۆسیقا"}>
      {kind === "video" ? (
        <video ref={video} src={src} muted playsInline loop preload="metadata" className="scp-media" />
      ) : (
        <img src={`${src}?auto=compress&w=540`} alt="" loading="lazy" className="scp-media scp-drift" />
      )}
      <audio ref={audio} src={`/music/${music}.m4a`} loop preload="none" onEnded={stop} />
      <span className="scp-shade" aria-hidden="true" />
      <span className="scp-top" dir="ltr" aria-hidden="true">
        <Mark size={22} ink="#fff" />
        <span className="scp-word">
          kur<span>ean</span>
        </span>
      </span>
      <span className="scp-bottom">
        <span className="scp-card">
          <svg viewBox="0 0 24 24" className="scp-pin" aria-hidden="true">
            <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill="var(--berry)" />
            <circle cx="12" cy="10" r="2.8" fill="#fff" />
          </svg>
          <span className="scp-names">
            <b>{placeCkb}</b>
            <span dir="ltr">{placeEn}</span>
          </span>
        </span>
        <span className="scp-credit" dir="ltr">
          {kind === "video" ? "Video" : "Photo"}: {photographer} · {source}
        </span>
      </span>
      <span className="scp-play" aria-hidden="true">
        {playing ? (
          <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
        )}
        <span dir="ltr">♪ {music}</span>
      </span>
    </button>
  );
}
