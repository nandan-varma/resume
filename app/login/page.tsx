import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main id="main-content" className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6 animate-enter-up">
        <Link href="/" className="flex justify-center transition-opacity hover:opacity-70" aria-label="JobMatch — home">
          <Logo iconSize={30} />
        </Link>
        <LoginForm />
      </div>
    </main>
  );
}
