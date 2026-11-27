import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const SAVE_DELAY = 800;
const MERGE_WINDOW = 1000;
const MAX_HISTORY = 100;

/**
 * Editable document state: undo and redo, and an autosave that waits for you to
 * stop typing. `save` returns an error message, or null when it worked.
 */
export function useDoc<T>(
  initial: T,
  save: (doc: T) => Promise<string | null>,
) {
  const [doc, setDoc] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [, bump] = useState(0);

  const current = useRef(doc);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef({ key: "", at: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saving = useRef(false);
  const dirty = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current || !dirty.current) {
      return;
    }
    saving.current = true;
    dirty.current = false;
    setStatus("saving");
    const message = await saveRef.current(current.current);
    saving.current = false;
    if (message) {
      dirty.current = true;
      setError(message);
      setStatus("error");
      return;
    }
    setError(null);
    if (dirty.current) {
      // More edits arrived while saving.
      void flush();
    } else {
      setStatus("saved");
    }
  }, []);

  const commit = useCallback(
    (next: T) => {
      current.current = next;
      setDoc(next);
      dirty.current = true;
      setStatus("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY);
    },
    [flush],
  );

  /** Change the document. Edits with the same key in quick succession undo as one step. */
  const edit = useCallback(
    (key: string, change: (draft: T) => void) => {
      const next = structuredClone(current.current);
      change(next);
      const now = Date.now();
      if (!(last.current.key === key && now - last.current.at < MERGE_WINDOW)) {
        past.current.push(current.current);
        if (past.current.length > MAX_HISTORY) {
          past.current.shift();
        }
      }
      last.current = { key, at: now };
      future.current = [];
      commit(next);
      bump((n) => n + 1);
    },
    [commit],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev !== undefined) {
      future.current.push(current.current);
      last.current = { key: "", at: 0 };
      commit(prev);
      bump((n) => n + 1);
    }
  }, [commit]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next !== undefined) {
      past.current.push(current.current);
      last.current = { key: "", at: 0 };
      commit(next);
      bump((n) => n + 1);
    }
  }, [commit]);

  // Save when the tab is hidden, and warn before leaving with unsaved work.
  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && void flush();
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) {
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("beforeunload", warn);
    };
  }, [flush]);

  // Undo and redo keys, for text edited directly on the page. (Text boxes keep their own.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!(e.metaKey || e.ctrlKey) || !target.isContentEditable) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return {
    doc,
    edit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    status,
    error,
    retry: flush,
  };
}
