// biome-ignore-all lint/a11y/useSemanticElements: contenteditable keeps line wrapping and the page layout that an <input> cannot
import {
  type ClipboardEvent,
  type KeyboardEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Screen-reader name, and the grey hint shown while the field is empty. */
  label: string;
  className?: string;
  /** Path used to move the cursor here after the sheet adds a row. */
  fk?: string;
  /** Enter pressed. Without it Enter does nothing, so fields stay on one line. */
  onEnter?: () => void;
  /** Backspace pressed in an empty field. */
  onEmptyBackspace?: () => void;
  onBlur?: () => void;
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
  onEmptyBackspace,
  onBlur,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  // Rendered once so the server HTML has the text; React never touches it again.
  const [first] = useState(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && (el.textContent ?? "") !== value) {
      el.textContent = value;
    }
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.nativeEvent.isComposing) {
        onEnter?.();
      }
    } else if (
      e.key === "Backspace" &&
      onEmptyBackspace &&
      !ref.current?.textContent
    ) {
      e.preventDefault();
      onEmptyBackspace();
    }
  };

  // Keep pasted text on one line.
  const onPaste = (e: ClipboardEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text/plain")
      .replace(/\s*\n+\s*/g, " ");
    document.execCommand("insertText", false, text);
  };

  return (
    <span
      ref={ref}
      role="textbox"
      tabIndex={0}
      aria-label={label}
      data-placeholder={label}
      data-fk={fk}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      className={cn("rs-ed", className)}
      onInput={(e) => {
        const el = e.currentTarget;
        // A fully erased field can keep a stray <br>, which hides the placeholder.
        if (!el.textContent) {
          el.replaceChildren();
        }
        onChange(el.textContent ?? "");
      }}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onBlur={onBlur}
    >
      {first}
    </span>
  );
}
