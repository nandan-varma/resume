import Link from "next/link";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Button } from "@/components/ui/button";
import { Sparkles, Briefcase, Target } from "lucide-react";
import { Logo } from "@/components/logo";
import { SpotlightCard } from "@/components/spotlight-card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-6 animate-enter">
        <Link href="/" aria-label="JobMatch — home" className="transition-opacity hover:opacity-70">
          <Logo iconSize={24} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <ModeSwitcher />
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-16 px-5 py-16 text-center">

        {/* Hero */}
        <div className="relative mx-auto max-w-2xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl animate-enter-blur">
            Land more interviews<br />with AI resume matching
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed animate-enter-up [animation-delay:100ms]">
            Paste any job description. Get a match score, missing keywords, and
            concrete edits — in seconds.
          </p>
          <div className="flex justify-center gap-3 pt-2 animate-enter-up [animation-delay:180ms]">
            <Link href="/signup">
              <Button size="lg">Get started free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>

        {/* Feature grid — three spotlight cells sharing one outer border */}
        <div className="relative mx-auto w-full max-w-3xl animate-enter-up [animation-delay:260ms]">
          <div className="grid border border-border sm:grid-cols-3">
            <SpotlightCard className="border-0 p-6 text-left sm:border-r">
              <Sparkles className="mb-4 size-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground text-sm">Match Score</h3>
              <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                See exactly how well your resume fits a role — and what's missing.
              </p>
            </SpotlightCard>
            <SpotlightCard className="border-0 border-t p-6 text-left sm:border-t-0 sm:border-r">
              <Target className="mb-4 size-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground text-sm">Keyword Gaps</h3>
              <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                Identify the exact terms recruiters and ATS scanners look for.
              </p>
            </SpotlightCard>
            <SpotlightCard className="border-0 border-t p-6 text-left sm:border-t-0">
              <Briefcase className="mb-4 size-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground text-sm">Application Tracker</h3>
              <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                Track every application from submission to offer in one place.
              </p>
            </SpotlightCard>
          </div>
        </div>

      </main>
    </div>
  );
}
