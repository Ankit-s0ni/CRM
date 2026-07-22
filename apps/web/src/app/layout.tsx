import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('deltcrm-ui-theme') || 'default';
                if (theme !== 'default') {
                  document.documentElement.setAttribute('data-theme', theme);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
