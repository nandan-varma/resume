import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the URL and extract main content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Extract text from HTML (simple extraction - in production, use a proper HTML parser)
    // Simple HTML text extraction using regex
    // Remove script and style elements
    let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    cleanHtml = cleanHtml.replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      ""
    );

    // Remove HTML tags
    const textContent = cleanHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    // Take first 3000 characters as job description
    const description = textContent.substring(0, 3000);

    if (!description) {
      return NextResponse.json(
        { error: "Could not extract job description from URL" },
        { status: 400 }
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Fetch job error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch job description. Please paste it manually.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
