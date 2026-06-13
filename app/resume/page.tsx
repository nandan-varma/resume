import { Navigation } from "@/components/navigation";
import { ResumeClient } from "@/components/resume-client";
import { getCurrentUser, getPersonalInformation } from "@/server/users";

export default async function ResumePage() {
  const [, personalInfo] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getPersonalInformation(),
  ]);

  return (
    <>
      <Navigation activeTab="resume" />
      <ResumeClient
        initialResumeUrl={personalInfo?.resumeUrl ?? null}
        initialLatex={personalInfo?.resumeLatex ?? null}
      />
    </>
  );
}
