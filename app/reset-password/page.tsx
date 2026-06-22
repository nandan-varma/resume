import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Logo } from "@/components/logo";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm animate-enter-up flex-col gap-6">
        <Link
          aria-label="JobMatch — home"
          className="flex justify-center transition-opacity hover:opacity-70"
          href="/"
        >
          <Logo iconSize={30} />
        </Link>
        <Suspense
          fallback={
            <div className="text-center text-muted-foreground text-sm">
              Loading…
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
