import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/forms/signup-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a free JobMatch account to get AI match scores, keyword gap analysis, and an AI-assisted resume editor.",
  alternates: {
    canonical: "/signup",
  },
};

export default function SignupPage() {
  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10"
      id="main-content"
    >
      <div className="flex w-full max-w-sm animate-enter-up flex-col gap-6">
        <Link
          aria-label="JobMatch — home"
          className="flex justify-center transition-opacity hover:opacity-70"
          href="/"
        >
          <Logo iconSize={30} />
        </Link>
        <SignupForm />
      </div>
    </main>
  );
}
