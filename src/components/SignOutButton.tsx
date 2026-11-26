import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export default function SignOutButton() {
  const signOut = async () => {
    await authClient.signOut();
    window.location.assign("/");
  };
  return (
    <Button variant="ghost" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
