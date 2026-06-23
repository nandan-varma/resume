"use client";

import { parsePartialJson } from "ai";
import { useCallback, useRef, useState } from "react";
import type React from "react";
import { toast } from "sonner";
import type { ModelId } from "@/lib/models";
import type { ChatMsg, EditorJob } from "./types";
import { buildHistory, createMsgId } from "./types";

const MAX_UNDO = 50;

function notice(content: string): ChatMsg {
  return { id: createMsgId(), role: "notice", content };
}

function userMsg(content: string): ChatMsg {
  return { id: createMsgId(), role: "user", content };
}

function assistantMsg(content: string, editsApplied?: number): ChatMsg {
  return { id: createMsgId(), role: "assistant", content, editsApplied };
}

// ponytail: collapse consecutive blank lines, track original indices for splice-back
function collapseBlankLines(lines: string[]): { out: string[]; idx: number[] } {
  const out: string[] = [];
  const idx: number[] = [];
  let prevBlank = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "" && prevBlank) continue;
    out.push(t);
    idx.push(i);
    prevBlank = t === "";
  }
  return { out, idx };
}

function applyEdits(
  source: string,
  edits: { find: string; replace: string }[]
): { next: string; applied: number } {
  let next = source;
  let applied = 0;
  for (const { find, replace } of edits) {
    const f = find.replace(/\r\n/g, "\n");

    // Pass 1: exact
    if (next.includes(f)) {
      next = next.replace(f, replace);
      applied++;
      continue;
    }

    const srcLines = next.split("\n");
    const findLines = f.split("\n");

    // Pass 2: trim each line (handles indentation differences)
    const findTrimmed = findLines.map((l) => l.trim()).join("\n");
    let matched = false;
    for (let i = 0; i <= srcLines.length - findLines.length; i++) {
      if (srcLines.slice(i, i + findLines.length).map((l) => l.trim()).join("\n") === findTrimmed) {
        srcLines.splice(i, findLines.length, ...replace.split("\n"));
        next = srcLines.join("\n");
        applied++;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Pass 3: trim + collapse consecutive blank lines (handles models that normalize blank line counts)
    const { out: fNorm } = collapseBlankLines(findLines);
    const { out: sNorm, idx: sIdx } = collapseBlankLines(srcLines);
    const fJoined = fNorm.join("\n");
    for (let i = 0; i <= sNorm.length - fNorm.length; i++) {
      if (sNorm.slice(i, i + fNorm.length).join("\n") === fJoined) {
        const origStart = sIdx[i];
        const origEnd = sIdx[i + fNorm.length - 1];
        srcLines.splice(origStart, origEnd - origStart + 1, ...replace.split("\n"));
        next = srcLines.join("\n");
        applied++;
        break;
      }
    }
  }
  return { next, applied };
}

export function useAiChat(
  getLatex: () => string,
  setLatex: (value: string, isAiEdit: boolean) => void,
  modelId: ModelId,
  job: EditorJob | null,
  pageCount: number | null,
  chatMessages: ChatMsg[],
  setChatMessages: (
    updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])
  ) => void,
  chatLoading: boolean,
  chatLoadingRef: React.MutableRefObject<boolean>,
  setChatLoading: (v: boolean) => void
) {
  const [chatInput, setChatInput] = useState("");

  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  const pushUndo = useCallback(() => {
    const current = getLatex();
    const stack = undoStackRef.current;
    stack.push(current);
    if (stack.length > MAX_UNDO) {
      stack.shift();
    }
    redoStackRef.current = [];
  }, [getLatex]);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      return;
    }
    const current = getLatex();
    redoStackRef.current.push(current);
    const prev = stack.pop();
    if (prev !== undefined) {
      setLatex(prev, true);
    }
  }, [getLatex, setLatex]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) {
      return;
    }
    const current = getLatex();
    undoStackRef.current.push(current);
    const next = stack.pop();
    if (next !== undefined) {
      setLatex(next, true);
    }
  }, [getLatex, setLatex]);

  const executeAIEdit = useCallback(
    async (
      instruction: string,
      history: { role: "user" | "assistant"; content: string }[],
      noticeMsg?: string,
      jobDescription?: string
    ) => {
      if (noticeMsg) {
        setChatMessages((prev) => [...prev, notice(noticeMsg)]);
      }
      setChatLoading(true);

      const streamMsgId = createMsgId();
      setChatMessages((prev) => [
        ...prev,
        { id: streamMsgId, role: "assistant" as const, content: "", streaming: true },
      ]);

      try {
        const res = await fetch("/api/edit-latex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            latex: getLatex(),
            modelId,
            history,
            ...(jobDescription ? { jobDescription } : {}),
            ...(pageCount !== null ? { pageCount } : {}),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Request failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });

          const { value: partial } = await parsePartialJson(text);
          const partialExplanation = (partial as Record<string, unknown> | undefined)?.explanation;
          if (typeof partialExplanation === "string") {
            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === streamMsgId ? { ...m, content: partialExplanation } : m
              )
            );
          }
        }

        const { explanation, edits } = JSON.parse(text) as {
          explanation: string;
          edits: { find: string; replace: string }[];
        };
        const { next, applied } = applyEdits(getLatex(), edits);

        if (applied > 0) {
          pushUndo();
          setLatex(next, true);
        } else if (edits.length > 0) {
          setChatMessages((prev) => [
            ...prev,
            notice("Could not apply edits — try rephrasing."),
          ]);
        }
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === streamMsgId
              ? { ...m, content: explanation, streaming: false, editsApplied: applied || undefined }
              : m
          )
        );
      } catch (err) {
        setChatMessages((prev) => prev.filter((m) => m.id !== streamMsgId));
        toast.error(err instanceof Error ? err.message : "AI request failed");
      } finally {
        setChatLoading(false);
      }
    },
    [modelId, getLatex, setLatex, pushUndo, setChatMessages, setChatLoading, pageCount]
  );

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoadingRef.current) {
      return;
    }

    setChatInput("");
    setChatMessages((prev) => [...prev, userMsg(msg)]);
    await executeAIEdit(
      msg,
      buildHistory(chatMessages),
      undefined,
      job?.description
    );
  }, [
    chatInput,
    chatLoadingRef,
    chatMessages,
    executeAIEdit,
    job,
    setChatMessages,
  ]);

  return {
    chatInput,
    setChatInput,
    handleChatSend,
    executeAIEdit,
    undo,
    redo,
  };
}
