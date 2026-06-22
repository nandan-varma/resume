import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings-client";
import { getPersonalInformation } from "@/server/resume";
import { getSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile and AI analysis preferences.",
};

export default async function SettingsPage() {
  const [session, personalInfo] = await Promise.all([
    getSession(),
    getPersonalInformation(),
  ]);

  return (
    <SettingsClient
      initialPreferences={personalInfo?.aiPreferences ?? ""}
      userEmail={session?.user.email ?? ""}
      userName={session?.user.name ?? ""}
    />
  );
}
