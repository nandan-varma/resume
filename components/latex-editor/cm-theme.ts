import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/**
 * CodeMirror 6 theme that integrates with the app's CSS custom properties.
 * Automatic light/dark mode via var() references.
 */

export const cmTheme = EditorView.theme(
  {
    ".cm-activeLine": {
      backgroundColor: "oklch(from var(--foreground) l c h / 0.03)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "oklch(from var(--foreground) l c h / 0.03)",
    },
    ".cm-content": {
      caretColor: "var(--foreground)",
      padding: "16px",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--foreground)",
      borderLeftWidth: "1.5px",
    },
    ".cm-diagnostic": {
      fontFamily: "var(--font-sans, ui-sans-serif, system-ui)",
      fontSize: "12px",
      padding: "2px 6px",
    },
    ".cm-diagnostic-error": {
      borderLeft: "3px solid var(--destructive)",
      color: "var(--destructive)",
    },
    ".cm-diagnostic-info": {
      borderLeft: "3px solid var(--info)",
      color: "var(--info)",
    },
    ".cm-diagnostic-warning": {
      borderLeft: "3px solid var(--warning)",
      color: "var(--warning)",
    },

    /* ── Fat cursor for overtype mode ───────────── */
    ".cm-fat-cursor": {
      backgroundColor: "var(--foreground)",
      color: "var(--background)",
    },

    /* ── Fold marker ────────────────────────────── */
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--muted-foreground)",
      padding: "0 2px",
    },
    ".cm-gutterElement": {
      fontSize: "11px",
      lineHeight: "1.6",
      padding: "0 8px 0 4px",
    },

    /* ── Gutter (line numbers) ──────────────────── */
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: "1px solid var(--border)",
      color: "var(--muted-foreground)",
      paddingLeft: "4px",
      userSelect: "none",
    },
    ".cm-line": {
      padding: "0",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "24px",
      textAlign: "right",
    },

    /* ── Bracket matching ───────────────────────── */
    ".cm-matchingBracket": {
      backgroundColor: "oklch(from var(--info) l c h / 0.15)",
      outline: "1px solid oklch(from var(--info) l c h / 0.3)",
    },
    ".cm-nonmatchingBracket": {
      backgroundColor: "oklch(from var(--destructive) l c h / 0.15)",
      outline: "1px solid oklch(from var(--destructive) l c h / 0.3)",
    },

    /* ── Panel (e.g. search) ────────────────────── */
    ".cm-panel": {
      "& button": {
        backgroundColor: "var(--muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md, 4px)",
        color: "var(--foreground)",
        cursor: "pointer",
        fontSize: "12px",
        padding: "2px 8px",
      },
      "& input": {
        backgroundColor: "var(--background)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md, 4px)",
        color: "var(--foreground)",
        fontSize: "12px",
        padding: "2px 6px",
      },
      "& label": {
        color: "var(--muted-foreground)",
        fontSize: "12px",
      },
      backgroundColor: "var(--background)",
      borderBottom: "1px solid var(--border)",
      padding: "4px 8px",
    },
    ".cm-scroller": {
      fontFamily:
        "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
      fontSize: "13px",
      lineHeight: "1.6",
    },

    /* ── Scrollbar ──────────────────────────────── */
    ".cm-scroller::-webkit-scrollbar": {
      height: "8px",
      width: "8px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      backgroundColor: "var(--border)",
      borderRadius: "4px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "var(--muted-foreground)",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },

    /* ── Search ─────────────────────────────────── */
    ".cm-searchMatch": {
      backgroundColor: "oklch(from var(--warning) l c h / 0.3)",
      outline: "1px solid oklch(from var(--warning) l c h / 0.5)",
    },
    ".cm-searchMatch.selected": {
      backgroundColor: "oklch(from var(--warning) l c h / 0.5)",
    },
    ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
      backgroundColor: "oklch(from var(--primary) l c h / 0.12)",
    },

    /* ── Selection match ────────────────────────── */
    ".cm-selectionMatch": {
      backgroundColor: "oklch(from var(--primary) l c h / 0.08)",
    },

    /* ── Tooltip ────────────────────────────────── */
    ".cm-tooltip": {
      backgroundColor: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md, 6px)",
      boxShadow: "0 4px 12px oklch(from var(--foreground) l c h / 0.1)",
      color: "var(--popover-foreground)",
      fontSize: "12px",
      lineHeight: "1.5",
      padding: "4px 8px",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily:
          "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
        fontSize: "12px",
        maxHeight: "200px",
      },
      "& > ul > li": {
        padding: "2px 8px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "oklch(from var(--primary) l c h / 0.1)",
        color: "var(--foreground)",
      },
    },
    ".cm-tooltip-lint": {
      borderColor: "var(--destructive)",
    },
    ".cm-tooltip-section": {
      borderTop: "1px solid var(--border)",
      padding: "2px 0",
    },
    ".cm-tooltip.cm-tooltip-above": {
      marginBottom: "4px",
    },
    ".cm-tooltip.cm-tooltip-below": {
      marginTop: "4px",
    },
    "&": {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      height: "100%",
    },
    "&.cm-editor.cm-focused": {
      outline: "none",
    },
    "&.cm-focused .cm-fat-cursor": {
      backgroundColor: "var(--foreground)",
      color: "var(--background)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "oklch(from var(--primary) l c h / 0.12)",
    },
  },
  { dark: false }
);

