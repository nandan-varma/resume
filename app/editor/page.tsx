import type { Metadata } from "next";
import { LatexEditor } from "@/components/latex-editor";
import { getCurrentUser, getPersonalInformation } from "@/server/users";

export const metadata: Metadata = {
  title: "LaTeX Editor",
};

export default async function EditorPage() {
  const [, personalInfo] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getPersonalInformation(),
  ]);

  return (
    <LatexEditor
      initialLatex={personalInfo?.resumeLatex ?? ""}
      initialResumeUrl={personalInfo?.resumeUrl ?? null}
    />
  );
}
