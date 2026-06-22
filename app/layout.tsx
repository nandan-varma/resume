import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NetworkBackgroundWrapper } from "@/components/network-background-wrapper";
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[99999] focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:font-medium focus:text-foreground focus:text-sm focus:outline-none"
          href="#main-content"
        >
          Skip to main content
        </a>
        <NetworkBackgroundWrapper />
        <div className="relative z-[1]">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
