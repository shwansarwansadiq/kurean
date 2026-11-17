import { after, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { publishApproved } from "@/lib/publish";
import { nextFreeSlot, hawlerTime } from "@/lib/schedule";
import { settle, TAP_PLATFORMS, tg, webhookSecret } from "@/lib/telegram";
import { publishUpdate, skipUpdate } from "@/lib/updates";

export const runtime = "nodejs";
export const maxDuration = 300;

type Update = {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; from: { id: number }; data?: string; message?: { message_id: number; chat: { id: number } } };
};

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Telegram's webhook: only Telegram (secret header) and only Shwan's chat may act. Buttons = his approval. */
export async function POST(req: Request) {
  if (!same(req.headers.get("x-telegram-bot-api-secret-token") ?? "", webhookSecret())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const u = (await req.json().catch(() => ({}))) as Update;
  const owner = process.env.TELEGRAM_CHAT_ID?.trim();

  if (u.message) {
    // /start: tells Shwan his chat id, to put in Vercel as TELEGRAM_CHAT_ID (nothing else is answered).
    if (u.message.text?.startsWith("/start")) {
      await tg("sendMessage", {
        chat_id: u.message.chat.id,
        text: owner && String(u.message.chat.id) === owner ? "کوریەن ئامادەیە. هەواڵە نوێیەکان لێرە دەردەکەون." : `ژمارەی چاتەکەت: ${u.message.chat.id}\nلە Vercel وەک TELEGRAM_CHAT_ID دایبنێ.`,
      }).catch(() => null);
    }
    return NextResponse.json({ ok: true });
  }

  const q = u.callback_query;
  if (!q?.data || !q.message) return NextResponse.json({ ok: true });
  if (!owner || String(q.from.id) !== owner) {
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: "تەنها خاوەنی کوریەن دەتوانێت." }).catch(() => null);
    return NextResponse.json({ ok: true });
  }
  const [action, raw] = q.data.split(":");
  const id = Number(raw);
  const chat = q.message.chat.id;
  const msg = q.message.message_id;
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ ok: true });

  // Answer at once (Telegram waits only a few seconds); publishing continues after the response.
  const quick: Record<string, string> = { pub: "بڵاو دەکرێتەوە…", sched: "دەخرێتە خشتەوە…", skip: "پشتگوێ خرا", upd: "زیاد دەکرێت…", updskip: "پشتگوێ خرا" };
  await tg("answerCallbackQuery", { callback_query_id: q.id, text: quick[action] ?? "" }).catch(() => null);

  after(async () => {
    try {
      if (action === "pub") {
        const done = await publishApproved(id, TAP_PLATFORMS, ["pending", "approved"]);
        await settle(chat, msg, done ? "✅ بڵاوکرایەوە" : "پێشتر بڕیاری لەسەر دراوە");
      } else if (action === "sched") {
        const { data } = await db().from("stories").select("scheduled_at").eq("status", "approved").not("scheduled_at", "is", null);
        const when = nextFreeSlot((data ?? []).map((r) => new Date(r.scheduled_at as string)));
        const { data: done } = await db()
          .from("stories")
          .update({ status: "approved", scheduled_at: when.toISOString(), platforms: TAP_PLATFORMS })
          .eq("id", id)
          .eq("status", "pending")
          .select("id");
        await settle(chat, msg, done?.length ? `🕘 خرایە خشتەوە · ${hawlerTime(when)}` : "پێشتر بڕیاری لەسەر دراوە");
      } else if (action === "skip") {
        const { data: done } = await db().from("stories").update({ status: "skipped" }).eq("id", id).eq("status", "pending").select("id");
        await settle(chat, msg, done?.length ? "پشتگوێ خرا" : "پێشتر بڕیاری لەسەر دراوە");
      } else if (action === "upd") {
        const result = await publishUpdate(id);
        await settle(chat, msg, result === "already handled" ? "پێشتر بڕیاری لەسەر دراوە" : "✅ نوێکارییەکە بڵاوکرایەوە");
      } else if (action === "updskip") {
        await skipUpdate(id);
        await settle(chat, msg, "پشتگوێ خرا");
      }
      revalidatePath("/", "layout");
    } catch (e) {
      console.error("telegram action", action, id, e);
      await settle(chat, msg, "⚠️ نەکرا: لە داشبۆرد هەوڵ بدەوە");
    }
  });
  return NextResponse.json({ ok: true });
}
