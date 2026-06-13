import { Navigation } from "@/components/navigation";
import { SettingsClient } from "@/components/settings-client";
import { getCurrentUser, getPersonalInformation } from "@/server/users";

export default async function SettingsPage() {
  const [{ currentUser }, personalInfo] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getPersonalInformation(),
  ]);

  return (
    <>
      <Navigation activeTab="settings" />
      <SettingsClient
        userName={currentUser.name}
        userEmail={currentUser.email}
        initialPreferences={personalInfo?.aiPreferences ?? ""}
      />
    </>
  );
}
