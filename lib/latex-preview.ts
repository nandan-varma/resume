/**
 * LaTeX → HTML converter for resume preview.
 * Client-side only, no external dependencies.
 * Handles the full subset of LaTeX used in standard resume templates.
 */

// ── Dimension parser ──────────────────────────────────────────────────────────
// LaTeX dims (pt, in, cm, mm, em, ex) pass through to CSS unchanged.
function dim(val: string): string {
  return val.trim();
}

// ── Brace / optarg extractors ─────────────────────────────────────────────────

/** Advance past whitespace (space + tab only, not newline). */
function skipWs(src: string, i: number): number {
  while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
  return i;
}

/**
 * Extract content of the next {braced} group starting at or after index i.
 * Returns [innerContent, indexAfterClosingBrace].
 * Skips leading whitespace (space/tab/newline) before the brace.
 * If there is no '{' at the current position after whitespace, returns ['', i].
 */
function takeBrace(src: string, i: number): [string, number] {
  while (i < src.length && /\s/.test(src[i])) i++;
  if (i >= src.length || src[i] !== '{') return ['', i];
  let depth = 1;
  let j = i + 1;
  while (j < src.length && depth > 0) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === '{') depth++;
    else if (src[j] === '}') depth--;
    j++;
  }
  return [src.slice(i + 1, j - 1), j];
}

/**
 * Extract optional [bracket] argument at position i (skips space/tab only).
 * Returns [content|null, newPos].
 */
function takeOpt(src: string, i: number): [string | null, number] {
  const j = skipWs(src, i);
  if (j >= src.length || src[j] !== '[') return [null, i];
  const end = src.indexOf(']', j + 1);
  if (end === -1) return [null, i];
  return [src.slice(j + 1, end), end + 1];
}

// ── Preamble settings ─────────────────────────────────────────────────────────

interface DocSettings {
  fontSize: string;
  paddingTop: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingRight: string;
  parIndent: boolean;
  pageNumbers: boolean;
}

function parseSettings(preamble: string): DocSettings {
  const s: DocSettings = {
    fontSize: '11pt',
    paddingTop: '1in',
    paddingBottom: '1in',
    paddingLeft: '1in',
    paddingRight: '1in',
    parIndent: true,
    pageNumbers: true,
  };

  // \documentclass[10pt]{article}
  const dc = /\\documentclass\s*\[([^\]]*)\]/.exec(preamble);
  if (dc) {
    const fs = /(\d+pt)/.exec(dc[1]);
    if (fs) s.fontSize = fs[1];
  }

  // \usepackage[left=0.65in,...]{geometry}
  const geom = /\\usepackage\s*\[([^\]]*)\]\s*\{geometry\}/.exec(preamble);
  if (geom) {
    for (const part of geom[1].split(',')) {
      const kv = /^\s*(\w+)\s*=\s*(.+?)\s*$/.exec(part);
      if (!kv) continue;
      switch (kv[1]) {
        case 'left':   s.paddingLeft   = kv[2]; break;
        case 'right':  s.paddingRight  = kv[2]; break;
        case 'top':    s.paddingTop    = kv[2]; break;
        case 'bottom': s.paddingBottom = kv[2]; break;
        case 'margin':
          s.paddingLeft = s.paddingRight = s.paddingTop = s.paddingBottom = kv[2];
          break;
      }
    }
  }

  // \setlength{\parindent}{0pt}
  if (/\\setlength\s*\{\\parindent\}\s*\{0[^}]*\}/.test(preamble)) s.parIndent = false;

  // \pagenumbering{gobble}
  if (/\\pagenumbering\s*\{gobble\}/.test(preamble)) s.pageNumbers = false;

  return s;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function buildCss(s: DocSettings): string {
  return `
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: ${s.fontSize};
  line-height: 1.35;
  color: #000;
  background: #fff;
  margin: 0;
  padding: ${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft};
  max-width: 8.5in;
  ${s.parIndent ? '' : 'text-indent: 0;'}
}
p { margin: 0.3em 0; text-indent: ${s.parIndent ? '1.5em' : '0'}; }
h2.lt-section {
  font-family: inherit;
  font-size: inherit;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 0.6pt solid #000;
  padding-bottom: 1px;
  margin: 0.7em 0 0.2em;
  line-height: 1.2;
}
h3.lt-subsection {
  font-family: inherit;
  font-size: inherit;
  font-weight: bold;
  margin: 0.5em 0 0.1em;
}
h4.lt-subsubsection {
  font-family: inherit;
  font-size: inherit;
  font-weight: bold;
  margin: 0.4em 0 0.1em;
}
ul, ol { margin: 0.2em 0 0.2em 1.5em; padding: 0; }
li { margin: 0.1em 0; line-height: 1.3; }
a { color: inherit; }
code, tt { font-family: 'Courier New', Courier, monospace; font-size: 0.9em; }
.lt-center { text-align: center; }
.lt-hfill { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5em; }
.lt-hfill-spacer { flex: 1; }
hr.lt-rule { border: 0; border-top: 0.6pt solid #000; margin: 0.3em 0; }
@media print {
  body { padding: 0; }
  @page { margin: ${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}; }
}
`.trim();
}

