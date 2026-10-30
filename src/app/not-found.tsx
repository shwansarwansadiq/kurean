import Link from "next/link";
import { Masthead } from "@/components/Masthead";

export default function NotFound() {
  return (
    <>
      <Masthead />
      <main id="main" className="notfound">
        <h1>ئەم پەڕەیە نەدۆزرایەوە</h1>
        <p>لەوانەیە هەواڵەکە لابرابێت یان بەستەرەکە هەڵە بێت.</p>
        <Link href="/" className="btn-primary">
          بڕۆ بۆ سەرەتا
        </Link>
      </main>
    </>
  );
}
