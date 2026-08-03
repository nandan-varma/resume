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
// Free/rate-limited models can take 10-20s+ for a first token; this only
// guards against a genuinely stalled stream, not normal slowness.
// ponytail: 150s ceiling — observed real completions on slow free models at
// ~91s, which used to lose the race against a 90s timeout and silently drop
// the turn. Raise further if a model regularly needs more.
const REQUEST_TIMEOUT_MS = 150_000;

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

      // Free/rate-limited models occasionally stall mid-generation with no
      // further chunks and no error — without this the user is stuck on
      // "Analyzing…" forever with no way out but a page refresh.
      const timeoutId = setTimeout(() => {
        ctrl.abort(new DOMException("AI response timed out", "TimeoutError"));
      }, REQUEST_TIMEOUT_MS);

      let content = "";
      let edits: { find: string; replace: string }[] = [];
      let streamError: string | null = null;

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
        // parse at the end. A single chunk that fails schema validation
        // (seen with some free/flaky providers mid tool-call) is skipped
        // rather than aborting the whole exchange — otherwise one bad frame
        // silently discards an otherwise-complete reply.
        const chunkStream = parseJsonEventStream({
          stream: res.body,
          schema: uiMessageChunkSchema,
        }).pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.success) {
                controller.enqueue(chunk.value);
              }
            },
          })
        );

        for await (const message of readUIMessageStream({
          stream: chunkStream,
          // The protocol's own error signal (a provider/stream failure mid-
          // response) — distinct from the model just legitimately saying
          // nothing, so the notice below can be specific when this fires.
          onError: (error) => {
            streamError =
              error instanceof Error ? error.message : String(error);
          },
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

        // A stream can complete without throwing yet carry nothing (seen
        // with slow/free models whose provider connection drops mid-response)
        // — persisting that as a blank assistant bubble looks identical to a
        // real "nothing to say" reply, so the user has no signal to retry.
        if (content.trim() || edits.length > 0) {
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
        } else {
          await appendTurn({
            messages: [
              {
                role: "notice",
                content:
                  streamError ?? "AI returned no response — please try again.",
              },
            ],
          }).catch(() => {
            // toasted by the mutation's onError
          });
        }
        setStreamingMessage(null);
      } catch (err) {
        setStreamingMessage(null);

        // A deliberate cancel (new message sent, component unmounted) aborts
        // with the default reason, whose name is "AbortError" — our own
        // timeout aborts with a distinctly-named reason (below) so it isn't
        // mistaken for one of these silent, nothing-to-show cancellations.
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const isTimeout = err instanceof Error && err.name === "TimeoutError";
        let errorMessage = "AI request failed";
        if (isTimeout) {
          errorMessage = "The AI took too long to respond — please try again.";
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        toast.error(errorMessage);

        // The model's reply was visible to the user before things went
        // wrong (network drop, timeout, upstream error) — persist whatever
        // text it produced instead of letting a visible reply vanish
        // without a trace in the chat log.
        if (content.trim()) {
          await appendTurn({
            messages: [{ role: "assistant", content }],
          }).catch(() => {
            // toasted by the mutation's onError
          });
        } else {
          // Nothing to show and the toast above is ephemeral — leave a
          // permanent trace so the user isn't left assuming a silent no-op.
          await appendTurn({
            messages: [{ role: "notice", content: errorMessage }],
          }).catch(() => {
            // toasted by the mutation's onError
          });
        }
      } finally {
        clearTimeout(timeoutId);
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
