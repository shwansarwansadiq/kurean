import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kurean · کوریەن",
  description: "هەواڵی کولتووری کۆری بە کوردی",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ckb" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
