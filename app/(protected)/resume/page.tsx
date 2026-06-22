import { ResumeClient } from "@/components/resume-client";
import { getPersonalInformation } from "@/server/resume";

export default async function ResumePage() {
  const personalInfo = await getPersonalInformation();
  return (
    <ResumeClient
      initialLatex={personalInfo?.resumeLatex ?? null}
      initialResumeUrl={personalInfo?.resumeUrl ?? null}
    />
  );
}
