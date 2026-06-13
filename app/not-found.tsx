import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="space-y-3">
        <p className="text-6xl font-bold tracking-tight text-foreground">404</p>
        <h1 className="text-xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </div>
      <Link href="/" aria-label="JobMatch — home">
        <Logo iconSize={22} />
      </Link>
    </div>
  );
}