// ── Inline scope state ────────────────────────────────────────────────────────

interface InlineState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  smallcaps: boolean;
  tt: boolean;
  fontSize: string | null; // css font-size value or null = inherit
}

const DEFAULT_STATE: InlineState = {
  bold: false, italic: false, underline: false, smallcaps: false, tt: false, fontSize: null,
};

// ── Font size table ───────────────────────────────────────────────────────────
// These map LaTeX size commands to CSS font-size values relative to 10pt base.
const FONT_SIZE_CMD: Record<string, string> = {
  tiny: '5pt',
  scriptsize: '7pt',
  footnotesize: '8pt',
  small: '9pt',
  normalsize: '10pt',
  large: '12pt',
  Large: '14.4pt',
  LARGE: '17.28pt',
  huge: '20.74pt',
  Huge: '24.88pt',
};

// ── Inline converter ──────────────────────────────────────────────────────────

/**
 * Convert a LaTeX inline string to HTML.
 * Handles nested braces/groups and all common formatting commands.
 */
export function convertInline(src: string): string {
  return processInline(src, { ...DEFAULT_STATE }).html;
}

interface InlineResult { html: string; pos: number }

/** Process inline LaTeX from position i in src, within a given style state.
 *  Stops at unmatched '}' or end of string.
 *  Returns { html, pos: index of stopping character ('}' or src.length) }. */
