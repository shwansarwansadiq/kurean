import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { db } from "@/lib/db";
import { deleteTerm, saveTerm } from "../actions";

type Term = { id: string; english: string; sorani: string; note: string | null };

const MESSAGES: Record<string, { text: string; bad?: boolean }> = {
  saved: { text: "پاشەکەوت کرا. نووسەر لە هەواڵی داهاتووەوە بەکاری دەهێنێت." },
  deleted: { text: "وشەکە سڕایەوە." },
  dup: { text: "ئەم وشە ئینگلیزییە پێشتر لە فەرهەنگەکەدا هەیە: لە ڕیزەکەی خۆیدا بیگۆڕە.", bad: true },
  empty: { text: "وشە ئینگلیزییەکە و سۆرانییەکە هەردووکیان پێویستن.", bad: true },
  err: { text: "پاشەکەوت نەکرا. دووبارە هەوڵ بدەرەوە.", bad: true },
};

export default async function Glossary({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const msg = m ? MESSAGES[m] : null;
  const { data } = await db().from("glossary").select("id, english, sorani, note").order("english");
  const terms = (data ?? []) as Term[];
  return (
    <AdminShell active="glossary" title="فەرهەنگ">
      {msg ? <p className={msg.bad ? "toast bad" : "toast"} role="status">{msg.text}</p> : null}
      <p className="adm-note">نووسەر هەمیشە ئەم ڕێنووسانە بەکار دەهێنێت. وشەیەکی نوێ لێرەوە زیاد بکە، یان لە خشتەکەی خوارەوەدا ڕاستەوخۆ بیگۆڕە و «پاشەکەوت» دابگرە.</p>
      <h2 className="term-h">وشەی نوێ</h2>
      <form action={saveTerm} className="term-form">
        <input name="english" placeholder="English" dir="ltr" required aria-label="English" />
        <input name="sorani" placeholder="سۆرانی" required aria-label="سۆرانی" />
        <input name="note" placeholder="تێبینی" aria-label="تێبینی" />
        <Submit className="btn pub small" busy="…">زیادی بکە</Submit>
      </form>
      <h2 className="term-h">{terms.length} وشە</h2>
      <ul className="term-rows">
        {terms.map((t) => (
          <li key={t.id}>
            <form action={saveTerm} className="term-row">
              <input type="hidden" name="id" value={t.id} />
              <input name="english" defaultValue={t.english} dir="ltr" required aria-label="English" className="lat" />
              <input name="sorani" defaultValue={t.sorani} required aria-label="سۆرانی" className="strong" />
              <input name="note" defaultValue={t.note ?? ""} placeholder="تێبینی" aria-label="تێبینی" />
              <span className="term-acts">
                <Submit className="btn pub small" busy="…" name="do" value="save">پاشەکەوت</Submit>
                <Submit className="btn small ghost" busy="…" name="do" value="delete" formAction={deleteTerm}>بیسڕەوە</Submit>
              </span>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
