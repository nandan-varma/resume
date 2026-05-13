import { getCurrentUser, getJobs, getPersonalInformation } from "@/server/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  FileText,
  Briefcase,
  BarChart3,
  ArrowRight,
  Sparkles,
  Target,
} from "lucide-react";

export default async function Dashboard() {
  // getCurrentUser will redirect to /login if not authenticated
  const userData = await getCurrentUser();
  const jobs = await getJobs();
  const personalInfo = await getPersonalInformation();

  const submittedCount = jobs.filter(
    (j) => j.status === "submitted"
  ).length;
  const interviewCount = jobs.filter(
    (j) => j.status === "interview"
  ).length;
  const offerCount = jobs.filter((j) => j.status === "offer").length;
  const acceptedCount = jobs.filter(
    (j) => j.status === "accepted"
  ).length;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome, {userData.currentUser.name}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your job applications and track your career progress
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-3xl font-bold text-foreground">
                  {jobs.length}
                </p>
              </div>
              <Briefcase className="size-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interviews</p>
                <p className="text-3xl font-bold text-foreground">
                  {interviewCount}
                </p>
              </div>
              <BarChart3 className="size-8 text-chart-4" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offers</p>
                <p className="text-3xl font-bold text-foreground">
                  {offerCount}
                </p>
              </div>
              <Target className="size-8 text-chart-2" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-3xl font-bold text-foreground">
                  {acceptedCount}
                </p>
              </div>
              <BarChart3 className="size-8 text-chart-3" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Quick Actions
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Manage Resume
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    {personalInfo?.resumeUrl
                      ? "Update your resume in Cloudflare R2"
                      : "Upload your resume to get started"}
                  </p>
                </div>
                <FileText className="size-6 text-muted-foreground" />
              </div>
              <Link href="/settings">
                <Button className="mt-4 w-full">
                  Go to Settings
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Track Jobs
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    {jobs.length > 0
                      ? `You have ${jobs.length} applications tracked`
                      : "Start tracking your job applications"}
                  </p>
                </div>
                <Briefcase className="size-6 text-muted-foreground" />
              </div>
              <Link href="/jobs">
                <Button className="mt-4 w-full">
                  View Jobs
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Analyze Match
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    Compare your resume against job descriptions with AI
                  </p>
                </div>
                <Sparkles className="size-6 text-muted-foreground" />
              </div>
              <Link href="/analyze">
                <Button className="mt-4 w-full">
                  Analyze
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        {jobs.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Recent Applications
            </h2>
            <Card className="p-6">
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between border-b border-border py-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {job.jobTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {job.status}
                      </p>
                    </div>
                    <Link href="/jobs">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
