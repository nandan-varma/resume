"use client";

import { AlertTriangle, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { memo, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  AssistantBubble,
  LoadingBubble,
  QuestionBubble,
  RevisionBadge,
} from "./chat-bubbles";
import { LatexEditorCm } from "./latex-editor-cm";
import {
  type ChatMsg,
  computeRevisionVersions,
  getCurrentRevisionId,
} from "./types";

interface EditorPaneProps {
  activeTab: "editor" | "chat" | "preview";
  chatInput: string;
  chatLoading: boolean;
  chatMessages: ChatMsg[];
  isEmpty: boolean;
  job: { id: number; title: string; description: string } | null;
  latex: string;
  onChatInputChange: (val: string) => void;
  onChatSend: () => void;
  onClearChat: () => void;
  onConsultPick: (
    messageId: number,
    key: string,
    question: string,
    answer: string
  ) => void;
  onConsultSkip: () => void;
  onLatexChange: (latex: string) => void;
  onRecompile: () => void;
  onRedo: () => void;
  onRestore: (revisionId: number) => void;
  onSave: () => void;
  onUndo: () => void;
  pendingQuestion: boolean;
  restoringRevisionId: number | null;
}

function renderMessage(
  msg: ChatMsg,
  chatLoading: boolean,
  onConsultPick: EditorPaneProps["onConsultPick"],
  onConsultSkip: () => void,
  onRestore: (revisionId: number) => void,
  restoringRevisionId: number | null,
  revisionVersions: Map<number, number>,
  currentRevisionId: number | undefined
) {
  if (msg.role === "notice") {
    const revisionVersion =
      msg.revisionId === undefined
        ? undefined
        : revisionVersions.get(msg.revisionId);
    return (
      <div
        className="flex items-center justify-center gap-1.5 py-1 text-muted-foreground text-xs"
        key={msg.id}
      >
        <AlertTriangle className="size-3 shrink-0 text-yellow-500" />
        {msg.content}
        {msg.revisionId !== undefined && revisionVersion !== undefined && (
          <RevisionBadge
            isCurrent={msg.revisionId === currentRevisionId}
            onRestore={() => onRestore(msg.revisionId as number)}
            restoring={restoringRevisionId !== null}
            version={revisionVersion}
          />
        )}
      </div>
    );
  }
  if (msg.role === "question") {
    return (
      <div className="flex justify-start" key={msg.id}>
        <QuestionBubble
          answered={msg.answered}
          loading={chatLoading}
          onPick={(a) =>
            onConsultPick(Number(msg.id), msg.key, msg.question, a)
          }
          onSkip={onConsultSkip}
          options={msg.options}
          question={msg.question}
        />
      </div>
    );
  }
  return (
    <div
      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
      key={msg.id}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
      >
        {msg.role === "assistant" ? (
          <AssistantBubble
            content={msg.content}
            editsApplied={msg.editsApplied}
            isCurrentRevision={msg.revisionId === currentRevisionId}
            onRestore={
              msg.revisionId === undefined
                ? undefined
                : () => onRestore(msg.revisionId as number)
            }
            restoring={restoringRevisionId !== null}
            revisionId={msg.revisionId}
            revisionVersion={
              msg.revisionId === undefined
                ? undefined
                : revisionVersions.get(msg.revisionId)
            }
            streaming={msg.streaming}
          />
        ) : (
          <span className="leading-relaxed">{msg.content}</span>
        )}
      </div>
    </div>
  );
}

function EditorPane({
  activeTab,
  latex,
  onLatexChange,
  chatMessages,
  chatLoading,
  chatInput,
  onChatInputChange,
  onChatSend,
  pendingQuestion,
  onClearChat,
  onConsultPick,
  onConsultSkip,
  onSave,
  onRecompile,
  onUndo,
  onRedo,
  onRestore,
  restoringRevisionId,
  job,
}: EditorPaneProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastMsg = chatMessages.at(-1);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const placeholder = useMemo(() => {
    if (pendingQuestion) {
      return "Pick an option above…";
    }
    if (job) {
      return "Ask for more changes…";
    }
    return "e.g. Add a skills section…";
  }, [pendingQuestion, job]);

  const revisionVersions = useMemo(
    () => computeRevisionVersions(chatMessages),
    [chatMessages]
  );
  const currentRevisionId = useMemo(
    () => getCurrentRevisionId(chatMessages),
    [chatMessages]
  );

  const chatPanel = useMemo(() => {
    if (chatMessages.length > 0) {
      return (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {chatMessages.map((msg) =>
              renderMessage(
                msg,
                chatLoading,
                onConsultPick,
                onConsultSkip,
                onRestore,
                restoringRevisionId,
                revisionVersions,
                currentRevisionId
              )
            )}
            {chatLoading &&
              lastMsg?.role === "user" &&
              !chatMessages.some(
                (m) => m.role === "assistant" && m.streaming
              ) && <LoadingBubble />}
            <div ref={chatEndRef} />
          </div>
          <div className="flex shrink-0 items-center gap-2 border-border/50 border-t p-2.5">
            {chatMessages.length > 0 && (
              <button
                aria-label="Clear chat"
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                disabled={chatLoading}
                onClick={onClearChat}
                title="Clear chat"
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <input
              className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              disabled={chatLoading || pendingQuestion}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onChatSend();
                }
              }}
              placeholder={placeholder}
              type="text"
              value={chatInput}
            />
            <Button
              aria-label="Send"
              className="h-8 w-8 shrink-0 rounded-lg p-0"
              disabled={chatLoading || !chatInput.trim() || pendingQuestion}
              onClick={onChatSend}
              size="sm"
            >
              {chatLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
            </Button>
          </div>
        </>
      );
    }

    if (chatLoading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <LoadingBubble label="Reviewing resume…" />
        </div>
      );
    }

    return (
      <div className="relative flex-1">
        <div className="absolute inset-x-0 top-16 flex flex-col items-center gap-5 px-6">
          <div className="rounded-full bg-primary/10 p-3">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">
              What would you like to change?
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              {job
                ? "Resume customized — ask for further changes."
                : "Describe what you'd like to change and AI will edit your LaTeX."}
            </p>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            <input
              autoFocus
              className="h-12 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              disabled={chatLoading || pendingQuestion}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onChatSend();
                }
              }}
              placeholder={placeholder}
              type="text"
              value={chatInput}
            />
            <Button
              aria-label="Send"
              className="h-12 w-12 shrink-0 rounded-lg p-0"
              disabled={chatLoading || !chatInput.trim() || pendingQuestion}
              onClick={onChatSend}
              size="sm"
            >
              {chatLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }, [
    chatMessages,
    chatLoading,
    placeholder,
    job,
    lastMsg,
    pendingQuestion,
    onChatInputChange,
    onChatSend,
    onConsultPick,
    onConsultSkip,
    onClearChat,
    onRestore,
    restoringRevisionId,
    revisionVersions,
    currentRevisionId,
    chatInput,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-border border-r">
      <div
        className={activeTab === "editor" ? "flex min-h-0 flex-1" : "hidden"}
      >
        <LatexEditorCm
          onChange={onLatexChange}
          onRecompile={onRecompile}
          onRedo={onRedo}
          onSave={onSave}
          onUndo={onUndo}
          value={latex}
        />
      </div>

      <div
        className={`min-h-0 flex-col border-border border-t ${activeTab === "chat" ? "flex flex-1" : "hidden"}`}
      >
        {chatPanel}
      </div>
    </div>
  );
}

export default memo(EditorPane);
