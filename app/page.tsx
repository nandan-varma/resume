import Link from "next/link";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Button } from "@/components/ui/button";
import { Sparkles, Briefcase, BarChart3, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="absolute top-0 right-0 left-0 flex items-center justify-between p-6">
        <span className="font-semibold text-foreground text-lg">JobMatch</span>
        <ModeSwitcher />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-5 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Land your dream job with AI
          </h1>
          <p className="text-muted-foreground text-lg">
            Optimize your resume, track applications, and get AI-powered insights
            to stand out from the crowd.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/about">
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          <Card className="p-5 text-left">
            <Sparkles className="mb-3 size-6 text-primary" />
            <h3 className="font-semibold text-foreground">AI Analysis</h3>
            <p className="text-muted-foreground text-sm">
              Match your resume against job descriptions with advanced AI.
            </p>
          </Card>
          <Card className="p-5 text-left">
            <Briefcase className="mb-3 size-6 text-primary" />
            <h3 className="font-semibold text-foreground">Job Tracking</h3>
            <p className="text-muted-foreground text-sm">
              Organize applications and monitor your pipeline end-to-end.
            </p>
          </Card>
          <Card className="p-5 text-left">
            <Shield className="mb-3 size-6 text-primary" />
            <h3 className="font-semibold text-foreground">Secure Storage</h3>
            <p className="text-muted-foreground text-sm">
              Keep your resumes safe in the cloud with private access.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
