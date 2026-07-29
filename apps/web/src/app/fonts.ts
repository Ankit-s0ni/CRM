import {
  Lexend,
  Noto_Sans_Arabic,
  Source_Sans_3,
} from "next/font/google";

export const sourceSans = Source_Sans_3({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const lexend = Lexend({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const notoSansArabic = Noto_Sans_Arabic({
  display: "swap",
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
});
