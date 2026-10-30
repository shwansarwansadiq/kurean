import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { Bidi } from "@/components/Bidi";
import { storiesByStatus } from "@/lib/admin-data";
import { markSticker } from "../actions";

export default async function Stickers() {
  const todo = (await storiesByStatus("published", 30)).filter((s) => s.platforms.includes("instagram") && !s.sticker_done);
  return (
    <AdminShell active="stickers" title="ستیکەری بەستەر">
      <p className="adm-note">
        ئینستاگرام ڕێگە نادات ستیکەری بەستەر بە API زیاد بکرێت. بۆ هەر ستۆرییەک، ستیکەری Link زیاد بکە و ئەم بەستەرە دابنێ (نزیکەی ٥ چرکە).
      </p>
      <ul className="rows">
        {todo.map((s) => (
          <li key={s.id}>
            <div className="row-main">
              <Bidi text={s.card_headline} />
              <code dir="ltr" className="copy">kurean.news/n/{s.id}</code>
            </div>
            <form action={markSticker}>
              <input type="hidden" name="id" value={s.id} />
              <Submit className="btn small" busy="…">زیادکرا ✓</Submit>
            </form>
          </li>
        ))}
        {!todo.length ? <li className="rows-empty">هیچ ستیکەرێک نەماوە.</li> : null}
      </ul>
    </AdminShell>
  );
}
