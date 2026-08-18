import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Liqaa | The Business Operating System",
  description:
    "Liqaa unites workforce, commerce, operations and identity into one composable enterprise platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
