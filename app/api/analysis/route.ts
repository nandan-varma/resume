import { auth } from "@/lib/auth";
import { saveAnalysis } from "@/server/users";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, analysisData } = await req.json();

    if (!jobId || !analysisData) {
      return NextResponse.json(
        { error: "Missing jobId or analysisData" },
        { status: 400 }
      );
    }

    const result = await saveAnalysis(jobId, analysisData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis save error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save analysis. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
