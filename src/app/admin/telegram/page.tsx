import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { telegramConnect, telegramTest } from "../actions";

export const dynamic = "force-dynamic";

/** Telegram alerts with one-tap buttons for new stories and updates (lib/telegram.ts). */
export default async function Telegram({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; sent?: string }> }) {
  const { ok, err, sent } = await searchParams;
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const hasChat = !!process.env.TELEGRAM_CHAT_ID;
  return (
    <AdminShell active="telegram" title="ئاگادارکردنەوە لە تێلێگرام">
      {ok ? <p className="flag ok">بۆتەکە (@{ok}) بە ماڵپەڕەکەوە بەسترا.</p> : null}
      {sent ? <p className="flag ok">نامەی تاقیکردنەوە نێردرا.</p> : null}
      {err ? <p className="flag warn">نەکرا: {err === "no-keys" ? "TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID لە Vercel دانەنراون." : err}</p> : null}
      <p className="adm-note">
        هەر هەواڵێکی نوێ و هەر نوێکارییەک بە دوگمەی «ئێستا بڵاوی بکەرەوە»، «بیخە خشتەوە» و «پشتگوێی بخە» دەگاتە تێلێگرامەکەت. هەواڵی هەستیار
        کە سەرچاوەی دووەمی پێویستە و وێنەی ئاژانس دوگمەی بڵاوکردنەوەیان نییە: لە داشبۆرد بیانبینە.
      </p>
      <ol className="tg-steps">
        <li className={hasToken ? "done" : undefined}>بۆتی <bdi className="lat">TELEGRAM_BOT_TOKEN</bdi> لە Vercel {hasToken ? "دانراوە ✓" : "دانەنراوە"}</li>
        <li>
          <form action={telegramConnect}>
            <Submit className="btn small" busy="…">بەستنی بۆتەکە بە ماڵپەڕەوە</Submit>
          </form>
        </li>
        <li className={hasChat ? "done" : undefined}>
          لە تێلێگرام <bdi className="lat">/start</bdi> بۆ بۆتەکە بنێرە؛ ژمارەی چاتەکەت وەک <bdi className="lat">TELEGRAM_CHAT_ID</bdi> لە Vercel
          دابنێ {hasChat ? "(دانراوە ✓)" : ""}
        </li>
        <li>
          <form action={telegramTest}>
            <Submit className="btn small" busy="…">نامەی تاقیکردنەوە بنێرە</Submit>
          </form>
        </li>
      </ol>
    </AdminShell>
  );
}
