"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { saveAiPreferences } from "@/server/users";

interface SettingsClientProps {
  userName: string;
  userEmail: string;
  initialPreferences: string;
}

export function SettingsClient({ userName, userEmail, initialPreferences }: SettingsClientProps) {
  const [aiPreferences, setAiPreferences] = useState(initialPreferences);
  const [originalPrefs, setOriginalPrefs] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);

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

  return (
    <main id="main-content" className="min-h-screen p-6 md:p-10">
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
              <p className="mt-1 text-sm text-foreground">{userName}</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </Label>
              <p className="mt-1 text-sm text-foreground">{userEmail}</p>
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
            <span className={`text-xs ${isDirty ? "text-warning" : "text-muted-foreground"}`}>
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
    </main>
  );
}
