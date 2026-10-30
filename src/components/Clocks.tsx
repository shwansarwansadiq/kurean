"use client";
import { useEffect, useState } from "react";

const fmt = (tz: string, d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

function seoulNote(d: Date): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(d));
  if (h >= 20) return "کاتی پەخشی دراماکانە";
  if (h < 7) return "سیئۆڵ نووستووە";
  return "ڕۆژە لە کۆریا";
}

/** Seoul and Hawler side by side: Korea is 6 hours ahead, so fans know when dramas air. */
export function Clocks() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="clocks">
      <div className="clock seoul">
        <small>ئێستا لە سیئۆڵ</small>
        <b suppressHydrationWarning>{now ? fmt("Asia/Seoul", now) : "--:--"}</b>
        <span suppressHydrationWarning>{now ? seoulNote(now) : " "}</span>
      </div>
      <div className="clock hawler">
        <small>ئێستا لە هەولێر</small>
        <b suppressHydrationWarning>{now ? fmt("Asia/Baghdad", now) : "--:--"}</b>
        <span>کۆریا ٦ کاتژمێر لە پێشەوەیە</span>
      </div>
    </div>
  );
}