function processInline(src: string, state: InlineState, start = 0): InlineResult {
  let out = '';
  let i = start;

  while (i < src.length) {
    const ch = src[i];

    // ── Group end ──────────────────────────────────────────────────────────────
    if (ch === '}') {
      return { html: wrapState(out, state), pos: i };
    }

    // ── Group open ─────────────────────────────────────────────────────────────
    if (ch === '{') {
      const r = processInline(src, { ...state }, i + 1);
      out += r.html;
      i = r.pos + 1; // skip the '}'
      continue;
    }

    // ── Backslash ──────────────────────────────────────────────────────────────
    if (ch === '\\') {
      // \\ or \\[dim]  →  line break
      if (src[i + 1] === '\\') {
        i += 2;
        const [, after] = takeOpt(src, i);
        i = after;
        out += '<br>';
        continue;
      }

      // Special single-char escapes
      const ESCAPES: Record<string, string> = {
        '%': '%', '$': '$', '&': '&amp;', '#': '#',
        '_': '_', ' ': '&nbsp;', ',': '&thinsp;',
        ';': '&ensp;', '!': '',  '-': '', '.': '',
        '`': '`', "'": '&rsquo;',
        '{': '{', '}': '}',
        '\\': '<br>',
      };
      if (src[i + 1] !== undefined && ESCAPES[src[i + 1]] !== undefined) {
        out += ESCAPES[src[i + 1]];
        i += 2;
        continue;
      }

      // Named command: \cmdname or \cmdname*
      const cmdMatch = /^\\([A-Za-z@]+)(\*?)/.exec(src.slice(i));
      if (!cmdMatch) {
        out += '\\';
        i++;
        continue;
      }
      const [, cmdName, star] = cmdMatch;
      i += cmdMatch[0].length;

      // ── Font declarations (no arg) ────────────────────────────────────────
      if (cmdName === 'bfseries') { state = { ...state, bold: true };    continue; }
      if (cmdName === 'mdseries') { state = { ...state, bold: false };   continue; }
      if (cmdName === 'itshape' || cmdName === 'slshape') { state = { ...state, italic: true };  continue; }
      if (cmdName === 'upshape') { state = { ...state, italic: false }; continue; }
      if (cmdName === 'ttfamily') { state = { ...state, tt: true };    continue; }
      if (cmdName === 'rmfamily' || cmdName === 'sffamily') { state = { ...state, tt: false }; continue; }
      if (cmdName === 'normalfont') { state = { ...state, bold: false, italic: false, tt: false, smallcaps: false }; continue; }
      if (cmdName === 'scshape') { state = { ...state, smallcaps: true }; continue; }

      // ── Font size declarations (no arg) ───────────────────────────────────
      if (FONT_SIZE_CMD[cmdName]) {
        state = { ...state, fontSize: FONT_SIZE_CMD[cmdName] };
        continue;
      }

      // ── Commands with one braced arg ──────────────────────────────────────
      if (cmdName === 'textbf') {
        const [c, j] = takeBrace(src, i);
        out += `<strong>${convertInline(c)}</strong>`;
        i = j; continue;
      }
      if (cmdName === 'textit' || cmdName === 'textsl') {
        const [c, j] = takeBrace(src, i);
        out += `<em>${convertInline(c)}</em>`;
        i = j; continue;
      }
      if (cmdName === 'emph') {
        const [c, j] = takeBrace(src, i);
        out += `<em>${convertInline(c)}</em>`;
        i = j; continue;
      }
      if (cmdName === 'underline') {
        const [c, j] = takeBrace(src, i);
        out += `<u>${convertInline(c)}</u>`;
        i = j; continue;
      }
      if (cmdName === 'texttt') {
        const [c, j] = takeBrace(src, i);
        out += `<code>${convertInline(c)}</code>`;
        i = j; continue;
      }
      if (cmdName === 'textrm') {
        const [c, j] = takeBrace(src, i);
        out += convertInline(c);
        i = j; continue;
      }
      if (cmdName === 'textsf') {
        const [c, j] = takeBrace(src, i);
        out += `<span style="font-family:sans-serif">${convertInline(c)}</span>`;
        i = j; continue;
      }
      if (cmdName === 'textsc') {
        const [c, j] = takeBrace(src, i);
        out += `<span style="font-variant:small-caps">${convertInline(c)}</span>`;
        i = j; continue;
      }
      if (cmdName === 'textup') {
        const [c, j] = takeBrace(src, i);
        out += convertInline(c);
        i = j; continue;
      }
      if (cmdName === 'textcolor' || cmdName === 'color') {
        // \textcolor{color}{text} or \color{color}
        const [, j1] = takeBrace(src, i); // skip color arg
        if (cmdName === 'textcolor') {
          const [c, j2] = takeBrace(src, j1);
          out += convertInline(c);
          i = j2;
        } else {
          i = j1; // \color just sets state, no second arg consumed here
        }
        continue;
      }

      // ── Font size with braced arg ─────────────────────────────────────────
      // e.g. {\LARGE text} is handled by the group mechanism above.
      // But \LARGE{text} (with explicit braces) also occurs:
      if (FONT_SIZE_CMD[cmdName] && src[skipWs(src, i)] === '{') {
        const [c, j] = takeBrace(src, i);
        out += `<span style="font-size:${FONT_SIZE_CMD[cmdName]}">${convertInline(c)}</span>`;
        i = j; continue;
      }

      // ── \uppercase / \MakeUppercase ───────────────────────────────────────
      if (cmdName === 'uppercase' || cmdName === 'MakeUppercase') {
        const [c, j] = takeBrace(src, i);
        out += `<span style="text-transform:uppercase">${convertInline(c)}</span>`;
        i = j; continue;
      }

      // ── \href{url}{text} ─────────────────────────────────────────────────
      if (cmdName === 'href') {
        const [url, j1] = takeBrace(src, i);
        const [text, j2] = takeBrace(src, j1);
        out += `<a href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">${convertInline(text)}</a>`;
        i = j2; continue;
      }
      if (cmdName === 'url') {
        const [url, j] = takeBrace(src, i);
        out += `<a href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">${escHtml(url)}</a>`;
        i = j; continue;
      }
      if (cmdName === 'email') {
        const [addr, j] = takeBrace(src, i);
        out += `<a href="mailto:${escAttr(addr)}">${escHtml(addr)}</a>`;
        i = j; continue;
      }

      // ── Horizontal spacing ────────────────────────────────────────────────
      if (cmdName === 'hfill') {
        out += '<span class="lt-hfill-spacer"></span>';
        continue;
      }
      if (cmdName === 'hspace' || cmdName === 'hspace*') {
        const [d, j] = takeBrace(src, i);
        out += `<span style="display:inline-block;width:${dim(d)}"></span>`;
        i = j; continue;
      }
      if (cmdName === 'quad') { out += '&emsp;'; continue; }
      if (cmdName === 'qquad') { out += '&emsp;&emsp;'; continue; }
      if (cmdName === 'enspace') { out += '&ensp;'; continue; }
      if (cmdName === 'thinspace') { out += '&thinsp;'; continue; }
      if (cmdName === 'medspace') { out += ' '; continue; }

      // ── Vertical spacing (inline context, rare) ───────────────────────────
      if (cmdName === 'vspace' || cmdName === 'vspace*') {
        const [d, j] = takeBrace(src, i);
        out += `<span style="display:block;height:${dim(d)}"></span>`;
        i = j; continue;
      }

      // ── \mbox, \makebox, \raisebox, \parbox → extract text ───────────────
      if (cmdName === 'mbox') {
        const [c, j] = takeBrace(src, i);
        out += convertInline(c); i = j; continue;
      }
      if (cmdName === 'makebox') {
        const [,j1] = takeOpt(src, i);   // optional width
        const [,j2] = takeOpt(src, j1);  // optional align
        const [c, j3] = takeBrace(src, j2);
        out += convertInline(c); i = j3; continue;
      }
      if (cmdName === 'raisebox') {
        const [,j1] = takeBrace(src, i); // raise dim
        const [opt,j2] = takeOpt(src, j1);
        const [opt2,j3] = opt !== null ? takeOpt(src, j2) : [null, j2];
        const [c, j4] = takeBrace(src, j3);
        out += convertInline(c); i = j4; continue;
      }
      if (cmdName === 'parbox') {
        const [,j1] = takeBrace(src, i); // width
        const [c, j2] = takeBrace(src, j1);
        out += convertInline(c); i = j2; continue;
      }
      if (cmdName === 'phantom' || cmdName === 'hphantom' || cmdName === 'vphantom') {
        const [,j] = takeBrace(src, i); i = j; continue;
      }

      // ── Rules and lines ───────────────────────────────────────────────────
      if (cmdName === 'rule') {
        const [,j1] = takeOpt(src, i);   // optional raise
        const [w, j2] = takeBrace(src, j1);
        const [h, j3] = takeBrace(src, j2);
        out += `<span style="display:inline-block;width:${dim(w)};height:${dim(h)};background:#000"></span>`;
        i = j3; continue;
      }
      if (cmdName === 'hrule' || cmdName === 'noindent') { continue; }
      if (cmdName === 'titlerule') {
        out += '<hr class="lt-rule">';
        continue;
      }

      // ── Section commands (at inline level - unusual but occurs in groups) ─
      if (cmdName === 'section' || cmdName === 'section*') {
        const [c, j] = takeBrace(src, i);
        out += `<h2 class="lt-section">${convertInline(c)}</h2>`;
        i = j; continue;
      }
      if (cmdName === 'subsection' || cmdName === 'subsection*') {
        const [c, j] = takeBrace(src, i);
        out += `<h3 class="lt-subsection">${convertInline(c)}</h3>`;
        i = j; continue;
      }

      // ── Misc display commands ─────────────────────────────────────────────
      if (cmdName === 'newline') { out += '<br>'; continue; }
      if (cmdName === 'linebreak') { out += '<br>'; const [,j] = takeOpt(src, i); i = j; continue; }
      if (cmdName === 'smallskip') { out += '<span style="display:block;height:3pt"></span>'; continue; }
      if (cmdName === 'medskip')   { out += '<span style="display:block;height:6pt"></span>'; continue; }
      if (cmdName === 'bigskip')   { out += '<span style="display:block;height:12pt"></span>'; continue; }
      if (cmdName === 'par')       { out += '<br>'; continue; }

      // ── Math shortcuts ────────────────────────────────────────────────────
      if (cmdName === 'approx') { out += '&asymp;'; continue; }
      if (cmdName === 'cdot')   { out += '&middot;'; continue; }
      if (cmdName === 'ldots' || cmdName === 'dots') { out += '&hellip;'; continue; }
      if (cmdName === 'times')  { out += '&times;'; continue; }
      if (cmdName === 'pm')     { out += '&plusmn;'; continue; }
      if (cmdName === 'geq' || cmdName === 'ge') { out += '&ge;'; continue; }
      if (cmdName === 'leq' || cmdName === 'le') { out += '&le;'; continue; }
      if (cmdName === 'neq' || cmdName === 'ne') { out += '&ne;'; continue; }

      // ── Accents (simplified) ──────────────────────────────────────────────
      const ACCENTS: Record<string, string> = {
        // Precomposed chars for common cases
        'acute': '&acute;', 'grave': '`',
      };

      // Commands that consume a braced arg but whose content we just pass through:
      const PASSTHROUGH = new Set([
        'textnormal', 'text', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt',
        'mbox', 'hbox',
      ]);
      if (PASSTHROUGH.has(cmdName)) {
        const [c, j] = takeBrace(src, i);
        out += convertInline(c); i = j; continue;
      }

      // Commands that consume 1 arg and drop it entirely:
      const DROP_ARG = new Set([
        'label', 'ref', 'cite', 'nocite', 'index', 'footnote', 'marginpar',
        'setlength', 'addtolength', 'setcounter', 'addtocounter',
        'renewcommand', 'newcommand', 'providecommand',
        'pagenumbering', 'pagestyle', 'thispagestyle',
        'bibliographystyle', 'bibliography',
        'titleformat', 'titlespacing', 'setlist', 'lstset',
        'geometry', 'hypersetup',
        'usepackage', 'documentclass', 'PassOptionsToPackage',
        'usetikzlibrary',
      ]);
      if (DROP_ARG.has(cmdName)) {
        // Consume optional then braced args (up to 3)
        let j = i;
        const [,j2] = takeOpt(src, j); j = j2;
        for (let g = 0; g < 3; g++) {
          const k = skipWs(src, j);
          if (k < src.length && src[k] === '{') {
            const [,j3] = takeBrace(src, j); j = j3;
          } else break;
        }
        i = j; continue;
      }

      // Commands that take no arg and produce nothing:
      const NO_OP = new Set([
        'noindent', 'indent', 'centering', 'raggedright', 'raggedleft',
        'relax', 'null', 'strut', 'clearpage', 'newpage',
        'maketitle', 'tableofcontents', 'printbibliography',
        'pagenumbering',
        // titlesec / enumitem preamble commands already dropped above
      ]);
      if (NO_OP.has(cmdName)) { continue; }

      // ── Unknown command: if followed by braced arg, show content ──────────
      const kk = skipWs(src, i);
      if (kk < src.length && src[kk] === '{') {
        const [c, j] = takeBrace(src, i);
        out += convertInline(c); i = j; continue;
      }
      // No arg: skip
      continue;
    }

    // ── Tilde (non-breaking space) ─────────────────────────────────────────
    if (ch === '~') { out += '&nbsp;'; i++; continue; }

    // ── Inline math: $...$ or $$...$$ ─────────────────────────────────────
    if (ch === '$') {
      if (src[i + 1] === '$') {
        const end = src.indexOf('$$', i + 2);
        const math = end === -1 ? src.slice(i + 2) : src.slice(i + 2, end);
        out += `<span style="display:block;text-align:center;margin:0.3em 0">${renderMath(math)}</span>`;
        i = end === -1 ? src.length : end + 2;
      } else {
        const end = src.indexOf('$', i + 1);
        const math = end === -1 ? src.slice(i + 1) : src.slice(i + 1, end);
        out += `<span style="font-style:italic">${renderMath(math)}</span>`;
        i = end === -1 ? src.length : end + 1;
      }
      continue;
    }

    // ── Em/en dashes ──────────────────────────────────────────────────────
    if (ch === '-') {
      if (src.slice(i, i + 3) === '---') { out += '&mdash;'; i += 3; continue; }
      if (src.slice(i, i + 2) === '--')  { out += '&ndash;'; i += 2; continue; }
    }

    // ── HTML-unsafe characters ─────────────────────────────────────────────
    if (ch === '<') { out += '&lt;'; i++; continue; }
    if (ch === '>') { out += '&gt;'; i++; continue; }
    if (ch === '&') { out += '&amp;'; i++; continue; }

    out += ch;
    i++;
  }

  return { html: wrapState(out, state), pos: i };
}

