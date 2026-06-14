import { Navigation } from "@/components/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation activeTab="dashboard" />
      <main id="main-content">{children}</main>
    </>
  );
}
