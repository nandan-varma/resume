"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ErrorBoundary } from "@/lib/error-boundary";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export function SecuritySettings() {
  return (
    <ErrorBoundary>
      <SecuritySettingsInner />
    </ErrorBoundary>
  );
}

function SecuritySettingsInner() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(
    async ({ currentPassword, newPassword }) => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password changed");
      form.reset();
    }
  );

  return (
    <Card className="mb-5 animate-enter-up p-6 [animation-delay:180ms]">
      <div className="mb-4">
        <h2 className="font-semibold text-base text-foreground">Security</h2>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Change your password. This signs you out of other devices.
        </p>
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div>
          <Label className="text-xs" htmlFor="currentPassword">
            Current password
          </Label>
          <Input
            autoComplete="current-password"
            className="mt-1"
            id="currentPassword"
            type="password"
            {...form.register("currentPassword")}
          />
          {form.formState.errors.currentPassword && (
            <p className="mt-1 text-destructive text-xs">
              {form.formState.errors.currentPassword.message}
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs" htmlFor="newPassword">
            New password
          </Label>
          <Input
            autoComplete="new-password"
            className="mt-1"
            id="newPassword"
            type="password"
            {...form.register("newPassword")}
          />
          {form.formState.errors.newPassword && (
            <p className="mt-1 text-destructive text-xs">
              {form.formState.errors.newPassword.message}
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs" htmlFor="confirmPassword">
            Confirm new password
          </Label>
          <Input
            autoComplete="new-password"
            className="mt-1"
            id="confirmPassword"
            type="password"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="mt-1 text-destructive text-xs">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button disabled={form.formState.isSubmitting} size="sm" type="submit">
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Changing…
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 size-3.5" />
              Change password
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
