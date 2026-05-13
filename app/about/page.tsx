import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background p-6 md:p-10">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-foreground">About Resume Analyzer</h1>
                    <p className="mt-2 text-muted-foreground">
                        Your personal resume optimization tool powered by AI
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6">
                        <h2 className="mb-3 text-xl font-semibold text-foreground">
                            What We Do
                        </h2>
                        <p className="text-muted-foreground">
                            Our platform helps you optimize your resume by analyzing it against job
                            descriptions. We use advanced AI to identify missing keywords,
                            highlight your strengths, and suggest improvements to increase your
                            chances of landing interviews.
                        </p>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-3 text-xl font-semibold text-foreground">
                            Key Features
                        </h2>
                        <ul className="space-y-2 text-muted-foreground">
                            <li>• AI-powered resume analysis</li>
                            <li>• Job tracking and management</li>
                            <li>• Resume storage in cloud</li>
                            <li>• Personalized improvement suggestions</li>
                        </ul>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-3 text-xl font-semibold text-foreground">
                            How It Works
                        </h2>
                        <ol className="space-y-2 text-muted-foreground">
                            <li>1. Upload your resume</li>
                            <li>2. Paste a job description</li>
                            <li>3. Get AI analysis</li>
                            <li>4. Improve your resume</li>
                        </ol>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-3 text-xl font-semibold text-foreground">
                            Get Started
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Ready to optimize your resume? Start by uploading your resume and
                            analyzing job descriptions.
                        </p>
                        <Link href="/settings">
                            <Button className="w-full">Upload Resume</Button>
                        </Link>
                    </Card>
                </div>

                <Card className="mt-8 border-primary/20 bg-primary/10 p-6">
                    <h3 className="font-semibold text-primary">Privacy & Security</h3>
                    <p className="mt-2 text-primary">
                        Your resume and data are securely stored in Cloudflare R2. We never share
                        your information with third parties and use it only to provide you with
                        personalized analysis.
                    </p>
                </Card>
            </div>
        </div>
    );
}
