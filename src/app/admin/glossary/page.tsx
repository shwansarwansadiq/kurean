import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { db } from "@/lib/db";
import { saveTerm } from "../actions";

type Term = { english: string; sorani: string; note: string | null };

export default async function Glossary() {
  const { data } = await db().from("glossary").select("english, sorani, note").order("english");
  return (
    <AdminShell active="glossary" title="فەرهەنگ">
      <p className="adm-note">نووسەر هەمیشە ئەم ڕێنووسانە بەکاردەهێنێت. وشەیەکی نوێ زیاد بکە یان وشەیەکی هەبوو بگۆڕە (هەمان وشەی ئینگلیزی).</p>
      <form action={saveTerm} className="term-form">
        <input name="english" placeholder="English" dir="ltr" required aria-label="English" />
        <input name="sorani" placeholder="سۆرانی" required aria-label="سۆرانی" />
        <input name="note" placeholder="تێبینی" aria-label="تێبینی" />
        <Submit className="btn pub small" busy="…">پاشەکەوت</Submit>
      </form>
      <table className="terms">
        <tbody>
          {((data ?? []) as Term[]).map((t) => (
            <tr key={t.english}>
              <td dir="ltr" className="lat-strong">{t.english}</td>
              <td><b>{t.sorani}</b></td>
              <td className="muted-cell">{t.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
