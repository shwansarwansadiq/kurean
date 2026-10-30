import { bidiRuns } from "@/lib/site";

/** Sorani text with Latin names isolated and set in the Latin face. */
export function Bidi({ text }: { text: string }) {
  return (
    <>
      {bidiRuns(text).map((r, i) =>
        r.latin ? (
          <bdi key={i} className={r.text.length <= 28 ? "lat nw" : "lat"}>
            {r.text}
          </bdi>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}
