import type { Metadata } from "next";
import Script from "next/script";
import "../globals.css";

import {
  lexend,
  notoSansArabic,
  sourceSans,
} from "@/app/fonts";
import { ThemeProvider } from "@/shared/components/theme-provider";

export const metadata: Metadata = {
  title: "DELTCRM",
  description: "Multi-tenant HRMS and attendance workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${sourceSans.variable} ${lexend.variable} ${notoSansArabic.variable} notranslate h-full antialiased`}
      suppressHydrationWarning
      translate="no"
    >
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <Script id="public-theme-bootstrap" strategy="beforeInteractive">
          {`
              try {
                var theme = localStorage.getItem('deltcrm-ui-theme');
                if (theme === 'current') theme = 'editorial';
                var themes = ['editorial', 'charcoal', 'navy', 'emerald', 'teal', 'crimson', 'monochrome'];
                if (themes.indexOf(theme) >= 0) {
                  document.documentElement.setAttribute('data-theme', theme);
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
              } catch (e) {}
            `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
