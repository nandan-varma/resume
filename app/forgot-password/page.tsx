import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
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
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
