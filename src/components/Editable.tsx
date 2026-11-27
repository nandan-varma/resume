// biome-ignore-all lint/a11y/useSemanticElements: contenteditable keeps line wrapping and the page layout that an <input> cannot
import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

/** No single line of a resume needs more than this; it also keeps a runaway paste from bloating the saved row. */
const MAX_LENGTH = 2000;

/** Put the cursor at a character position (or the end) inside an editable field. */
export function setCaret(el: HTMLElement, at: number | "end" = "end") {
  const text = el.firstChild;
  const range = document.createRange();
  if (text) {
    const length = text.textContent?.length ?? 0;
    range.setStart(text, at === "end" ? length : Math.min(at, length));
  } else {
    range.setStart(el, 0);
  }
  range.collapse(true);
  const selection = getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Where the cursor is in the field, or null when something is selected (or the cursor is elsewhere). */
export function caretOffset(el: HTMLElement) {
  const selection = getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!el.contains(range.endContainer)) {
    return null;
  }
  const before = range.cloneRange();
  before.selectNodeContents(el);
  before.setEnd(range.endContainer, range.endOffset);
  return before.toString().length;
}

/** One line only: line breaks and non-breaking spaces become plain spaces. */
const oneLine = (text: string) =>
  text.replace(/\s*[\r\n]+\s*/g, " ").replace(/ /g, " ");

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Screen-reader name, and the grey hint shown while the field is empty. */
  label: string;
  className?: string;
  /** Path used to move the cursor here after the sheet adds a row. */
  fk?: string;
  /** Enter pressed, with the cursor position so a line can be split there. Without it Enter does nothing. */
  onEnter?: (caret: number) => void;
  /** Backspace pressed with the cursor at the very start (the field may be empty). */
  onBackspaceAtStart?: (empty: boolean) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  /** Left out of the printed line when empty, so on screen it collapses too instead of showing a hint. */
  optional?: boolean;
};

/**
 * A single line of text edited in place. The browser owns the text while you
 * type (so the cursor never jumps); React only writes to the page when the
 * value changed from outside, for example on undo.
 */
export function Editable({
  value,
  onChange,
  label,
  className,
  fk,
  onEnter,
  onBackspaceAtStart,
  onBlur,
  onFocus,
  optional,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const composing = useRef(false);
  // Rendered once so the server HTML has the text; React never touches it again.
  const [first] = useState(value);

  // Older browsers do not know "plaintext-only"; plain "true" plus the paste handler below is the fallback.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.contentEditable !== "plaintext-only") {
      el.contentEditable = "true";
    }
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !composing.current && (el.textContent ?? "") !== value) {
      el.textContent = value;
      if (document.activeElement === el) {
        setCaret(el);
      }
    }
  }, [value]);

  const insert = (text: string) => {
    if (document.execCommand("insertText", false, text)) {
      return;
    }
    // execCommand is gone in some browsers: do it by hand.
    const selection = getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    ref.current?.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.nativeEvent.isComposing || e.key === "Process") {
      return;
    }
    const el = ref.current;
    if (e.key === "Enter") {
      e.preventDefault();
      if (el && onEnter) {
        onEnter(caretOffset(el) ?? (el.textContent ?? "").length);
      }
    } else if (e.key === "Backspace" && el && onBackspaceAtStart) {
      if (caretOffset(el) === 0) {
        e.preventDefault();
        onBackspaceAtStart(!el.textContent);
      }
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLSpanElement>) => {
    e.preventDefault();
    insert(oneLine(e.clipboardData.getData("text/plain")));
  };

  const onInput = (e: FormEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    let text = el.textContent ?? "";
    // Dropped text, spell-check and autofill can sneak in line breaks or a huge block.
    const clean = oneLine(text).slice(0, MAX_LENGTH);
    if (clean !== text && !composing.current) {
      const at = caretOffset(el) ?? clean.length;
      el.textContent = clean;
      setCaret(el, Math.min(at, clean.length));
      text = clean;
    }
    // A fully erased field can keep a stray <br>, which hides the placeholder.
    if (!text) {
      el.replaceChildren();
    }
    onChange(text);
  };

  return (
    <span
      ref={ref}
      role="textbox"
      tabIndex={0}
      aria-label={label}
      data-placeholder={label}
      data-fk={fk}
      data-optional={optional || undefined}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      className={cn("rs-ed", className)}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onBlur={onBlur}
      onFocus={onFocus}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        onChange(e.currentTarget.textContent ?? "");
      }}
    >
      {first}
    </span>
  );
}
