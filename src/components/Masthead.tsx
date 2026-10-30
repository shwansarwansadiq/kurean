import Link from "next/link";
import { CATEGORY_KEYS, CATEGORY_META, ku, soraniDate, type CategoryKey } from "@/lib/site";
import { Logo } from "./Logo";

export function Masthead({ issue, active, note }: { issue?: number; active?: CategoryKey | "all"; note?: string }) {
  return (
    <header className="mast">
      <div className="mast-row">
        <Link href="/" className="mast-home" aria-label="کوریەن، سەرەتا">
          <Logo animated />
        </Link>
        <div className="issue">
          {issue ? <strong>ژمارە {ku(String(issue).padStart(3, "0"))}</strong> : null}
          <span>{note ?? soraniDate(new Date())}</span>
        </div>
      </div>
      {active ? (
        <nav className="tabs" aria-label="بەشەکان">
          <Link href="/" className={active === "all" ? "tab on" : "tab"} aria-current={active === "all" ? "page" : undefined}>
            هەموو
          </Link>
          {CATEGORY_KEYS.map((k) => (
            <Link
              key={k}
              href={`/category/${CATEGORY_META[k].slug}`}
              className={active === k ? "tab on" : "tab"}
              aria-current={active === k ? "page" : undefined}
            >
              <i style={{ background: CATEGORY_META[k].colour }} />
              {CATEGORY_META[k].label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
