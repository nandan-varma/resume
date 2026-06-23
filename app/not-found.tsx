import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      id="main-content"
    >
      <div className="animate-enter-up space-y-3">
        <p className="font-bold text-6xl text-foreground tracking-tight">404</p>
        <h1 className="font-semibold text-foreground text-xl">
          Page not found
        </h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex animate-enter-up gap-3 [animation-delay:80ms]">
        <Link href="/jobs">
          <Button>Go to Jobs</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </div>
      <Link aria-label="JobMatch — home" href="/">
        <Logo iconSize={22} />
      </Link>
    </main>
  );
}
