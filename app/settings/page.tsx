import { Navigation } from "@/components/navigation";
import { SettingsClient } from "@/components/settings-client";
import { getPersonalInformation } from "@/server/resume";
import { getCurrentUser } from "@/server/users";

export default async function SettingsPage() {
  const [{ currentUser }, personalInfo] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getPersonalInformation(),
  ]);

  return (
    <>
      <Navigation activeTab="settings" />
      <SettingsClient
        initialPreferences={personalInfo?.aiPreferences ?? ""}
        userEmail={currentUser.email}
        userName={currentUser.name}
      />
    </>
  );
}
