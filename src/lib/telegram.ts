/**
 * Telegram alerts for Shwan (17 Nov): every new story and every update waiting for approval arrives on his phone
 * with buttons. Pressing one is his approval, so nothing is published without him.
 * - Bot made by Shwan with @BotFather; its token is TELEGRAM_BOT_TOKEN in Vercel. Only his chat (TELEGRAM_CHAT_ID)
 *   is answered; anyone else pressing a button is refused.
 * - Telegram calls /api/telegram (webhook) with a secret header derived from CRON_SECRET; /admin/telegram sets it up.
 * - Sensitive stories that need a second source, and stories with a high-risk agency photo, get no publish button:
 *   they open in the dashboard instead.
 */
import { createHmac } from "node:crypto";
import { db } from "./db";
import { CATEGORY_META, siteUrl, type CategoryKey } from "./site";

const API = "https://api.telegram.org";
/** Platforms used by a one-tap publish: the same boxes ticked by default on the queue card. */
export const TAP_PLATFORMS = ["website", "instagram", "facebook", "tiktok"];

export const telegramOn = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

/** The secret Telegram sends back with every webhook call (not the bot token, not CRON_SECRET itself). */
export function webhookSecret(): string {
  return createHmac("sha256", process.env.CRON_SECRET ?? "").update("kurean-telegram").digest("hex").slice(0, 48);
}

type Button = { text: string; callback_data?: string; url?: string };

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result as T;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function send(text: string, rows: Button[][], photo?: string | null): Promise<number | null> {
  if (!telegramOn()) return null;
  const chat_id = process.env.TELEGRAM_CHAT_ID!.trim();
  const reply_markup = { inline_keyboard: rows };
  try {
    const m = photo
      ? await tg<{ message_id: number }>("sendPhoto", { chat_id, photo, caption: text.slice(0, 1000), parse_mode: "HTML", reply_markup })
      : await tg<{ message_id: number }>("sendMessage", { chat_id, text, parse_mode: "HTML", reply_markup, link_preview_options: { is_disabled: true } });
    return m.message_id;
  } catch (e) {
    // A photo Telegram can't fetch: send the text alone.
    if (photo) return send(text, rows, null);
    throw e;
  }
}

type AlertStory = {
  id: number;
  headline: string;
  category: CategoryKey;
  urgent: boolean;
  event_id: number | null;
  image_url: string | null;
  image_license: string | null;
  needs_second_source: boolean;
  sources: { name: string }[];
};

/** A new story waiting in the queue. */
export async function alertStory(id: number): Promise<void> {
  if (!telegramOn()) return;
  const { data } = await db()
    .from("stories")
    .select("id, headline, category, urgent, event_id, image_url, image_license, needs_second_source, sources")
    .eq("id", id)
    .single<AlertStory>();
  if (!data) return;
  const s = data;
  const risky = s.needs_second_source || s.image_license === "source-agency";
  const lead = s.event_id ? "🔴 ڕاستەوخۆ · چیرۆکی ئاهەنگ" : s.urgent ? "🔴 هەواڵی خێرا" : "📰 هەواڵی نوێ";
  const text = [
    `<b>${lead}</b> · ${esc(CATEGORY_META[s.category].label)}`,
    esc(s.headline),
    `سەرچاوە: ${esc([...new Set(s.sources.map((x) => x.name))].join("، "))}`,
    risky ? (s.needs_second_source ? "⚠️ سەرچاوەی دووەمی پێویستە: لە داشبۆرد بیبینە." : "⚠️ وێنەی ئاژانسە (مەترسیدار): لە داشبۆرد بیبینە.") : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const open: Button = { text: "بیبینە", url: `${siteUrl()}/admin/story/${s.id}` };
  const rows: Button[][] = risky
    ? [[open], [{ text: "پشتگوێی بخە", callback_data: `skip:${s.id}` }]]
    : [
        [{ text: "✅ ئێستا بڵاوی بکەرەوە", callback_data: `pub:${s.id}` }],
        [{ text: "🕘 بیخە خشتەوە", callback_data: `sched:${s.id}` }, open],
        [{ text: "پشتگوێی بخە", callback_data: `skip:${s.id}` }],
      ];
  const messageId = await send(text, rows, s.image_url);
  if (messageId) await db().from("alerts").insert({ kind: "story", ref_id: s.id, message_id: messageId });
}

/** An update to a published story waiting for approval. */
export async function alertUpdate(updateId: number): Promise<void> {
  if (!telegramOn()) return;
  const { data } = await db().from("story_updates").select("id, story_id, text, sources, stories(headline)").eq("id", updateId).single();
  if (!data) return;
  const u = data as unknown as { id: number; story_id: number; text: string; sources: { name: string }[]; stories: { headline: string } | null };
  const text = [
    "<b>🔴 نوێکاری بۆ هەواڵێکی بڵاوکراوە</b>",
    `هەواڵ: ${esc(u.stories?.headline ?? "")}`,
    `نوێکاری: ${esc(u.text)}`,
    `سەرچاوە: ${esc(u.sources.map((x) => x.name).join("، "))}`,
  ].join("\n\n");
  const rows: Button[][] = [
    [{ text: "✅ زیادی بکە و بڵاوی بکەرەوە", callback_data: `upd:${u.id}` }],
    [{ text: "پشتگوێی بخە", callback_data: `updskip:${u.id}` }, { text: "بیبینە", url: `${siteUrl()}/admin` }],
  ];
  const messageId = await send(text, rows);
  if (messageId) await db().from("alerts").insert({ kind: "update", ref_id: u.id, message_id: messageId });
}

/** After a button: replace the buttons with what happened, so the chat shows the result. */
export async function settle(chatId: number, messageId: number, note: string): Promise<void> {
  await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: note, callback_data: "noop" }]] } }).catch(() => null);
}

/** Points Telegram at the site's webhook (from /admin/telegram). */
export async function connectWebhook(): Promise<string> {
  await tg("setWebhook", {
    url: `${siteUrl()}/api/telegram`,
    secret_token: webhookSecret(),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  const me = await tg<{ username: string }>("getMe", {});
  return me.username;
}
