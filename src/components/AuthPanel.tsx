import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

type Props = { next: string; github: boolean; password: boolean };

export default function AuthPanel({ next, github, password }: Props) {
  const [busy, setBusy] = useState(false);

  const signInWithGitHub = async () => {
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: next,
    });
    if (error) {
      toast.error(error.message ?? "Sign-in failed.");
      setBusy(false);
    }
  };

  const withPassword = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const pw = String(form.get("password"));
    setBusy(true);
    // Local development only: sign in, or create the account on first use.
    let { error } = await authClient.signIn.email({ email, password: pw });
    if (error) {
      ({ error } = await authClient.signUp.email({
        email,
        password: pw,
        name: email.split("@")[0],
      }));
    }
    if (error) {
      toast.error(error.message ?? "Sign-in failed.");
      setBusy(false);
      return;
    }
    window.location.assign(next);
  };

  return (
    <div className="grid gap-3">
      {github && (
        <Button size="lg" disabled={busy} onClick={signInWithGitHub}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
          </svg>
          Continue with GitHub
        </Button>
      )}
      {password && (
        <form onSubmit={withPassword} className="mt-2 grid gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Local development sign-in
          </p>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            aria-label="Email"
            className="field"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            aria-label="Password"
            className="field"
          />
          <Button type="submit" variant="outline" disabled={busy}>
            Continue
          </Button>
        </form>
      )}
      {!(github || password) && (
        <p className="text-sm text-muted-foreground">
          No sign-in method is configured yet.
        </p>
      )}
    </div>
  );
}
