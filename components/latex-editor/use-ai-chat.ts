"use client";

import {
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
} from "ai";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ModelId } from "@/lib/models";
import { useAppendTurn } from "@/lib/queries/resume";
import type { ChatMsg, EditorJob } from "./types";
import { buildHistory, createMsgId } from "./types";

const MAX_UNDO = 50;

// ponytail: collapse consecutive blank lines, track original indices for splice-back
export function collapseBlankLines(lines: string[]): {
  out: string[];
  idx: number[];
} {
  const out: string[] = [];
  const idx: number[] = [];
  let prevBlank = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "" && prevBlank) {
      continue;
    }
    out.push(t);
    idx.push(i);
    prevBlank = t === "";
  }
  return { out, idx };
}

export function applyEdits(
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
      if (
        srcLines
          .slice(i, i + findLines.length)
          .map((l) => l.trim())
          .join("\n") === findTrimmed
      ) {
        srcLines.splice(i, findLines.length, ...replace.split("\n"));
        next = srcLines.join("\n");
        applied++;
        matched = true;
        break;
      }
    }
    if (matched) {
      continue;
    }

    // Pass 3: trim + collapse consecutive blank lines (handles models that normalize blank line counts)
    const { out: fNorm } = collapseBlankLines(findLines);
    const { out: sNorm, idx: sIdx } = collapseBlankLines(srcLines);
    const fJoined = fNorm.join("\n");
    for (let i = 0; i <= sNorm.length - fNorm.length; i++) {
      if (sNorm.slice(i, i + fNorm.length).join("\n") === fJoined) {
        const origStart = sIdx[i];
        const origEnd = sIdx[i + fNorm.length - 1];
        srcLines.splice(
          origStart,
          origEnd - origStart + 1,
          ...replace.split("\n")
        );
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
  fillRatio: number | null,
  chatMessages: ChatMsg[],
  setStreamingMessage: (msg: ChatMsg | null) => void,
  chatLoadingRef: React.MutableRefObject<boolean>,
  setChatLoading: (v: boolean) => void,
  onConflict: () => void
) {
  const [chatInput, setChatInput] = useState("");
  const { mutateAsync: appendTurn } = useAppendTurn(job?.id ?? null, {
    onConflict,
  });

  // Fast, session-local undo for the last few AI edits — separate from the
  // durable per-message restore (server-backed, survives reload). Lost on
  // reload same as before this refactor; not a regression.
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const abortCtrlRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream when the component unmounts
  useEffect(
    () => () => {
      abortCtrlRef.current?.abort();
    },
    []
  );

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
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: streaming parse loop
    ) => {
      if (noticeMsg) {
        try {
          await appendTurn({
            messages: [{ role: "notice", content: noticeMsg }],
          });
        } catch {
          // toasted by the mutation's onError; keep going, the edit itself still matters
        }
      }
      abortCtrlRef.current?.abort();
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;
      setChatLoading(true);

      const streamMsgId = createMsgId();
      setStreamingMessage({
        id: streamMsgId,
        role: "assistant",
        content: "",
        streaming: true,
      });

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
            ...(pageCount === null ? {} : { pageCount }),
            ...(fillRatio === null ? {} : { fillRatio }),
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Request failed");
        }
        if (!res.body) {
          throw new Error("Streaming not supported");
        }

        // Real token-by-token streaming: the route returns the AI SDK's UI
        // message stream (text deltas + tool calls), not one JSON blob to
        // parse at the end.
        const chunkStream = parseJsonEventStream({
          stream: res.body,
          schema: uiMessageChunkSchema,
        }).pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (!chunk.success) {
                throw chunk.error;
              }
              controller.enqueue(chunk.value);
            },
          })
        );

        let content = "";
        let edits: { find: string; replace: string }[] = [];

        for await (const message of readUIMessageStream({
          stream: chunkStream,
        })) {
          content = message.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("");

          const toolPart = message.parts.find(
            (p) => p.type === "tool-editResume" && "input" in p && p.input
          );
          if (toolPart && "input" in toolPart) {
            const input = toolPart.input as
              | { edits?: { find: string; replace: string }[] }
              | undefined;
            if (Array.isArray(input?.edits)) {
              edits = input.edits;
            }
          }

          setStreamingMessage({
            id: streamMsgId,
            role: "assistant",
            content,
            streaming: true,
          });
        }

        const { next, applied } = applyEdits(getLatex(), edits);

        if (applied > 0) {
          pushUndo();
          setLatex(next, true);
        } else if (edits.length > 0) {
          await appendTurn({
            messages: [
              {
                role: "notice",
                content: "Could not apply edits — try rephrasing.",
              },
            ],
          }).catch(() => {
            // toasted by the mutation's onError
          });
        }

        await appendTurn({
          messages: [
            {
              role: "assistant",
              content,
              editsApplied: applied || undefined,
            },
          ],
          ...(applied > 0 ? { latex: next } : {}),
        });
        setStreamingMessage(null);
      } catch (err) {
        // Drop the placeholder either way — a half-streamed message left in
        // state (even to show a partial response) risks confusing the user
        // with a bubble that never got saved.
        setStreamingMessage(null);
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        toast.error(err instanceof Error ? err.message : "AI request failed");
      } finally {
        setChatLoading(false);
      }
    },
    [
      modelId,
      getLatex,
      setLatex,
      pushUndo,
      setStreamingMessage,
      setChatLoading,
      pageCount,
      fillRatio,
      appendTurn,
    ]
  );

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoadingRef.current) {
      return;
    }

    setChatInput("");
    try {
      await appendTurn({ messages: [{ role: "user", content: msg }] });
    } catch {
      return; // toasted by the mutation's onError
    }

    await executeAIEdit(
      msg,
      buildHistory(chatMessages),
      undefined,
      job?.description
    );
  }, [chatInput, chatLoadingRef, chatMessages, executeAIEdit, job, appendTurn]);

  return {
    chatInput,
    setChatInput,
    handleChatSend,
    executeAIEdit,
    undo,
    redo,
  };
}
