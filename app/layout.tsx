import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "JobMatch — AI Resume Analyzer",
    template: "%s | JobMatch",
  },
  description:
    "Paste any job description. Get a match score, missing keywords, and concrete edits — in seconds.",
  openGraph: {
    title: "JobMatch — AI Resume Analyzer",
    description:
      "Paste any job description. Get a match score, missing keywords, and concrete edits — in seconds.",
    type: "website",
    siteName: "JobMatch",
  },
  twitter: {
    card: "summary",
    title: "JobMatch — AI Resume Analyzer",
    description:
      "Paste any job description. Get a match score, missing keywords, and concrete edits — in seconds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[99999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:text-sm focus:font-medium focus:outline-none"
        >
          Skip to main content
        </a>
        <div aria-hidden="true" className="grid-shine-overlay" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
