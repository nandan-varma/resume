import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/**
 * CodeMirror 6 theme that integrates with the app's CSS custom properties.
 * Automatic light/dark mode via var() references.
 */

export const cmTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      height: "100%",
    },
    "&.cm-editor.cm-focused": {
      outline: "none",
    },
    ".cm-scroller": {
      fontFamily:
        "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
      fontSize: "13px",
      lineHeight: "1.6",
    },
    ".cm-content": {
      caretColor: "var(--foreground)",
      padding: "16px",
    },
    ".cm-line": {
      padding: "0",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--foreground)",
      borderLeftWidth: "1.5px",
    },
    ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
      backgroundColor: "oklch(from var(--primary) l c h / 0.12)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "oklch(from var(--primary) l c h / 0.12)",
    },
    ".cm-activeLine": {
      backgroundColor: "oklch(from var(--foreground) l c h / 0.03)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "oklch(from var(--foreground) l c h / 0.03)",
    },

    /* ── Gutter (line numbers) ──────────────────── */
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: "1px solid var(--border)",
      color: "var(--muted-foreground)",
      paddingLeft: "4px",
      userSelect: "none",
    },
    ".cm-gutterElement": {
      padding: "0 8px 0 4px",
      fontSize: "11px",
      lineHeight: "1.6",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "24px",
      textAlign: "right",
    },

    /* ── Selection match ────────────────────────── */
    ".cm-selectionMatch": {
      backgroundColor: "oklch(from var(--primary) l c h / 0.08)",
    },

    /* ── Search ─────────────────────────────────── */
    ".cm-searchMatch": {
      backgroundColor: "oklch(from var(--warning) l c h / 0.3)",
      outline: "1px solid oklch(from var(--warning) l c h / 0.5)",
    },
    ".cm-searchMatch.selected": {
      backgroundColor: "oklch(from var(--warning) l c h / 0.5)",
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

    /* ── Tooltip ────────────────────────────────── */
    ".cm-tooltip": {
      backgroundColor: "var(--popover)",
      color: "var(--popover-foreground)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md, 6px)",
      boxShadow: "0 4px 12px oklch(from var(--foreground) l c h / 0.1)",
      padding: "4px 8px",
      fontSize: "12px",
      lineHeight: "1.5",
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
    ".cm-tooltip.cm-tooltip-above": {
      marginBottom: "4px",
    },
    ".cm-tooltip.cm-tooltip-below": {
      marginTop: "4px",
    },
    ".cm-tooltip-lint": {
      borderColor: "var(--destructive)",
    },
    ".cm-tooltip-section": {
      borderTop: "1px solid var(--border)",
      padding: "2px 0",
    },
    ".cm-diagnostic": {
      padding: "2px 6px",
      fontFamily: "var(--font-sans, ui-sans-serif, system-ui)",
      fontSize: "12px",
    },
    ".cm-diagnostic-error": {
      color: "var(--destructive)",
      borderLeft: "3px solid var(--destructive)",
    },
    ".cm-diagnostic-warning": {
      color: "var(--warning)",
      borderLeft: "3px solid var(--warning)",
    },
    ".cm-diagnostic-info": {
      color: "var(--info)",
      borderLeft: "3px solid var(--info)",
    },

    /* ── Fold marker ────────────────────────────── */
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--muted-foreground)",
      padding: "0 2px",
    },

    /* ── Panel (e.g. search) ────────────────────── */
    ".cm-panel": {
      backgroundColor: "var(--background)",
      borderBottom: "1px solid var(--border)",
      padding: "4px 8px",
      "& input": {
        fontSize: "12px",
        padding: "2px 6px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md, 4px)",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      },
      "& label": {
        fontSize: "12px",
        color: "var(--muted-foreground)",
      },
      "& button": {
        fontSize: "12px",
        padding: "2px 8px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md, 4px)",
        backgroundColor: "var(--muted)",
        color: "var(--foreground)",
        cursor: "pointer",
      },
    },

    /* ── Fat cursor for overtype mode ───────────── */
    ".cm-fat-cursor": {
      backgroundColor: "var(--foreground)",
      color: "var(--background)",
    },
    "&.cm-focused .cm-fat-cursor": {
      backgroundColor: "var(--foreground)",
      color: "var(--background)",
    },

    /* ── Scrollbar ──────────────────────────────── */
    ".cm-scroller::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      backgroundColor: "var(--border)",
      borderRadius: "4px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "var(--muted-foreground)",
    },
  },
  { dark: false }
);

