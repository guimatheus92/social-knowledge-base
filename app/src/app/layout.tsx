import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

// Body + UI text — a grotesque with warmth and a steady rhythm at small sizes.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

// Data face — numbers, durations, paths, ids. Reads as "machine output".
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Display face — headings, account handles, the hero. Self-hosted (Fontshare)
// so it works offline / in Docker with no runtime font request.
const clash = localFont({
  src: [
    { path: "../fonts/clash/ClashDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/clash/ClashDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/clash/ClashDisplay-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/clash/ClashDisplay-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-clash",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Social Knowledge Base",
  description:
    "Download creators' videos (Instagram, TikTok…) and turn them into a queryable knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. ColorZilla adds
    // `cz-shortcut-listen` / Grammarly, dark-mode helpers) mutate <html>/<body>
    // attributes before React hydrates, which is harmless but trips the warning.
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`dark ${clash.variable} ${hanken.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col text-foreground"
      >
        <Providers>
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
