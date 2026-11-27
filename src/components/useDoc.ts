import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

/** Dispatch on `window` to drop unsaved edits, for example just before the page is replaced with a fresh version. */
export const DISCARD_EVENT = "doc:discard";

const SAVE_DELAY = 800;
const RETRY_DELAY = 5000;
/** Edits to one field within this gap undo as one step, up to MAX_RUN of typing. */
const MERGE_WINDOW = 1000;
const MAX_RUN = 15_000;
const MAX_HISTORY = 100;

/**
 * Editable document state: undo and redo, and an autosave that waits for you to
 * stop typing. `save` returns an error message, or null when it worked.
 *
 * Saves never overlap: edits made during a save go out right after it. A failed
 * save keeps the edits, shows the error, and retries on its own and when the
 * connection returns. Pending edits are sent when you leave the page or tab.
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
  const last = useRef({ key: "", at: 0, since: 0 });
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
    let message: string | null;
    try {
      message = await saveRef.current(current.current);
    } catch {
      message = "Couldn't save. Check your connection.";
    }
    saving.current = false;
    if (message) {
      dirty.current = true;
      setError(message);
      setStatus("error");
      timer.current = setTimeout(flush, RETRY_DELAY);
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
      const { key: lastKey, at, since } = last.current;
      const merge =
        lastKey === key && now - at < MERGE_WINDOW && now - since < MAX_RUN;
      if (!merge) {
        past.current.push(current.current);
        if (past.current.length > MAX_HISTORY) {
          past.current.shift();
        }
      }
      last.current = { key, at: now, since: merge ? since : now };
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
      last.current = { key: "", at: 0, since: 0 };
      commit(prev);
      bump((n) => n + 1);
    }
  }, [commit]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next !== undefined) {
      past.current.push(current.current);
      last.current = { key: "", at: 0, since: 0 };
      commit(next);
      bump((n) => n + 1);
    }
  }, [commit]);

  useEffect(() => {
    const send = () => void flush();
    const hide = () => document.visibilityState === "hidden" && send();
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) {
        e.preventDefault();
      }
    };
    const discard = () => {
      clearTimeout(timer.current);
      dirty.current = false;
      setStatus("saved");
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", send);
    window.addEventListener("online", send);
    window.addEventListener("beforeunload", warn);
    window.addEventListener(DISCARD_EVENT, discard);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", send);
      window.removeEventListener("online", send);
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener(DISCARD_EVENT, discard);
      // Leaving through a page transition: send what is pending (the request outlives the page).
      send();
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
