import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadResume } from "@/server/users";
import { generateLatexFromPdf } from "@/lib/resume-latex";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fileName: string;
  let fileBuffer: number[];

  try {
    ({ fileName, fileBuffer } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!fileName || typeof fileName !== "string" || !Array.isArray(fileBuffer)) {
    return NextResponse.json({ error: "Missing fileName or fileBuffer" }, { status: 400 });
  }

  const buffer = Buffer.from(fileBuffer);

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 413 }
    );
  }

  if (buffer.length < 4 || !buffer.slice(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json(
      { error: "File must be a valid PDF." },
      { status: 400 }
    );
  }

  try {
    const result = await uploadResume(buffer, fileName);
    if (result.success && result.resumeUrl) {
      // Generate LaTeX from the uploaded PDF in the background —
      // response is sent to the client before this runs.
      after(() => generateLatexFromPdf(session.user.id, result.resumeUrl!));
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload resume error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
