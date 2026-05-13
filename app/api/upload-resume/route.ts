import { auth } from "@/lib/auth";
import { uploadResume } from "@/server/users";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileName, fileBuffer } = await req.json();

    if (!fileName || !fileBuffer) {
      return NextResponse.json(
        { error: "Missing fileName or fileBuffer" },
        { status: 400 }
      );
    }

    // Convert array back to Buffer
    const buffer = Buffer.from(fileBuffer);

    const result = await uploadResume(buffer, fileName);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload resume error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to upload resume. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
