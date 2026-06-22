import { Navigation } from "@/components/navigation";
import { ResumeClient } from "@/components/resume-client";
import { getPersonalInformation } from "@/server/resume";
import { getCurrentUser } from "@/server/users";

export default async function ResumePage() {
  const [, personalInfo] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getPersonalInformation(),
  ]);

  return (
    <>
      <Navigation activeTab="resume" />
      <ResumeClient
        initialLatex={personalInfo?.resumeLatex ?? null}
        initialResumeUrl={personalInfo?.resumeUrl ?? null}
      />
    </>
  );
}