/* ── Syntax highlighting ────────────────────────── */

export const cmSyntaxHighlight = syntaxHighlighting(
  HighlightStyle.define([
    /* Comments */
    {
      color: "var(--muted-foreground)",
      fontStyle: "italic",
      tag: tags.comment,
    },
    {
      color: "var(--muted-foreground)",
      fontStyle: "italic",
      tag: tags.lineComment,
    },
    {
      color: "var(--muted-foreground)",
      fontStyle: "italic",
      tag: tags.blockComment,
    },

    /* Keywords — \begin, \end, \documentclass, etc. */
    { color: "var(--info)", tag: tags.keyword },
    { color: "var(--info)", tag: tags.controlKeyword },
    { color: "var(--info)", tag: tags.definitionKeyword },
    { color: "var(--info)", tag: tags.moduleKeyword },

    /* Strings — text content in braces */
    { color: "var(--foreground)", tag: tags.string },
    { color: "var(--success)", tag: tags.special(tags.string) },

    /* Characters */
    { color: "var(--foreground)", tag: tags.character },
    { color: "var(--warning)", tag: tags.escape },
    { color: "var(--destructive)", tag: tags.invalid },

    /* Numbers */
    { color: "var(--success)", tag: tags.number },
    { color: "var(--success)", tag: tags.integer },
    { color: "var(--success)", tag: tags.float },

    /* Environment names / types */
    { color: "var(--primary)", tag: tags.typeName },
    { color: "var(--primary)", tag: tags.className },

    { color: "var(--primary)", tag: tags.definition(tags.typeName) },

    /* Command names (control sequences) — like \section, \textbf etc. */
    { color: "var(--info)", tag: tags.attributeName },
    { color: "var(--info)", tag: tags.propertyName },
    { color: "var(--info)", tag: tags.function(tags.propertyName) },

    /* Sectioning commands — \section, \subsection, etc. */
    { color: "var(--foreground)", fontWeight: "600", tag: tags.heading },
    { color: "var(--foreground)", fontWeight: "700", tag: tags.heading1 },
    { color: "var(--foreground)", fontWeight: "600", tag: tags.heading2 },
    { color: "var(--foreground)", fontWeight: "600", tag: tags.heading3 },
    { color: "var(--foreground)", tag: tags.content },

    /* Emphasis / formatting — \emph, \textbf, etc. */
    { fontStyle: "italic", tag: tags.emphasis },
    { fontWeight: "600", tag: tags.strong },
    { tag: tags.strikethrough, textDecoration: "line-through" },
    { color: "var(--info)", tag: tags.link, textDecoration: "underline" },
    { color: "var(--info)", tag: tags.url, textDecoration: "underline" },

    /* Braces, brackets */
    { color: "var(--muted-foreground)", tag: tags.brace },
    { color: "var(--muted-foreground)", tag: tags.bracket },
    { color: "var(--muted-foreground)", tag: tags.paren },
    { color: "var(--muted-foreground)", tag: tags.angleBracket },
    { color: "var(--muted-foreground)", tag: tags.squareBracket },

    /* Meta — \usepackage options, document class options */
    { color: "var(--muted-foreground)", tag: tags.meta },

    /* Document structure */
    { color: "var(--muted-foreground)", tag: tags.documentMeta },
    { color: "var(--warning)", tag: tags.annotation },

    /* Labels and references */
    { color: "var(--success)", tag: tags.labelName },

    /* Separator — & in tables, etc. */
    { color: "var(--muted-foreground)", tag: tags.separator },
    { color: "var(--success)", tag: tags.inserted },
    { color: "var(--destructive)", tag: tags.deleted },
    { color: "var(--warning)", tag: tags.changed },

    /* Units */
    { color: "var(--success)", tag: tags.unit },
  ])
);

export const cmExtensions = [cmTheme, cmSyntaxHighlight];
