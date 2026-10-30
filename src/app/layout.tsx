import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.KUREAN_SITE_URL ?? "https://kurean.news"),
  title: "کوریەن · هەواڵی کۆری بە کوردی",
  description: "هەواڵی کەی-پۆپ، دراما، فیلم و کولتووری کۆری بە کوردیی سۆرانی، هەموو ڕۆژێک، لەگەڵ سەرچاوەکانی.",
  openGraph: { siteName: "KUREAN", locale: "ckb_IQ", type: "website" },
};

export const viewport: Viewport = { themeColor: "#FFF2F7", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ckb" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- one shared stylesheet for every route */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Inter:wght@400;500;600;700;800&family=Noto+Kufi+Arabic:wght@400;500;700;800;900&display=swap"
        />
      </head>
      <body>
        <a href="#main" className="skip">
          بڕۆ بۆ ناوەڕۆک
        </a>
        {children}
      </body>
    </html>
  );
}
