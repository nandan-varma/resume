import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Jobs",
  description: "Track and manage your job applications",
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
