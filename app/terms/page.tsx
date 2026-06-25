import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using JobMatch.",
};

export default function TermsPage() {
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

      <main className="mx-auto w-full max-w-2xl px-5 py-12" id="main-content">
        <h1 className="font-bold text-3xl text-foreground tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Last updated: June 2025
        </p>

        <div className="mt-8 space-y-8 text-foreground text-sm leading-7">
          <section>
            <h2 className="font-semibold text-base">1. Acceptance</h2>
            <p className="mt-3 text-muted-foreground">
              By creating an account or using JobMatch, you agree to these
              terms. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">2. The service</h2>
            <p className="mt-3 text-muted-foreground">
              JobMatch is an AI-powered tool that analyzes your resume against
              job descriptions, suggests edits, and tracks applications. It is
              provided "as is" for personal, non-commercial use.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">3. Your account</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>You must be at least 13 years old to use JobMatch.</li>
              <li>You are responsible for keeping your credentials secure.</li>
              <li>
                One account per person. Do not share accounts or create accounts
                on behalf of others.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base">4. Your content</h2>
            <p className="mt-3 text-muted-foreground">
              You retain ownership of any resume content, job descriptions, or
              other data you upload. By using the service, you grant us a
              limited license to process that content solely to operate and
              improve the features you use. We do not use your content to train
              AI models.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">5. AI outputs</h2>
            <p className="mt-3 text-muted-foreground">
              Match scores, keyword suggestions, and resume edits are generated
              by AI and may be inaccurate. Do not rely on them as professional
              career or legal advice. Always review AI-generated changes before
              submitting applications.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">6. Prohibited use</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Do not use JobMatch to submit false or misleading information to
                employers.
              </li>
              <li>Do not scrape, reverse-engineer, or overload the service.</li>
              <li>Do not upload content you do not have the right to share.</li>
              <li>Do not resell or redistribute the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base">
              7. Disclaimer of warranties
            </h2>
            <p className="mt-3 text-muted-foreground">
              JobMatch is provided without warranties of any kind — express or
              implied — including fitness for a particular purpose,
              merchantability, or uninterrupted availability. We do not
              guarantee that using the service will result in interviews, job
              offers, or any other outcome.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">
              8. Limitation of liability
            </h2>
            <p className="mt-3 text-muted-foreground">
              To the maximum extent permitted by law, JobMatch and its operators
              are not liable for indirect, incidental, or consequential damages
              arising from your use of the service. Our total liability for any
              claim is limited to the amount you paid us in the 12 months before
              the claim (if any).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">9. Termination</h2>
            <p className="mt-3 text-muted-foreground">
              You may stop using the service and delete your account at any time
              via Settings. We may suspend or terminate accounts that violate
              these terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">10. Changes</h2>
            <p className="mt-3 text-muted-foreground">
              We may update these terms. We will note material changes at the
              top with a new date. Continued use after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base">11. Contact</h2>
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
