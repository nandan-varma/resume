import { after, type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateLatexFromPdf } from "@/lib/resume-latex";
import { uploadResume } from "@/server/resume";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const fileName = formData.get("fileName");

  if (!(file instanceof File) || typeof fileName !== "string" || !fileName) {
    return NextResponse.json(
      { error: "File and fileName are required" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 413 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length < 4 || !buffer.slice(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json(
      { error: "File must be a valid PDF." },
      { status: 400 }
    );
  }

  try {
    const result = await uploadResume(buffer, fileName);
    if (result.success && result.resumeUrl) {
      after(() => generateLatexFromPdf(session.user.id, buffer));
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
