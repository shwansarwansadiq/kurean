"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Kurean's own analytics: page views, active reading time and scroll depth, sent to /api/t.
 * No cookies. A random visitor ID is kept in the browser only after the reader agrees.
 */
const KEY = "kurean_consent";
const rid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

function store(k: string, v?: string): string | null {
  try {
    if (v !== undefined) localStorage.setItem(k, v);
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function send(body: Record<string, unknown>) {
  const json = JSON.stringify(body);
  if (!(navigator.sendBeacon && navigator.sendBeacon("/api/t", new Blob([json], { type: "text/plain" })))) {
    fetch("/api/t", { method: "POST", body: json, keepalive: true }).catch(() => {});
  }
}

export function Tracker() {
  const path = usePathname();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (path.startsWith("/admin") || path.startsWith("/card")) return;
    const consent = store(KEY);
    if (consent === null) setAsk(true);
    const c = consent === "yes" ? 1 : 0;
    const v = c ? store("kurean_vid") ?? store("kurean_vid", rid()) : undefined;
    let session = "";
    try {
      session = sessionStorage.getItem("kurean_s") ?? "";
      if (!session) sessionStorage.setItem("kurean_s", (session = rid()));
    } catch {}
    const main = document.querySelector<HTMLElement>("[data-story], [data-category]");
    const q = new URLSearchParams(location.search);
    const base = {
      p: path,
      i: rid(),
      n: session,
      c,
      v,
      s: main?.dataset.story,
      k: main?.dataset.category,
    };
    send({
      ...base,
      t: "pageview",
      r: document.referrer,
      us: q.get("utm_source"),
      um: q.get("utm_medium"),
      uc: q.get("utm_campaign"),
      l: navigator.language,
    });

    // Active reading time: the tab is visible and the reader did something in the last 30 seconds.
    let active = 0;
    let lastInput = Date.now();
    let maxScroll = 0;
    let sent = 0;
    const onInput = () => (lastInput = Date.now());
    const onScroll = () => {
      onInput();
      const h = document.documentElement.scrollHeight - innerHeight;
      maxScroll = Math.max(maxScroll, h > 0 ? Math.round((scrollY / h) * 100) : 100);
    };
    const tick = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInput < 30_000) active += 1000;
    }, 1000);
    const flush = () => {
      if (active - sent < 1000 && sent > 0) return;
      send({ ...base, t: "engage", e: active - sent, d: maxScroll });
      sent = active;
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("pointerdown", onInput, { passive: true });
    addEventListener("keydown", onInput);
    addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      clearInterval(tick);
      removeEventListener("scroll", onScroll);
      removeEventListener("pointerdown", onInput);
      removeEventListener("keydown", onInput);
      removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [path]);

  if (!ask) return null;
  const choose = (yes: boolean) => {
    store(KEY, yes ? "yes" : "no");
    if (yes) store("kurean_vid", rid());
    setAsk(false);
  };
  return (
    <div className="consent glass-light" role="dialog" aria-live="polite" aria-label="ئامار">
      <p>
        ژمارەی خوێنەران بە شێوەیەکی بێناو دەژمێرین. ڕێگە دەدەیت ناسنامەیەکی هەڕەمەکی لە وێبگەڕەکەت هەڵبگرین تا بزانین
        دووبارە سەردانت کردووە؟ <a href="/measure">زیاتر</a>
      </p>
      <p dir="ltr" lang="en" className="consent-en">
        We count readers anonymously. May we keep a random ID in your browser to recognise return visits?
      </p>
      <div className="consent-btns">
        <button type="button" className="c-yes" onClick={() => choose(true)}>
          بەڵێ · Yes
        </button>
        <button type="button" className="c-no" onClick={() => choose(false)}>
          نەخێر · No
        </button>
      </div>
    </div>
  );
}
