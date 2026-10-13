import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import Script from "next/script";
import { BusyTexSW } from "@/components/busytex-sw";
import { Providers } from "./providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width",
};

export const metadata: Metadata = {
  description:
    "Paste any job description. Get a match score, missing keywords, and concrete edits — in seconds.",
  keywords: [
    "resume analyzer",
    "AI resume",
    "job match",
    "ATS optimization",
    "resume keywords",
    "job application tracker",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    description:
      "Paste any job description. Get a match score, missing keywords, and concrete edits — in seconds.",
    siteName: "JobMatch",
    title: "JobMatch — AI Resume Analyzer",
    type: "website",
    url: "/",
  },
  title: {
    default: "JobMatch — AI Resume Analyzer",
    template: "%s | JobMatch",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Paste any job description. Get a match score, missing keywords, and concrete edits — in seconds.",
    title: "JobMatch — AI Resume Analyzer",
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
        <BusyTexSW />
        <div className="relative z-[1]">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
