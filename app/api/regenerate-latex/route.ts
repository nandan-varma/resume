import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { checkRateLimit, requireApiSession } from "@/lib/api-guards";
import { logApiError } from "@/lib/dev-log";
import { generateLatexFromPdf } from "@/lib/resume-latex";

export async function POST(req: Request) {
  const auth = await requireApiSession(req);
  if (!auth.ok) {
    return auth.response;
  }
  const { session } = auth.data;

  const limited = checkRateLimit(
    `regenerate-latex:${session.user.id}`,
    5,
    60_000
  );
  if (limited) {
    return limited;
  }

  const info = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, session.user.id),
    columns: { resumeUrl: true },
  });
  if (!info?.resumeUrl) {
    return NextResponse.json(
      { error: "No resume uploaded yet." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(info.resumeUrl);
    if (!res.ok) {
      throw new Error("Could not fetch your resume from storage.");
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    const latex = await generateLatexFromPdf(session.user.id, buffer);
    if (latex === null) {
      return NextResponse.json(
        { error: "Generation failed. Please try again." },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, resumeLatex: latex });
  } catch (error) {
    logApiError("[regenerate-latex]", error);
    const message =
      error instanceof Error ? error.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
