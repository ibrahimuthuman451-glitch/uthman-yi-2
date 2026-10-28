import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/env";
import { getOfficialLogoPath } from "@/components/site/logo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

const siteUrl = getSiteUrl();
const logoPath = getOfficialLogoPath();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Uthman IY | Technology products, software and AI tools in Rwanda",
    template: "%s | Uthman IY",
  },
  description:
    "Uthman IY is a technology company in Gisozi, Kigali: a technology shop, software development services, and our own products MatchVision AI, Digital Discipline and Tender AI.",
  applicationName: "Uthman IY",
  keywords: [
    "Uthman IY",
    "technology shop Rwanda",
    "software development Kigali",
    "CCTV Rwanda",
    "football analytics",
  ],
  authors: [{ name: "Uthman IY" }],
  openGraph: {
    type: "website",
    siteName: "Uthman IY",
    locale: "en_RW",
    url: siteUrl,
    title: "Uthman IY | Technology products, software and AI tools in Rwanda",
    description:
      "Technology commerce and software solutions from Gisozi, Kigali. Shop technology products, request software development, and explore MatchVision AI, Digital Discipline and Tender AI.",
    ...(logoPath ? { images: [{ url: logoPath, alt: "Uthman IY" }] } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: "Uthman IY | Technology products, software and AI tools in Rwanda",
    description:
      "Technology commerce and software solutions from Gisozi, Kigali. Shop products, request software development, and explore our software products.",
  },
  robots: { index: true, follow: true },
  ...(logoPath ? { icons: { icon: logoPath, apple: logoPath } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1b33",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
