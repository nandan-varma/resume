"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBoundary } from "@/lib/error-boundary";
import { isValidModelId, type ModelId, models } from "@/lib/models";
import { useModelId } from "@/lib/use-model-id";
import { saveAiPreferences } from "@/server/resume";

interface SettingsClientProps {
  initialPreferences: string;
  userEmail: string;
  userName: string;
}

export function SettingsClient(props: SettingsClientProps) {
  return (
    <ErrorBoundary>
      <SettingsClientInner {...props} />
    </ErrorBoundary>
  );
}

function SettingsClientInner({
  userName,
  userEmail,
  initialPreferences,
}: SettingsClientProps) {
  const [aiPreferences, setAiPreferences] = useState(initialPreferences);
  const [originalPrefs, setOriginalPrefs] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [modelId, setModelId] = useModelId();

  const handleModelChange = (value: string) => {
    if (isValidModelId(value)) {
      setModelId(value as ModelId);
      toast.success("Model saved");
    }
  };

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
    <div className="mx-auto max-w-xl px-6 pb-10 md:px-10">
      <Card className="mb-5 animate-enter-up p-6 [animation-delay:80ms]">
        <h2 className="mb-4 font-semibold text-base text-foreground">
          Profile
        </h2>
        <div className="space-y-3">
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Name
            </Label>
            <p className="mt-1 text-foreground text-sm">{userName}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Email
            </Label>
            <p className="mt-1 text-foreground text-sm">{userEmail}</p>
          </div>
        </div>
      </Card>

      <Card className="mb-5 animate-enter-up p-6 [animation-delay:120ms]">
        <div className="mb-4">
          <h2 className="font-semibold text-base text-foreground">AI Model</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Used for resume analysis, editing, and job customization. Saved
            locally.
          </p>
        </div>
        <Select onValueChange={handleModelChange} value={modelId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  <span className="text-muted-foreground text-xs uppercase">
                    {model.provider}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="animate-enter-up p-6 [animation-delay:150ms]">
        <div className="mb-4">
          <h2 className="font-semibold text-base text-foreground">
            AI Analysis Preferences
          </h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Context the AI uses when analyzing your resume. Be specific about
            your goals.
          </p>
        </div>
        <Textarea
          onChange={(e) => setAiPreferences(e.target.value)}
          placeholder='e.g. "I am targeting senior backend engineering roles at startups. I have 5 years of Python and Go experience. Emphasize distributed systems work and de-emphasize frontend."'
          rows={5}
          value={aiPreferences}
        />
        <div className="mt-4 flex items-center justify-between">
          <span
            className={`text-xs ${isDirty ? "text-warning" : "text-muted-foreground"}`}
          >
            {isDirty ? "Unsaved changes" : ""}
          </span>
          <Button disabled={saving || !isDirty} onClick={handleSave} size="sm">
            {saving ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 size-3.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
