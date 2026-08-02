"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { ErrorBoundary } from "@/lib/error-boundary";

export function DangerZone() {
  return (
    <ErrorBoundary>
      <DangerZoneInner />
    </ErrorBoundary>
  );
}

function DangerZoneInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      return;
    }
    setDeleting(true);
    const { error } = await authClient.deleteUser({ password });
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Same reasoning as sign-out: query keys aren't scoped by user id, so the
    // cache must be cleared before anyone else can sign into this tab.
    queryClient.clear();
    setOpen(false);
    router.push("/");
  };

  return (
    <Card className="animate-enter-up border-destructive/30 p-6 [animation-delay:210ms]">
      <div className="mb-4 flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <h2 className="font-semibold text-base text-foreground">
            Danger Zone
          </h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Permanently delete your account, resume, and all tracked
            applications. This cannot be undone.
          </p>
        </div>
      </div>
      <Dialog
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPassword("");
          }
        }}
        open={open}
      >
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">
            <Trash2 className="mr-2 size-3.5" />
            Delete account
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This permanently deletes your resume, job applications, and all
            account data. Enter your password to confirm.
          </p>
          <div>
            <Label className="text-xs" htmlFor="delete-password">
              Password
            </Label>
            <PasswordInput
              autoComplete="current-password"
              autoFocus
              className="mt-1"
              id="delete-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              value={password}
            />
          </div>
          <Button
            className="w-full"
            disabled={!password || deleting}
            onClick={handleDelete}
            variant="destructive"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              "Permanently delete account"
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
