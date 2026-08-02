import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { auth } from "@/lib/auth";
import { logApiError, logVendorTiming } from "@/lib/dev-log";
import { resolveModel } from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";
import { getAnalysisByJobId } from "@/server/analysis";

const analysisSchema = z.object({
  short_title: z
    .string()
    .describe(
      "Very concise job name in 'Role - Company' format, e.g. 'Senior Engineer - Google'. Max 40 chars."
    ),
  match_percentage: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "ATS keyword match score 0–100. Weight: required skills/tools explicitly named in the JD (45%), experience alignment and years (25%), role title similarity (15%), education/certifications (15%). 70+ = ATS-competitive, 50–69 = fixable gaps, <50 = significant keyword or experience mismatch."
    ),
  summary: z
    .string()
    .describe(
      "2–3 sentences covering: overall ATS keyword match strength, the candidate's most compelling qualification for this role, and the single most critical gap to address."
    ),
  missing_keywords: z
    .array(z.string())
    .describe(
      "Exact keywords and phrases from the job description absent from the resume. Prioritize: required technologies, frameworks, tools, certifications, methodologies, and role-specific jargon that ATS systems scan for as exact or near-exact string matches."
    ),
  improvement_suggestions: z
    .array(z.string())
    .describe(
      "Concrete, high-impact edits — each targeting ATS keyword insertion or measurable human reviewer impact. Examples: 'Add React and TypeScript to your Skills section to match JD requirements', 'Rewrite the first bullet under [Company] to include a metric: e.g. reduced build time by 40%', 'Replace \"worked on\" with \"Architected\" and include the exact tool named in the JD'."
    ),
  strengths: z
    .array(z.string())
    .describe(
      "Resume elements that score well for both ATS parsing and human review: matched keywords present, quantified achievements, strong action verbs, relevant depth of experience, certifications that align with requirements."
    ),
  additional_insights: z
    .string()
    .nullable()
    .describe(
      "ATS formatting risks (multi-column layout, tables, graphics, contact info in headers/footers, non-standard section headings) and overall competitiveness for this role against a typical applicant pool. Null if no notable issues."
    ),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

const requestSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required").max(8000),
  modelId: z.string(),
  jobId: z.number().positive().optional(),
});

const MAX_JD_LENGTH = 8000;

// ponytail: per-instance cache; 5-min TTL means stale at most 5 min after upload
const resumeCache = new Map<string, { b64: string; exp: number }>();

async function fetchResumeBase64(userId: string): Promise<string> {
  const hit = resumeCache.get(userId);
  if (hit && hit.exp > Date.now()) {
    return hit.b64;
  }

  const info = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, userId),
    columns: { resumeUrl: true },
  });
  if (!info?.resumeUrl) {
    throw new Error(
      "No resume found. Upload your resume on the Resume page first."
    );
  }

  const res = await fetch(info.resumeUrl);
  if (!res.ok) {
    throw new Error(
      "Could not fetch your resume from storage. Please re-upload it."
    );
  }

  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  resumeCache.set(userId, { b64, exp: Date.now() + 5 * 60_000 });
  return b64;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`analyze:${session.user.id}`, 10, 60_000)) {
    return Response.json(
      { error: "Too many requests. Please wait a minute." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const { jobDescription, modelId, jobId } = parsed.data;

  // Return cached analysis if one exists for the given job
  if (jobId) {
    const cached = await getAnalysisByJobId(jobId);
    if (cached) {
      return Response.json({
        result: {
          short_title: "",
          match_percentage: cached.matchPercentage,
          summary: cached.summary,
          missing_keywords: cached.missingKeywords,
          improvement_suggestions: cached.improvementSuggestions,
          strengths: cached.strengths,
          additional_insights: cached.additionalInsights ?? null,
        },
      });
    }
  }

  try {
    const resumeBase64 = await fetchResumeBase64(session.user.id);

    const startedAt = performance.now();
    const { output } = await generateText({
      model: resolveModel(modelId),
      output: Output.object({ schema: analysisSchema }),
      system: `You are an expert ATS (Applicant Tracking System) analyst and senior career coach with deep knowledge of how modern ATS software parses, ranks, and scores resumes.

Your analysis must reflect how real ATS systems evaluate candidates — keyword frequency and exactness, section recognition, experience alignment, and formatting compatibility — combined with how a human hiring manager would assess the resume.

ANALYSIS GUIDELINES:
- missing_keywords: List exact terms and phrases from the JD that are absent. ATS matches on precise strings — synonyms do not substitute. Focus on required technical skills, tools, certifications, and role-specific jargon.
- strengths: Identify what the resume already does well for both ATS scoring and human review — keywords already present, quantified achievements with metrics, strong action verbs, clear career progression.
- improvement_suggestions: Prioritize changes with the highest ATS impact — adding missing required keywords naturally into bullet points, quantifying vague achievements with numbers, aligning job title and skill terminology to mirror the JD's exact language.
- match_percentage: Be calibrated. A resume missing multiple required technologies should score below 60 even if the experience is otherwise strong.
- additional_insights: Flag ATS formatting risks such as multi-column layouts, graphics, tables for main content, or contact info placed in headers/footers that ATS parsers cannot read.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this resume against the following job description.\n\nJob Description:\n${jobDescription.slice(0, MAX_JD_LENGTH)}`,
            },
            {
              type: "file",
              data: resumeBase64,
              mediaType: "application/pdf",
              filename: "resume.pdf",
            },
          ],
        },
      ],
    });
    logVendorTiming(`[analyze] ${modelId}`, startedAt);

    return Response.json({ result: output });
  } catch (error) {
    logApiError("[analyze]", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Analysis failed. Please try again.";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
