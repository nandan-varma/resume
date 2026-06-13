"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save } from "lucide-react";
import { getPersonalInformation, saveAiPreferences } from "@/server/users";
import { useSession } from "@/lib/auth-client";
import { Navigation } from "@/components/navigation";
import { AuthGuard } from "@/components/auth-guard";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [aiPreferences, setAiPreferences] = useState("");
  const [originalPrefs, setOriginalPrefs] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPersonalInformation().then((info) => {
      const prefs = info?.aiPreferences ?? "";
      setAiPreferences(prefs);
      setOriginalPrefs(prefs);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveAiPreferences(aiPreferences);
    setSaving(false);
    if (result.success) {
      setOriginalPrefs(aiPreferences);
      toast.success("Preferences saved");
    } else {
      toast.error(result.message || "Failed to save");
    }
  };

  const isDirty = aiPreferences !== originalPrefs;

  if (loading) {
    return (
      <AuthGuard>
        <Navigation activeTab="settings" />
        <div className="min-h-screen bg-background p-6 md:p-10">
          <div className="mx-auto max-w-xl space-y-4">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-44" />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navigation activeTab="settings" />
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 animate-enter-up">
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your profile and AI preferences
            </p>
          </div>

          <Card className="mb-5 p-6 animate-enter-up [animation-delay:80ms]">
            <h2 className="mb-4 text-base font-semibold text-foreground">Profile</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Name
                </Label>
                <p className="mt-1 text-sm text-foreground">{session?.user.name}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </Label>
                <p className="mt-1 text-sm text-foreground">{session?.user.email}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 animate-enter-up [animation-delay:150ms]">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                AI Analysis Preferences
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Context the AI uses when analyzing your resume. Be specific about your goals.
              </p>
            </div>
            <Textarea
              value={aiPreferences}
              onChange={(e) => setAiPreferences(e.target.value)}
              rows={5}
              placeholder='e.g. "I am targeting senior backend engineering roles at startups. I have 5 years of Python and Go experience. Emphasize distributed systems work and de-emphasize frontend."'
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {isDirty ? "Unsaved changes" : ""}
              </span>
              <Button
                onClick={handleSave}
                disabled={saving || !isDirty}
                size="sm"
              >
                {saving ? (
                  <><Loader2 className="mr-2 size-3.5 animate-spin" />Saving…</>
                ) : (
                  <><Save className="mr-2 size-3.5" />Save</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