/* ── Syntax highlighting ────────────────────────── */

export const cmSyntaxHighlight = syntaxHighlighting(
  HighlightStyle.define([
    /* Comments */
    {
      tag: tags.comment,
      color: "var(--muted-foreground)",
      fontStyle: "italic",
    },
    {
      tag: tags.lineComment,
      color: "var(--muted-foreground)",
      fontStyle: "italic",
    },
    {
      tag: tags.blockComment,
      color: "var(--muted-foreground)",
      fontStyle: "italic",
    },

    /* Keywords — \begin, \end, \documentclass, etc. */
    { tag: tags.keyword, color: "var(--info)" },
    { tag: tags.controlKeyword, color: "var(--info)" },
    { tag: tags.definitionKeyword, color: "var(--info)" },
    { tag: tags.moduleKeyword, color: "var(--info)" },

    /* Strings — text content in braces */
    { tag: tags.string, color: "var(--foreground)" },
    { tag: tags.special(tags.string), color: "var(--success)" },

    /* Characters */
    { tag: tags.character, color: "var(--foreground)" },
    { tag: tags.escape, color: "var(--warning)" },
    { tag: tags.invalid, color: "var(--destructive)" },

    /* Numbers */
    { tag: tags.number, color: "var(--success)" },
    { tag: tags.integer, color: "var(--success)" },
    { tag: tags.float, color: "var(--success)" },

    /* Environment names / types */
    { tag: tags.typeName, color: "var(--primary)" },
    { tag: tags.className, color: "var(--primary)" },

    { tag: tags.definition(tags.typeName), color: "var(--primary)" },

    /* Command names (control sequences) — like \section, \textbf etc. */
    { tag: tags.attributeName, color: "var(--info)" },
    { tag: tags.propertyName, color: "var(--info)" },
    { tag: tags.function(tags.propertyName), color: "var(--info)" },

    /* Sectioning commands — \section, \subsection, etc. */
    { tag: tags.heading, color: "var(--foreground)", fontWeight: "600" },
    { tag: tags.heading1, color: "var(--foreground)", fontWeight: "700" },
    { tag: tags.heading2, color: "var(--foreground)", fontWeight: "600" },
    { tag: tags.heading3, color: "var(--foreground)", fontWeight: "600" },
    { tag: tags.content, color: "var(--foreground)" },

    /* Emphasis / formatting — \emph, \textbf, etc. */
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.strong, fontWeight: "600" },
    { tag: tags.strikethrough, textDecoration: "line-through" },
    { tag: tags.link, color: "var(--info)", textDecoration: "underline" },
    { tag: tags.url, color: "var(--info)", textDecoration: "underline" },

    /* Braces, brackets */
    { tag: tags.brace, color: "var(--muted-foreground)" },
    { tag: tags.bracket, color: "var(--muted-foreground)" },
    { tag: tags.paren, color: "var(--muted-foreground)" },
    { tag: tags.angleBracket, color: "var(--muted-foreground)" },
    { tag: tags.squareBracket, color: "var(--muted-foreground)" },

    /* Meta — \usepackage options, document class options */
    { tag: tags.meta, color: "var(--muted-foreground)" },

    /* Document structure */
    { tag: tags.documentMeta, color: "var(--muted-foreground)" },
    { tag: tags.annotation, color: "var(--warning)" },

    /* Labels and references */
    { tag: tags.labelName, color: "var(--success)" },

    /* Separator — & in tables, etc. */
    { tag: tags.separator, color: "var(--muted-foreground)" },
    { tag: tags.inserted, color: "var(--success)" },
    { tag: tags.deleted, color: "var(--destructive)" },
    { tag: tags.changed, color: "var(--warning)" },

    /* Units */
    { tag: tags.unit, color: "var(--success)" },
  ])
);

export const cmExtensions = [cmTheme, cmSyntaxHighlight];
