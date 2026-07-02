import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { DEFAULT_THEME, isValidTheme } from "@/lib/themes";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSettings();
    return {
      title: { default: s.siteName, template: `%s · ${s.siteName}` },
      description: s.siteDescription,
      icons: s.faviconUrl ? { icon: s.faviconUrl } : undefined,
    };
  } catch {
    return { title: "Better Status", description: "Service status & uptime" };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let theme = DEFAULT_THEME;
  try {
    const s = await getSettings();
    if (isValidTheme(s.theme)) theme = s.theme;
  } catch {
    // DB not ready (e.g. during build) — fall back to default theme.
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