/** Wrap html in styling tags based on state diff from DEFAULT_STATE. */
function wrapState(html: string, state: InlineState): string {
  if (state.fontSize) html = `<span style="font-size:${state.fontSize}">${html}</span>`;
  if (state.tt)        html = `<code>${html}</code>`;
  if (state.smallcaps) html = `<span style="font-variant:small-caps">${html}</span>`;
  if (state.italic)    html = `<em>${html}</em>`;
  if (state.bold)      html = `<strong>${html}</strong>`;
  if (state.underline) html = `<u>${html}</u>`;
  return html;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const MATH_SYMBOLS: [RegExp, string][] = [
  [/\\approx\b/g, '≈'], [/\\leq\b/g, '≤'],   [/\\geq\b/g, '≥'],
  [/\\neq\b/g, '≠'],    [/\\ne\b/g, '≠'],     [/\\times\b/g, '×'],
  [/\\cdot\b/g, '·'],   [/\\pm\b/g, '±'],     [/\\mp\b/g, '∓'],
  [/\\infty\b/g, '∞'],  [/\\alpha\b/g, 'α'],  [/\\beta\b/g, 'β'],
  [/\\gamma\b/g, 'γ'],  [/\\delta\b/g, 'δ'],  [/\\theta\b/g, 'θ'],
  [/\\lambda\b/g, 'λ'], [/\\mu\b/g, 'μ'],     [/\\pi\b/g, 'π'],
  [/\\sigma\b/g, 'σ'],  [/\\phi\b/g, 'φ'],    [/\\omega\b/g, 'ω'],
  [/\\sum\b/g, '∑'],    [/\\prod\b/g, '∏'],   [/\\in\b/g, '∈'],
  [/\\notin\b/g, '∉'],  [/\\subset\b/g, '⊂'], [/\\supset\b/g, '⊃'],
  [/\\cup\b/g, '∪'],    [/\\cap\b/g, '∩'],    [/\\forall\b/g, '∀'],
  [/\\exists\b/g, '∃'], [/\\neg\b/g, '¬'],    [/\\to\b/g, '→'],
  [/\\rightarrow\b/g, '→'], [/\\leftarrow\b/g, '←'],
  [/\\ldots\b/g, '…'],  [/\\cdots\b/g, '⋯'],
  [/\\mathbb\{R\}/g, 'ℝ'], [/\\mathbb\{Z\}/g, 'ℤ'], [/\\mathbb\{N\}/g, 'ℕ'],
];

function renderMath(math: string): string {
  let s = escHtml(math);
  for (const [re, sym] of MATH_SYMBOLS) s = s.replace(re, sym);
  // ^{...} superscript, _{...} subscript
  s = s.replace(/\^(\w)/g, '<sup>$1</sup>');
  s = s.replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
  s = s.replace(/_(\w)/g, '<sub>$1</sub>');
  s = s.replace(/_\{([^}]*)\}/g, '<sub>$1</sub>');
  return s;
}

