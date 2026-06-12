import Link from "next/link";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Button } from "@/components/ui/button";
import { Sparkles, Briefcase, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/40">
        <span className="font-semibold text-foreground text-lg">JobMatch</span>
        <div className="flex items-center gap-3">
          <ModeSwitcher />
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-5 py-12 text-center">
        <div className="mx-auto max-w-2xl space-y-5">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Land more interviews<br />with AI-powered resume matching
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Paste any job description. Get a match score, missing keywords, and
            concrete edits — in seconds.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/signup">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3 w-full">
          <Card className="p-5 text-left">
            <Sparkles className="mb-3 size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Match Score</h3>
            <p className="text-muted-foreground text-sm mt-1">
              See exactly how well your resume fits a role — and what's missing.
            </p>
          </Card>
          <Card className="p-5 text-left">
            <Target className="mb-3 size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Keyword Gaps</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Identify the exact terms recruiters and ATS scanners look for.
            </p>
          </Card>
          <Card className="p-5 text-left">
            <Briefcase className="mb-3 size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Application Tracker</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Track every application from submission to offer in one place.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
