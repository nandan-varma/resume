import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, requireApiSession } from "@/lib/api-guards";

const requestSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

const MAX_DESCRIPTION_LENGTH = 8000;
const FETCH_TIMEOUT_MS = 8000;

const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./,
  /^fd[0-9a-f]{2}:/i,
  /^::1$/,
  /\.local$/i,
  /^metadata\.google\.internal$/i,
];

function isSafeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return false;
  }
  return !BLOCKED_HOSTS.some((p) => p.test(url.hostname));
}

function extractText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession(req);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { url } = parsed.data;

  if (!isSafeUrl(url)) {
    return NextResponse.json(
      { error: "Invalid or disallowed URL" },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobMatch/1.0)" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch that URL (HTTP ${response.status})` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !(contentType.includes("text/html") || contentType.includes("text/plain"))
    ) {
      return NextResponse.json(
        { error: "URL does not point to a web page" },
        { status: 400 }
      );
    }

    const html = await response.text();
    const description = extractText(html).slice(0, MAX_DESCRIPTION_LENGTH);

    if (!description) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from that page. Try pasting the description manually.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. Paste the description manually." },
        { status: 408 }
      );
    }
    console.error("fetch-job error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch page. Paste the description manually.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