// ── Block / environment converter ─────────────────────────────────────────────

/**
 * Process a single environment.
 * `content` is everything between \begin{name} and \end{name}.
 */
function processEnv(name: string, optArg: string | null, content: string): string {
  switch (name) {
    case 'document':
      return processBody(content);

    case 'center': {
      const inner = processBody(content);
      return `<div class="lt-center">${inner}</div>`;
    }

    case 'itemize':
    case 'enumerate': {
      const tag = name === 'enumerate' ? 'ol' : 'ul';
      // Split on \item (optionally followed by [label])
      const parts = content.split(/(?=\\item\b)/);
      let items = '';
      for (const part of parts) {
        const m = /^\\item\s*(?:\[[^\]]*\])?\s*([\s\S]*)$/.exec(part.trim());
        if (!m) continue;
        items += `<li>${processBody(m[1])}</li>`;
      }
      return `<${tag}>${items}</${tag}>`;
    }

    case 'description': {
      const parts = content.split(/(?=\\item\b)/);
      let items = '';
      for (const part of parts) {
        const m = /^\\item\s*(?:\[([^\]]*)\])?\s*([\s\S]*)$/.exec(part.trim());
        if (!m) continue;
        const [, label = '', body] = m;
        items += `<dt><strong>${convertInline(label)}</strong></dt><dd>${processBody(body)}</dd>`;
      }
      return `<dl>${items}</dl>`;
    }

    case 'tabular':
    case 'tabular*': {
      // Parse column spec (first braced arg), then rows
      let i = 0;
      while (i < content.length && /\s/.test(content[i])) i++;
      const [, after] = takeBrace(content, i);
      const tableBody = content.slice(after);
      const rows = tableBody.split(/\\\\(?:\[[^\]]*\])?/);
      const trs = rows
        .filter(r => r.trim() && !/^[\s\\]*$/.test(r))
        .map(row => {
          const cells = row.split('&').map(c =>
            `<td style="padding:0 0.2em">${convertInline(c.trim())}</td>`
          ).join('');
          return `<tr>${cells}</tr>`;
        });
      return `<table style="width:100%;border-collapse:collapse">${trs.join('')}</table>`;
    }

    case 'verbatim':
    case 'lstlisting':
    case 'minted':
      return `<pre style="font-family:monospace;font-size:0.9em;white-space:pre-wrap">${escHtml(content)}</pre>`;

    case 'abstract':
      return `<div style="margin:1em 2em;font-size:0.9em">${processBody(content)}</div>`;

    case 'quote':
    case 'quotation':
      return `<blockquote style="margin:0.5em 1.5em">${processBody(content)}</blockquote>`;

    case 'minipage': {
      const [,j] = takeBrace(content, 0); // skip width arg
      return `<div style="display:inline-block">${processBody(content.slice(j))}</div>`;
    }

    case 'figure':
    case 'table':
      return `<div style="margin:0.5em auto;text-align:center">${processBody(content)}</div>`;

    default:
      // Unknown: just process the content
      return processBody(content);
  }
}

