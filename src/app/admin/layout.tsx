import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: "داشبۆرد · کوریەن", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
// Regenerate calls the writer model, which can take a minute.
export const maxDuration = 300;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
