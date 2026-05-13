"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Loader2, Save } from "lucide-react";
import { getCurrentUser, getPersonalInformation } from "@/server/users";
import { Navigation } from "@/components/navigation";
import { AuthGuard } from "@/components/auth-guard";

interface PersonalInfo {
  id: number;
  resumeUrl: string | null;
  resumeLatex: string | null;
  aiPreferences: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingLatex, setEditingLatex] = useState(false);
  const [latexContent, setLatexContent] = useState("");
  const [aiPreferences, setAiPreferences] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      setUser(userData.currentUser);

      const info = await getPersonalInformation();
      if (info) {
        setPersonalInfo(info as PersonalInfo);
        setLatexContent(info.resumeLatex || "");
        setAiPreferences(info.aiPreferences || "");
      }
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    try {
      setUploading(true);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const response = await fetch("/api/upload-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileBuffer: Array.from(new Uint8Array(buffer)),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      if (data.success) {
        setPersonalInfo({
          ...personalInfo,
          resumeUrl: data.resumeUrl,
        } as PersonalInfo);
        toast.success("Resume uploaded successfully!");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      // In the future, implement a server action to save preferences
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Navigation activeTab="settings" />
        <div className="min-h-screen bg-background p-6 md:p-10">
          <div className="mx-auto max-w-2xl space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navigation activeTab="settings" />
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your profile and resume</p>
          </div>

          {/* Profile Information */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <p className="mt-1 text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <Label>Name</Label>
                <p className="mt-1 text-muted-foreground">{user?.name}</p>
              </div>
            </div>
          </Card>

          {/* Resume Upload */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Resume Management
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="block">Upload PDF Resume</Label>
                <div className="mt-2 flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-center hover:border-border transition-colors">
                    <Upload className="size-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Uploading..." : "Click to upload resume"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleResumeUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {personalInfo?.resumeUrl && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3">
                    <FileText className="size-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">
                        Resume uploaded successfully
                      </p>
                      <a
                        href={personalInfo.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View Resume →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* LaTeX Resume */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              LaTeX Resume (Optional)
            </h2>
            <div className="space-y-4">
              {!editingLatex ? (
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setEditingLatex(true)}
                  >
                    Edit LaTeX Resume
                  </Button>
                  {latexContent && (
                    <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                      <p className="text-sm text-muted-foreground font-mono">
                        {latexContent.substring(0, 200)}...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Label htmlFor="latex">LaTeX Content</Label>
                  <Textarea
                    id="latex"
                    value={latexContent}
                    onChange={(e) => setLatexContent(e.target.value)}
                    rows={10}
                    placeholder="Paste your LaTeX resume content here..."
                    className="mt-1 font-mono text-sm"
                  />
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => setEditingLatex(false)}
                      variant="outline"
                    >
                      Save Draft
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingLatex(false);
                        setLatexContent(personalInfo?.resumeLatex || "");
                      }}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* AI Preferences */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              AI Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="preferences">
                  AI Analysis Preferences (Optional)
                </Label>
                <Textarea
                  id="preferences"
                  value={aiPreferences}
                  onChange={(e) => setAiPreferences(e.target.value)}
                  rows={4}
                  placeholder="E.g., 'Focus on Python and React experience', 'Emphasize remote work experience', etc."
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSavePreferences}
                disabled={savingPrefs}
              >
                {savingPrefs ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