/**
 * Find and process environments innermost-first.
 * Uses the last \begin{} approach: the rightmost \begin is guaranteed to have
 * no nested \begin of the same type before its matching \end.
 * Stores rendered HTML in `store` and replaces each environment with a NUL
 * placeholder `\x00<idx>\x00` so processBody can output it verbatim without
 * running the HTML through convertInline.
 */
function expandEnvironments(src: string, store: string[]): string {
  let safety = 50;
  while (safety-- > 0) {
    const lastBegin = src.lastIndexOf('\\begin{');
    if (lastBegin === -1) break;

    const nameM = /^\\begin\{(\w+\*?)\}/.exec(src.slice(lastBegin));
    if (!nameM) break;
    const name = nameM[1];

    let cs = lastBegin + nameM[0].length;
    if (src[cs] === '[') {
      const endOpt = src.indexOf(']', cs + 1);
      if (endOpt !== -1) cs = endOpt + 1;
    }

    const endTag = `\\end{${name}}`;
    const endIdx = src.indexOf(endTag, cs);
    if (endIdx === -1) {
      // Unmatched \begin — remove tag and continue
      src = src.slice(0, lastBegin) + src.slice(lastBegin + nameM[0].length);
      continue;
    }

    const content = src.slice(cs, endIdx);
    const html = processEnv(name, null, content);
    const idx = store.length;
    store.push(html);
    src = src.slice(0, lastBegin) + `\x00${idx}\x00` + src.slice(endIdx + endTag.length);
  }
  return src;
}

