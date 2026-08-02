import { generateText } from "ai";
import { sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { resumeDocuments } from "@/db/schema";
import { logApiError, logVendorTiming } from "@/lib/dev-log";
import { getModelInstanceById } from "@/lib/models";

const MARKDOWN_FENCE_START = /^```(?:latex)?\s*/i;
const MARKDOWN_FENCE_END = /\s*```\s*$/;

/**
 * System prompt for converting PDF resumes to LaTeX.
 * Strict requirements ensure consistent output format without external dependencies.
 */
const LATEX_PROMPT = `Convert this resume PDF to a clean, professionally formatted LaTeX document optimized for ATS compatibility and human readability. The result must fill the page — not overflow onto a second page, and not leave large empty space at the bottom of the first.

STEP 1 — before writing anything, estimate content volume with TWO counts:
1. Total bullet points across Experience + Projects.
2. Total entries — every Education entry, every Experience role, every Project, every Leadership/Activities line, each counted once. (Entry headers, date \\hfill lines, and tech-stack/link lines each cost vertical space regardless of how many bullets follow, so a resume with many short entries can be just as tight as one with few long ones — weigh entry count at least as heavily as bullet count.)

Pick exactly ONE density tier below and use its preamble character-for-character (never mix values from different tiers, never invent your own margins/font size):

SPARSE tier — 10 or fewer total bullets AND 4 or fewer total entries. A short resume still needs to read as a full page, so use bigger type, wider margins, and looser spacing:
\`\`\`latex
\\documentclass[11pt]{article}

\\usepackage[letterpaper, left=0.85in, right=0.85in, top=0.65in, bottom=0.65in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{fontawesome5}

\\setlength{\\parindent}{0pt}
\\pagenumbering{gobble}

\\titleformat{\\section}
  {\\bfseries}
  {}
  {0em}
  {\\uppercase}
  [\\titlerule]

\\titlespacing*{\\section}{0pt}{6pt}{4pt}

\\setlist[itemize]{leftmargin=*, itemsep=2pt, topsep=2pt, parsep=1pt}

\\begin{document}
\`\`\`
This tier's entry spacing: \\vspace{5pt}-\\vspace{7pt} between Experience/Project entries; \\\\[7pt] after each Education entry.

STANDARD tier — 11-20 total bullets AND 5-7 total entries:
\`\`\`latex
\\documentclass[10pt]{article}

\\usepackage[letterpaper, left=0.65in, right=0.65in, top=0.45in, bottom=0.45in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{fontawesome5}

\\setlength{\\parindent}{0pt}
\\pagenumbering{gobble}

\\titleformat{\\section}
  {\\bfseries}
  {}
  {0em}
  {\\uppercase}
  [\\titlerule]

\\titlespacing*{\\section}{0pt}{3pt}{2pt}

\\setlist[itemize]{leftmargin=*, itemsep=0pt, topsep=1pt, parsep=0pt}

\\begin{document}
\`\`\`
This tier's entry spacing: \\vspace{2pt}-\\vspace{3pt} between Experience/Project entries; \\\\[4pt] after each Education entry.

DENSE tier — more than 20 total bullets, OR 8 or more total entries, OR the source PDF itself already runs to 2 pages. (Entry count matters here as much as bullets: e.g. 1 experience role + 4 projects + 2 education + 2 leadership lines = 9 entries is DENSE even with a modest bullet count, because that many headers/date-lines/tech-stack-lines adds up fast.)
\`\`\`latex
\\documentclass[10pt]{article}

\\usepackage[letterpaper, left=0.55in, right=0.55in, top=0.4in, bottom=0.4in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{fontawesome5}

\\setlength{\\parindent}{0pt}
\\pagenumbering{gobble}

\\titleformat{\\section}
  {\\bfseries}
  {}
  {0em}
  {\\uppercase}
  [\\titlerule]

\\titlespacing*{\\section}{0pt}{2pt}{1pt}

\\setlist[itemize]{leftmargin=*, itemsep=0pt, topsep=0pt, parsep=0pt}

\\begin{document}
\`\`\`
This tier's entry spacing: NO \\vspace between Experience/Project entries — the bold entry header immediately following \\end{itemize} is separation enough at this density; \\\\[2pt] after each Education entry.

Then reproduce the resume's own content (verbatim — never invented) into this structure, using your chosen tier's entry-spacing values everywhere a spacing value is called for below:

HEADER — centered block:
\\begin{center}
    {\\LARGE\\textbf{FULL NAME}} \\\\[3pt]
    \\small
    <location if present> \\;|\\;
    \\faPhone\\ \\href{tel:NUMBER}{DISPLAY} \\;|\\;
    \\faEnvelope\\ \\href{mailto:EMAIL}{EMAIL} \\;|\\;
    \\faGlobe\\ \\href{URL}{DISPLAY} \\;|\\;
    \\faGithub\\ \\href{URL}{DISPLAY} \\;|\\;
    \\faLinkedin\\ \\href{URL}{DISPLAY}
\\end{center}
Include only the contact items actually present in the source PDF, in this order, each separated by " \\;|\\; ". Never fabricate a phone number, email, or link that isn't in the source.

SECTIONS — \\section{} (rendered uppercase with a rule automatically) using only standard ATS headings that the source content actually supports: Summary, Education, Experience, Projects, Skills, Certifications, Leadership \\& Activities. Skip any section the source resume has no real content for — never add one.

EDUCATION entries — two lines, NO bullet list (unless the source itself lists relevant coursework/honors as bullets, in which case append the same itemize block used for Experience below):
\\textbf{Institution Name} \\hfill Location \\\\
Degree, Major \\;|\\; GPA: VALUE \\hfill \\textbf{Date range} \\\\[Npt]
Omit the GPA segment (and its preceding " \\;|\\; ") entirely if the source resume doesn't list one — never invent one.
CRITICAL: the second line MUST end with \\\\[Npt] (N = your tier's Education trailing value from above) — this is the ONLY line break between this entry and the next. Education has no \\begin{itemize} after it to reset the paragraph, so if this trailing \\\\ is missing, the next entry's \\textbf{Institution Name} silently runs into the same paragraph as this entry's date and the whole section renders as one garbled block of text. Do this for every entry, including the last one in the section.

EXPERIENCE entries:
\\textbf{Role Title} — Company, Location \\hfill \\textbf{Date range}
\\begin{itemize}
    \\item One accomplishment per bullet, action verb first, metric preserved exactly as in the source.
\\end{itemize}

PROJECT entries:
\\textbf{Project Name} \\hfill \\textbf{Date}
\\textit{Tech stack} \\;|\\; \\href{URL}{DISPLAY}
\\begin{itemize}
    \\item One accomplishment per bullet, action verb first, metric preserved exactly as in the source.
\\end{itemize}
Omit the \\textit{} tech-stack/link line if the source doesn't provide that information for the project.

Add your tier's between-entries \\vspace between consecutive Experience/Project entries (after \\end{itemize}, before the next entry) — unless your tier says to omit it (DENSE tier), in which case add nothing there, not even a blank line. Education entries already carry their own spacing via the trailing \\\\[Npt] shown above — do not add a second \\vspace after an Education entry, that would double the gap.

SKILLS — grouped by category with \\textbf{Category:} followed by a comma-separated list, one category per line (use \\\\ between lines).

FORMATTING RULES:
- \\textbf{} for emphasis on key metrics, technologies, and titles; \\textit{} for subtitle/tech-stack lines. Match the density of emphasis already present in the source — do not over-bold plain resumes.
- End with \\end{document}.
- Do not add \\usepackage commands beyond your chosen tier's preamble above.
- Do not use \\hfill outside of the title/date pattern shown above.
- Never insert a blank line to separate entries or paragraphs. A blank line starts a fresh LaTeX paragraph with its own default spacing (larger and less predictable than the explicit \\\\ / \\vspace values given above) and is the single biggest cause of the document spilling onto extra pages. Every line break must be an explicit \\\\ or \\\\[Npt].

DO NOT omit or paraphrase any content — reproduce all text from the original resume faithfully.
DO NOT add sections, bullet points, contact details, dates, or metrics not present in the original.
DO NOT fabricate any fact not found in the source PDF.

Output ONLY the raw LaTeX source, starting with \\documentclass and ending with \\end{document}. No markdown fences, no commentary.`;

export async function generateLatexFromPdf(
  userId: string,
  pdfBuffer: Buffer
): Promise<string | null> {
  try {
    const base64 = pdfBuffer.toString("base64");

    console.log(
      "[resume-latex] using gemini-3.6-flash (fixed, not user-selected)"
    );
    const startedAt = performance.now();
    const { text } = await generateText({
      model: getModelInstanceById("gemini-3.6-flash"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: LATEX_PROMPT },
            {
              type: "file",
              data: base64,
              mediaType: "application/pdf",
              filename: "resume.pdf",
            },
          ],
        },
      ],
    });
    logVendorTiming("[resume-latex] gemini-3.6-flash", startedAt);

    // Strip any accidental markdown fences the model might add
    const latex = text
      .replace(MARKDOWN_FENCE_START, "")
      .replace(MARKDOWN_FENCE_END, "")
      .trim();

    // Global resume doc (jobId null) may not exist yet for a first-time upload.
    await db
      .insert(resumeDocuments)
      .values({ userId, jobId: null, resumeLatex: latex })
      .onConflictDoUpdate({
        target: resumeDocuments.userId,
        targetWhere: sql`${resumeDocuments.jobId} IS NULL`,
        set: {
          resumeLatex: latex,
          version: sql`${resumeDocuments.version} + 1`,
        },
      });
    return latex;
  } catch (error) {
    logApiError("[resume-latex]", error);
    return null;
  }
}
