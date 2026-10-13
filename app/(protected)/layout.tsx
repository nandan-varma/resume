import { Navigation } from "@/components/navigation";
import { requireSession } from "@/server/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = await requireSession();
  return (
    <>
      <Navigation user={{ email: currentUser.email, name: currentUser.name }} />
      {children}
    </>
  );
}