/**
 * Process a block of LaTeX: environments, sections, paragraphs.
 */
function processBody(src: string): string {
  // Remove comments
  src = src.replace(/(^|[^\\])%[^\n]*/gm, '$1');

  // Expand all environments; store their HTML indexed by placeholder
  const envStore: string[] = [];
  src = expandEnvironments(src, envStore);

  // Now handle block-level commands
  const lines: string[] = [];
  let i = 0;

  while (i < src.length) {
    // ── ENV placeholder → output stored HTML verbatim ────────────────────
    if (src[i] === '\x00') {
      const end = src.indexOf('\x00', i + 1);
      if (end !== -1) {
        const idx = parseInt(src.slice(i + 1, end));
        lines.push(envStore[idx] ?? '');
        i = end + 1;
        continue;
      }
      i++; // malformed placeholder — skip
      continue;
    }

    // ── \section / \subsection / \subsubsection ───────────────────────────
    const secM = /^\\(sub(?:sub)?section|section|paragraph|subparagraph)\*?\s*/.exec(src.slice(i));
    if (secM) {
      i += secM[0].length;
      const [title, j] = takeBrace(src, i);
      i = j;
      const level = secM[1];
      if (level === 'section') {
        lines.push(`<h2 class="lt-section">${convertInline(title)}</h2>`);
      } else if (level === 'subsection') {
        lines.push(`<h3 class="lt-subsection">${convertInline(title)}</h3>`);
      } else {
        lines.push(`<h4 class="lt-subsubsection">${convertInline(title)}</h4>`);
      }
      continue;
    }

    // ── \vspace / \vspace* ────────────────────────────────────────────────
    const vsM = /^\\vspace\*?\s*/.exec(src.slice(i));
    if (vsM) {
      i += vsM[0].length;
      const [d, j] = takeBrace(src, i);
      i = j;
      lines.push(`<div style="height:${dim(d)}"></div>`);
      continue;
    }

    // ── \medskip / \smallskip / \bigskip (block-level) ───────────────────
    const skipM = /^\\(medskip|smallskip|bigskip)\b/.exec(src.slice(i));
    if (skipM) {
      const sizes = { medskip: '6pt', smallskip: '3pt', bigskip: '12pt' };
      lines.push(`<div style="height:${sizes[skipM[1] as keyof typeof sizes]}"></div>`);
      i += skipM[0].length;
      continue;
    }

    // ── \hrule / \titlerule / \noindent / \par / \newline ─────────────────
    const hrM = /^\\(hrule|titlerule)\b/.exec(src.slice(i));
    if (hrM) { lines.push('<hr class="lt-rule">'); i += hrM[0].length; continue; }
    const nnM = /^\\(noindent|indent|centering|raggedright|raggedleft|par|relax)\b/.exec(src.slice(i));
    if (nnM) { i += nnM[0].length; continue; }

    // ── \newline or \\ at block level ────────────────────────────────────
    const nlM = /^\\(?:newline|\\(?:\[[^\]]*\])?)/.exec(src.slice(i));
    if (nlM) { lines.push('<br>'); i += nlM[0].length; continue; }

    // ── leftover \begin{ / \end{ (unrecognized envs after expansion) ────────
    const envTagM = /^\\(?:begin|end)\s*\{[^}]*\}/.exec(src.slice(i));
    if (envTagM) { i += envTagM[0].length; continue; }

    // ── Collect a text chunk up to the next block-level command/env/blank line
    const STOP = /(?:\x00|\n[ \t]*\n|\\begin\{|\\end\{|\\(?:sub)*section\*?|\\vspace\*?|\\(?:med|small|big)skip\b|\\(?:hrule|titlerule)\b|\\(?:noindent|indent|centering|raggedright|raggedleft|relax|par)\b|\\(?:newline|\\(?:\[[^\]]*\])?))/;
    const rest = src.slice(i);
    const stopMatch = STOP.exec(rest);
    const chunk = stopMatch ? rest.slice(0, stopMatch.index) : rest;

    if (chunk.trim()) {
      lines.push(processChunk(chunk.trim()));
    } else if (/\n[ \t]*\n/.test(chunk)) {
      lines.push('<div style="height:0.25em"></div>');
    }

    if (!stopMatch) { i = src.length; break; }
    const prevI = i;
    i += stopMatch.index;
    if (/^\n/.test(stopMatch[0])) {
      // Blank line: advance past it so we don't loop on blank lines
      i += stopMatch[0].length;
    }
    // For commands (\...) and placeholders (\x00): don't advance —
    // the next iteration's top-of-loop handlers will consume them.
    // Safeguard: if nothing moved, force +1 to prevent infinite loop.
    if (i === prevI) i++;
  }

  return lines.join('\n');
}

