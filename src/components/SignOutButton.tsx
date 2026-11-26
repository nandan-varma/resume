import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export default function SignOutButton() {
  const signOut = async () => {
    await authClient.signOut();
    window.location.assign("/");
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={signOut}
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut />
      <span className="hidden max-md:inline">Sign out</span>
    </Button>
  );
}
