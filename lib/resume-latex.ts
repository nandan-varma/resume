import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { logVendorTiming } from "@/lib/dev-log";
import { getModelInstanceById } from "@/lib/models";

const MARKDOWN_FENCE_START = /^```(?:latex)?\s*/i;
const MARKDOWN_FENCE_END = /\s*```\s*$/;

/**
 * System prompt for converting PDF resumes to LaTeX.
 * Strict requirements ensure consistent output format without external dependencies.
 */
const LATEX_PROMPT = `Convert this resume PDF to a clean, professionally formatted LaTeX document optimized for ATS compatibility and human readability.

Begin the document with EXACTLY this preamble, character-for-character, no additions or omissions:
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

Then reproduce the resume's own content (verbatim — never invented) into this structure:

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
Degree, Major \\;|\\; GPA: VALUE \\hfill \\textbf{Date range} \\\\[4pt]
Omit the GPA segment (and its preceding " \\;|\\; ") entirely if the source resume doesn't list one — never invent one.
CRITICAL: the second line MUST end with \\\\[4pt] — this is the ONLY line break between this entry and the next. Education has no \\begin{itemize} after it to reset the paragraph, so if this trailing \\\\ is missing, the next entry's \\textbf{Institution Name} silently runs into the same paragraph as this entry's date and the whole section renders as one garbled block of text. Do this for every entry, including the last one in the section.

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

Add \\vspace{2pt}-\\vspace{3pt} between consecutive Experience/Project entries (after \\end{itemize}, before the next entry). Education entries already carry their own spacing via the trailing \\\\[4pt] shown above — do not add a second \\vspace after an Education entry, that would double the gap.

SKILLS — grouped by category with \\textbf{Category:} followed by a comma-separated list, one category per line (use \\\\ between lines).

FORMATTING RULES:
- \\textbf{} for emphasis on key metrics, technologies, and titles; \\textit{} for subtitle/tech-stack lines. Match the density of emphasis already present in the source — do not over-bold plain resumes.
- End with \\end{document}.
- Do not add \\usepackage commands beyond the fixed preamble above.
- Do not use \\hfill outside of the title/date pattern shown above.
- Never insert a blank line to separate entries or paragraphs. A blank line starts a fresh LaTeX paragraph with its own default spacing (larger and less predictable than the explicit \\\\ / \\vspace values given above) and is the single biggest cause of the document spilling onto extra pages. Every line break must be an explicit \\\\ or \\\\[Npt].

DO NOT omit or paraphrase any content — reproduce all text from the original resume faithfully.
DO NOT add sections, bullet points, contact details, dates, or metrics not present in the original.
DO NOT fabricate any fact not found in the source PDF.

Output ONLY the raw LaTeX source, starting with \\documentclass and ending with \\end{document}. No markdown fences, no commentary.`;

export async function generateLatexFromPdf(
  userId: string,
  pdfBuffer: Buffer
): Promise<void> {
  try {
    const base64 = pdfBuffer.toString("base64");

    console.log(
      "[resume-latex] using gemini-2.5-flash (fixed, not user-selected)"
    );
    const startedAt = performance.now();
    const { text } = await generateText({
      model: getModelInstanceById("gemini-2.5-flash"),
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
    logVendorTiming("[resume-latex] gemini-2.5-flash", startedAt);

    // Strip any accidental markdown fences the model might add
    const latex = text
      .replace(MARKDOWN_FENCE_START, "")
      .replace(MARKDOWN_FENCE_END, "")
      .trim();

    await db
      .update(personalInformation)
      .set({ resumeLatex: latex })
      .where(eq(personalInformation.userId, userId));
  } catch {
    // Background task — fail silently
  }
}
