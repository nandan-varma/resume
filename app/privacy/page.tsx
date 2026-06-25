import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How JobMatch collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-12 items-center justify-between border-border border-b px-4 sm:px-6">
        <Link
          aria-label="JobMatch — home"
          className="transition-opacity hover:opacity-70"
          href="/"
        >
          <Logo iconSize={24} />
        </Link>
      </header>

      <main
        className="mx-auto w-full max-w-2xl px-5 py-12"
        id="main-content"
      >
        <h1 className="font-bold text-3xl text-foreground tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Last updated: June 2025
        </p>

        <div className="mt-8 space-y-8 text-foreground text-sm leading-7">
          <section>
            <h2 className="font-semibold text-base">1. What we collect</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong>Account data</strong> — email address and password hash
                when you sign up.
              </li>
              <li>
                <strong>Resume content</strong> — the PDF you upload and the
                LaTeX we generate from it, stored in our database and file
                storage.
              </li>
              <li>
                <strong>Job descriptions</strong> — text you paste or URLs you
                submit for analysis.
              </li>
              <li>
                <strong>Application data</strong> — job titles, companies, and
                statuses you track inside JobMatch.
              </li>
              <li>
                <strong>Usage data</strong> — standard server logs (IP address,
                browser, pages visited) for debugging and security.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base">2. How we use it</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>To operate the service — authenticate you, store your data, return results.</li>
              <li>
                To power AI features — your resume and job description text are
                sent to third-party AI providers (Google Gemini, OpenAI) solely
                to generate match scores and edits. We do not use your content
                to train models.
              </li>
              <li>To send transactional emails (password reset) via Resend.</li>
              <li>To debug errors and prevent abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base">3. Third-party services</h2>
            <p className="mt-3 text-muted-foreground">
              We share data with the following processors only as needed to run
              the service:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong>Neon</strong> — serverless PostgreSQL for all structured
                data.
              </li>
              <li>
                <strong>Cloudflare R2</strong> — object storage for uploaded
                PDF resumes.
              </li>
              <li>
                <strong>Google Gemini / OpenAI / Mistral</strong> — AI
                inference for resume analysis and editing.
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery.
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              We do not sell, rent, or share your data with advertisers or
              unrelated third parties.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">4. Data retention</h2>
            <p className="mt-3 text-muted-foreground">
              Your data is kept as long as your account is active. You can
              delete your account at any time from Settings, which removes all
              stored resumes, job data, and chat history. Backups may retain
              data for up to 30 days after deletion.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">5. Security</h2>
            <p className="mt-3 text-muted-foreground">
              All data is transmitted over HTTPS. Passwords are hashed and
              never stored in plaintext. We restrict database access to
              application credentials only.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">6. Your rights</h2>
            <p className="mt-3 text-muted-foreground">
              You can access, export, or delete your data at any time via
              Settings. For any other requests, email us at{" "}
              <a
                className="underline underline-offset-2"
                href="mailto:nandanvarma.me@gmail.com"
              >
                nandanvarma.me@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">7. Changes</h2>
            <p className="mt-3 text-muted-foreground">
              We may update this policy. Material changes will be noted at the
              top with a new date. Continued use after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">8. Contact</h2>
            <p className="mt-3 text-muted-foreground">
              Questions?{" "}
              <a
                className="underline underline-offset-2"
                href="mailto:nandanvarma.me@gmail.com"
              >
                nandanvarma.me@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="mt-auto border-border border-t px-5 py-6 text-center text-muted-foreground text-xs">
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
