import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { getModelInstanceById } from "@/lib/models";

const MARKDOWN_FENCE_START = /^```(?:latex)?\s*/i;
const MARKDOWN_FENCE_END = /\s*```\s*$/;

/**
 * System prompt for converting PDF resumes to LaTeX.
 * Strict requirements ensure consistent output format without external dependencies.
 */
const LATEX_PROMPT = `Convert this resume PDF to a clean LaTeX document.

STRICT REQUIREMENTS:
- \\documentclass{article} with NO \\usepackage{} commands at all
- \\section*{} and \\subsection*{} for headings
- \\textbf{} \\textit{} \\emph{} for emphasis
- itemize / enumerate with \\item for lists
- Use tabular for ALL multi-column layouts including name/date pairs:
    \\begin{tabular}{lr} Left text & Right text \\\\\\ \\end{tabular}
- \\begin{center}...\\end{center} for centred blocks
- \\vspace{4pt} for vertical spacing between sections
- Font size commands: \\small \\large \\Large \\LARGE \\huge for sizing
- \\begin{document}...\\end{document} wrapping the content

DO NOT use \\usepackage{} for anything — not inputenc, fontenc, geometry,
enumitem, microtype, hyperref, multicol, or any other package.
DO NOT use \\hfill, \\hrule, \\rule, \\noindent, \\linewidth, \\textwidth.
DO NOT use fontawesome, moderncv, or any custom .cls files.

Output ONLY the raw LaTeX source. No markdown fences, no commentary.`;

export async function generateLatexFromPdf(
  userId: string,
  pdfBuffer: Buffer
): Promise<void> {
  try {
    const base64 = pdfBuffer.toString("base64");

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
