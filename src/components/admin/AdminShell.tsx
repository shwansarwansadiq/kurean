import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { Logo } from "@/components/Logo";
import { counts } from "@/lib/admin-data";
import { ku } from "@/lib/site";

const TABS = [
  { href: "/admin", key: "pending", label: "چاوەڕوان" },
  { href: "/admin/scheduled", key: "scheduled", label: "خشتە" },
  { href: "/admin/published", key: "published", label: "بڵاوکراوە" },
  { href: "/admin/analytics", key: "analytics", label: "شیکاری" },
  { href: "/admin/tiktok", key: "tiktok", label: "تیکتۆک" },
  { href: "/admin/scenery", key: "scenery", label: "دیمەن" },
  { href: "/admin/stickers", key: "stickers", label: "ستیکەر" },
  { href: "/admin/sources", key: "sources", label: "سەرچاوەکان" },
  { href: "/admin/glossary", key: "glossary", label: "فەرهەنگ" },
] as const;

export async function AdminShell({ active, title, children }: { active: (typeof TABS)[number]["key"]; title: string; children: React.ReactNode }) {
  const n = await counts();
  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-row">
          <h1>{title}</h1>
          <div className="adm-tools">
            <Link href="/" className="adm-site" target="_blank">
              ماڵپەڕ ↗
            </Link>
            <form action={logout}>
              <button className="adm-out" type="submit">
                چوونەدەرەوە
              </button>
            </form>
            <Logo size={26} />
          </div>
        </div>
        <nav className="seg" aria-label="داشبۆرد">
          {TABS.map((t) => {
            const count = t.key === "pending" ? n.pending : t.key === "stickers" ? n.stickers : 0;
            return (
              <Link key={t.key} href={t.href} className={t.key === active ? "on" : undefined} aria-current={t.key === active ? "page" : undefined}>
                {t.label}
                {count ? <b>{ku(count)}</b> : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="adm-main">{children}</main>
    </div>
  );
}
