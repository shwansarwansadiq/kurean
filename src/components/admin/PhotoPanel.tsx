/* eslint-disable @next/next/no-img-element -- source photos are shown from their own sites until chosen */
import { addOptionToGallery, findMorePhotos, findPhoto, removeFromGallery, setOptionAsMain } from "@/app/admin/actions";
import { photoStatus, type AdminStory } from "@/lib/admin-data";
import { ku } from "@/lib/site";
import { PhotoUpload } from "./PhotoUpload";
import { Submit } from "./Submit";

/**
 * Everything about a story's photos in one place: the main photo, your own upload, the free-photo search,
 * the other photos found in the source articles, and the extra photos shown inside the article.
 */
export function PhotoPanel({ story }: { story: AdminStory }) {
  const status = photoStatus(story);
  const inGallery = new Set(story.gallery.map((g) => g.url));
  const options = story.photo_options.filter((o) => o.url !== story.image_source);
  return (
    <section className="photos" aria-labelledby="ph">
      <h2 id="ph" className="adm-h2">وێنەکان</h2>

      <div className="ph-main">
        {story.image_url ? <img src={story.image_url} alt="" /> : <div className="ph-empty">بێ وێنە: کارتی براند</div>}
        <div className="ph-main-side">
          <div className={`photo-status ${status.tone}`}>
            <span>{status.label}</span>
          </div>
          {story.image_credit ? <small className="ph-credit">وێنە: <bdi>{story.image_credit}</bdi></small> : null}
          <PhotoUpload storyId={story.id} target="main" label="وێنەی خۆم بکە بە وێنەی سەرەکی" />
          <form action={findPhoto}>
            <input type="hidden" name="id" value={story.id} />
            <Submit className="btn small" busy="دەگەڕێت…">وێنەی ئازاد بدۆزەوە</Submit>
          </form>
        </div>
      </div>

      <div className="ph-head">
        <h3>وێنەکانی تری هەواڵەکە ({ku(options.length)})</h3>
        <form action={findMorePhotos}>
          <input type="hidden" name="id" value={story.id} />
          <Submit className="btn ghost small" busy="دەگەڕێت…">گەڕانەوە لە سەرچاوەکان</Submit>
        </form>
      </div>
      <p className="adm-note">ئەم وێنانە لە وتارەکانی سەرچاوەدا هاتوون. هیچیان بەکارناهێنرێت تا خۆت هەڵینەبژێریت.</p>
      {options.length ? (
        <ul className="ph-grid">
          {options.map((o) => (
            <li key={o.url}>
              <img src={o.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <small dir="ltr">{o.credit}</small>
              <div className="ph-acts">
                <form action={setOptionAsMain}>
                  <input type="hidden" name="id" value={story.id} />
                  <input type="hidden" name="url" value={o.url} />
                  <input type="hidden" name="page" value={o.page} />
                  <input type="hidden" name="credit" value={o.credit} />
                  <Submit className="btn small" busy="…">بیکە بە سەرەکی</Submit>
                </form>
                {inGallery.has(o.url) ? null : (
                  <form action={addOptionToGallery}>
                    <input type="hidden" name="id" value={story.id} />
                    <input type="hidden" name="url" value={o.url} />
                    <input type="hidden" name="page" value={o.page} />
                    <input type="hidden" name="credit" value={o.credit} />
                    <Submit className="btn ghost small" busy="…">زیادی بکە بۆ هەواڵەکە</Submit>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-note">هیچ وێنەیەکی تر نەدۆزرایەوە. «گەڕانەوە لە سەرچاوەکان» تاقی بکەوە.</p>
      )}

      <div className="ph-head">
        <h3>وێنە زیادەکانی ناو هەواڵ ({ku(story.gallery.length)})</h3>
        <PhotoUpload storyId={story.id} target="gallery" label="وێنەی خۆم زیاد بکە" />
      </div>
      {story.gallery.length ? (
        <ul className="ph-grid">
          {story.gallery.map((g) => (
            <li key={g.url}>
              <img src={g.url} alt="" loading="lazy" />
              <small dir="ltr">{g.credit ?? "KUREAN"}</small>
              <form action={removeFromGallery}>
                <input type="hidden" name="id" value={story.id} />
                <input type="hidden" name="url" value={g.url} />
                <Submit className="btn ghost small" busy="…">لابردن</Submit>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-note">هیچ وێنەیەکی زیادە نییە. لە سەرەوە هەڵیبژێرە یان وێنەی خۆت زیاد بکە.</p>
      )}
    </section>
  );
}
