import { AdminShell } from "@/components/admin/AdminShell";
import { Submit } from "@/components/admin/Submit";
import { db } from "@/lib/db";
import type { KEvent } from "@/lib/events";
import { hawlerTime, toHawlerInput } from "@/lib/schedule";
import { soraniDate } from "@/lib/site";
import { deleteEvent, saveEvent } from "../actions";

export const dynamic = "force-dynamic";

/** The awards calendar: faster news checks around each event, and a live story for awards nights. */
export default async function Events() {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data } = await db().from("events").select("*").gte("ends_at", since).order("starts_at").limit(60);
  const events = (data ?? []) as KEvent[];
  return (
    <AdminShell active="events" title="ئاهەنگەکان">
      <p className="adm-note">
        لە ماوەی ئاهەنگێکدا (کاتژمێرێک پێش دەستپێکردن تا ٣ کاتژمێر دوای کۆتایی) سیستەمەکە هەموو ٥ خولەکێک هەواڵ دەپشکنێت. بۆ خەڵاتەکان
        ٢ کاتژمێر پێش دەستپێکردن هەواڵێکی «ڕاستەوخۆ» دەنووسرێت؛ کە پەسەندت کرد، براوەکان وەک نوێکاری بۆی زیاد دەبن (هەر یەکێک بە
        پەسەندکردنی تۆ). کاتەکان بە کاتی هەولێرن.
      </p>
      <ul className="rows">
        {events.map((e) => (
          <li key={e.id}>
            <span className="dot" style={{ background: e.kind === "awards" ? "var(--berry)" : "var(--lilac)" }} />
            <div className="row-main">
              <b>{e.name_ckb}</b>
              <small>
                {soraniDate(e.starts_at, false)} · {hawlerTime(e.starts_at)}–{hawlerTime(e.ends_at)} · {e.kind === "awards" ? "خەڵات" : "فێستیڤاڵ"}
                {e.place ? <> · <bdi className="lat">{e.place}</bdi></> : null}
                {e.story_id && e.story_id > 0 ? <> · هەواڵی ڕاستەوخۆ #{e.story_id}</> : null}
              </small>
              <details className="ev-edit">
                <summary>دەستکاری</summary>
                <EventForm e={e} />
              </details>
            </div>
            <form action={deleteEvent}>
              <input type="hidden" name="id" value={e.id} />
              <Submit className="btn small ghost" busy="…">لابردن</Submit>
            </form>
          </li>
        ))}
      </ul>
      <section className="ev-new">
        <h2>ئاهەنگێکی نوێ</h2>
        <EventForm />
      </section>
    </AdminShell>
  );
}

function EventForm({ e }: { e?: KEvent }) {
  return (
    <form action={saveEvent} className="ev-form">
      {e ? <input type="hidden" name="id" value={e.id} /> : null}
      <label>
        ناو (ئینگلیزی)
        <input name="name" dir="ltr" required defaultValue={e?.name} placeholder="2026 MAMA Awards" />
      </label>
      <label>
        ناو (کوردی)
        <input name="name_ckb" defaultValue={e?.name_ckb} placeholder="خەڵاتەکانی MAMA ٢٠٢٦" />
      </label>
      <label>
        دەستپێکردن (هەولێر)
        <input type="datetime-local" name="starts" required defaultValue={e ? toHawlerInput(new Date(e.starts_at)) : undefined} />
      </label>
      <label>
        کۆتایی (هەولێر)
        <input type="datetime-local" name="ends" required defaultValue={e ? toHawlerInput(new Date(e.ends_at)) : undefined} />
      </label>
      <label>
        جۆر
        <select name="kind" defaultValue={e?.kind ?? "awards"}>
          <option value="awards">خەڵات (هەواڵی ڕاستەوخۆ)</option>
          <option value="festival">فێستیڤاڵ / ئاهەنگ</option>
        </select>
      </label>
      <label>
        شوێن
        <input name="place" dir="ltr" defaultValue={e?.place ?? undefined} />
      </label>
      <Submit className="btn small pub" busy="…">{e ? "پاشەکەوت" : "زیادکردن"}</Submit>
    </form>
  );
}
