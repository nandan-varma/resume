import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateLatexFromPdf } from "@/lib/resume-latex";
import { uploadResume } from "@/server/resume";

const requestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileBuffer: z.array(z.number()).min(4, "File is too small"),
});

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PDF_MIN_SIZE = 4;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const { fileName, fileBuffer } = parsed.data;
  const buffer = Buffer.from(fileBuffer);

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 413 }
    );
  }

  if (
    buffer.length < PDF_MIN_SIZE ||
    !buffer.slice(0, PDF_MIN_SIZE).equals(PDF_MAGIC)
  ) {
    return NextResponse.json(
      { error: "File must be a valid PDF." },
      { status: 400 }
    );
  }

  try {
    const result = await uploadResume(buffer, fileName);
    if (result.success && result.resumeUrl) {
      const { resumeUrl } = result;
      after(() => generateLatexFromPdf(session.user.id, resumeUrl));
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload resume error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to upload. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