/**
 * Process a text "chunk" (no section headings, no environments).
 * Splits on \\ to get lines, detects \hfill within each line.
 */
function processChunk(src: string): string {
  // Split on \\ (LaTeX line break)
  const rawLines = src.split(/\\\\(?:\[[^\]]*\])?/);
  const resultLines: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) { resultLines.push('<br>'); continue; }

    // Detect \hfill: wrap in flex container
    if (/\\hfill\b/.test(trimmed)) {
      const parts = trimmed.split(/\\hfill\b/);
      const spans = parts.map(p => `<span>${convertInline(p.trim())}</span>`);
      resultLines.push(`<div class="lt-hfill">${spans.join('')}</div>`);
    } else {
      resultLines.push(`<span>${convertInline(trimmed)}</span>`);
    }
  }

  return `<div style="margin:0.1em 0">${resultLines.join('<br>')}</div>`;
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Convert a full LaTeX document to a self-contained HTML string for preview.
 * Pass autoprint=true to trigger window.print() on load (for PDF export).
 */
export function buildPreviewHtml(latex: string, opts: { autoprint?: boolean } = {}): string {
  const bodyStart = latex.indexOf('\\begin{document}');
  const preamble = bodyStart >= 0 ? latex.slice(0, bodyStart) : '';

  let body = '';
  const bodyMatch = /\\begin\{document\}([\s\S]*?)\\end\{document\}/.exec(latex);
  if (bodyMatch) {
    body = bodyMatch[1];
  } else if (bodyStart < 0) {
    // No document wrapper – render as-is
    body = latex;
  }

  const settings = parseSettings(preamble);
  const content = processBody(body);
  const css = buildCss(settings);

  const printScript = opts.autoprint
    ? `<script>window.addEventListener('load',()=>setTimeout(window.print,400))</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${printScript}
<style>${css}</style>
</head>
<body>${content}</body>
</html>`;
}
