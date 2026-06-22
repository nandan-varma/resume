import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MAX_DESCRIPTION_LENGTH = 8000;
const FETCH_TIMEOUT_MS = 8000;

const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./, // link-local / cloud metadata
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA
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
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  if (!isSafeUrl(url.trim())) {
    return NextResponse.json(
      { error: "Invalid or disallowed URL" },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url.trim(), {
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
    return NextResponse.json(
      { error: "Failed to fetch page. Paste the description manually." },
      { status: 500 }
    );
  }
}
