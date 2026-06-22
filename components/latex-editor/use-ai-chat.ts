"use client";

import { useCallback, useRef, useState } from "react";
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
  return {
    id: createMsgId(),
    role: "assistant",
    content,
    ...(editsApplied === undefined ? {} : { editsApplied }),
  };
}

function applyEdits(
  source: string,
  edits: { find: string; replace: string }[]
): { next: string; applied: number } {
  let next = source;
  let applied = 0;
  for (const { find, replace } of edits) {
    const f = find.replace(/\r\n/g, "\n");
    if (next.includes(f)) {
      next = next.replace(f, replace);
      applied++;
    }
  }
  return { next, applied };
}

export function useAiChat(
  getLatex: () => string,
  setLatex: (value: string, isAiEdit: boolean) => void,
  modelId: ModelId,
  job: EditorJob | null,
  chatMessages: ChatMsg[],
  setChatMessages: (
    updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])
  ) => void,
  chatLoading: boolean,
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
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Request failed");
        }

        const { explanation, edits } = data as {
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
        setChatMessages((prev) => [
          ...prev,
          assistantMsg(explanation, applied),
        ]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "AI request failed");
      } finally {
        setChatLoading(false);
      }
    },
    [modelId, getLatex, setLatex, pushUndo, setChatMessages, setChatLoading]
  );

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) {
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
    chatLoading,
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
