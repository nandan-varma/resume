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
        <Button
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={signInWithGitHub}
        >
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
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            aria-label="Password"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
          <Button type="submit" disabled={busy}>
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
