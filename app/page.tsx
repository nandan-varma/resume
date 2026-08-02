import { Briefcase, Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ModeSwitcher } from "@/components/mode-switcher";
import { SpotlightCard } from "@/components/spotlight-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "JobMatch",
  url: APP_URL,
  description:
    "AI-powered resume analyzer that scores your resume against any job description, surfaces missing keywords, and tracks applications.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <header className="flex h-12 animate-enter items-center justify-between border-border border-b px-4 sm:px-6">
        <Link
          aria-label="JobMatch — home"
          className="transition-opacity hover:opacity-70"
          href="/"
        >
          <Logo iconSize={24} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <ModeSwitcher />
          <Link href="/login">
            <Button size="sm" variant="ghost">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main
        className="flex flex-1 flex-col items-center justify-center gap-10 px-5 py-12 text-center sm:gap-16 sm:py-16"
        id="main-content"
      >
        {/* Hero */}
        <div className="relative mx-auto max-w-2xl space-y-6">
          <h1 className="animate-enter-blur font-bold text-3xl text-foreground tracking-tight sm:text-5xl">
            Land more interviews
            <br />
            with AI resume matching
          </h1>
          <p className="mx-auto max-w-xl animate-enter-up text-lg text-muted-foreground leading-relaxed [animation-delay:100ms]">
            Paste any job description. Get a match score, missing keywords, and
            concrete edits — in seconds.
          </p>
          <div className="flex animate-enter-up flex-wrap justify-center gap-3 pt-2 [animation-delay:180ms]">
            <Link href="/signup">
              <Button size="lg">Get started free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature grid — three spotlight cells sharing one outer border */}
        <div className="relative mx-auto w-full max-w-3xl animate-enter-up [animation-delay:260ms]">
          <div className="grid border border-border sm:grid-cols-3">
            <SpotlightCard className="border-0 p-6 text-left sm:border-r">
              <Sparkles className="mb-4 size-4 text-muted-foreground" />
              <h2 className="font-medium text-foreground text-sm">
                Match Score
              </h2>
              <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
                See exactly how well your resume fits a role — and what's
                missing.
              </p>
            </SpotlightCard>
            <SpotlightCard className="border-0 border-t p-6 text-left sm:border-t-0 sm:border-r">
              <Target className="mb-4 size-4 text-muted-foreground" />
              <h2 className="font-medium text-foreground text-sm">
                Keyword Gaps
              </h2>
              <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
                Identify the exact terms recruiters and ATS scanners look for.
              </p>
            </SpotlightCard>
            <SpotlightCard className="border-0 border-t p-6 text-left sm:border-t-0">
              <Briefcase className="mb-4 size-4 text-muted-foreground" />
              <h2 className="font-medium text-foreground text-sm">
                Application Tracker
              </h2>
              <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
                Track every application from submission to offer in one place.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </main>

      <footer className="border-border border-t px-5 py-6 text-center text-muted-foreground text-xs">
        <div className="flex justify-center gap-4">
          <Link className="hover:text-foreground" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-foreground" href="/terms">
            Terms
          </Link>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} JobMatch</p>
      </footer>
    </div>
  );
}
