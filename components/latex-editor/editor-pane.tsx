"use client";

import { AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";
import { memo, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AssistantBubble, LoadingBubble, QuestionBubble } from "./chat-bubbles";
import { LatexEditorCm } from "./latex-editor-cm";
import type { ChatMsg } from "./types";

interface EditorPaneProps {
  activeTab: "editor" | "chat";
  chatInput: string;
  chatLoading: boolean;
  chatMessages: ChatMsg[];
  isEmpty: boolean;
  job: { id: number; title: string; description: string } | null;
  latex: string;
  onChatInputChange: (val: string) => void;
  onChatSend: () => void;
  onConsultPick: (
    idx: number,
    key: string,
    question: string,
    answer: string
  ) => void;
  onConsultSkip: () => void;
  onLatexChange: (latex: string) => void;
  onRecompile: () => void;
  onRedo: () => void;
  onSave: () => void;
  onTabChange: (tab: "editor" | "chat") => void;
  onUndo: () => void;
  pendingQuestion: boolean;
}

function renderMessage(
  msg: ChatMsg,
  idx: number,
  chatLoading: boolean,
  onConsultPick: EditorPaneProps["onConsultPick"],
  onConsultSkip: () => void
) {
  if (msg.role === "notice") {
    return (
      <div
        className="flex items-center justify-center gap-1.5 py-0.5 text-muted-foreground text-xs"
        key={msg.id}
      >
        <AlertTriangle className="size-3 shrink-0 text-yellow-500" />
        {msg.content}
      </div>
    );
  }
  if (msg.role === "question") {
    return (
      <div className="flex justify-start" key={msg.id}>
        <QuestionBubble
          answered={msg.answered}
          loading={chatLoading}
          onPick={(a) => onConsultPick(idx, msg.key, msg.question, a)}
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
      <span
        className={`inline-block max-w-[85%] rounded px-2.5 py-1.5 text-xs leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
      >
        {msg.role === "assistant" ? (
          <AssistantBubble
            content={msg.content}
            editsApplied={msg.editsApplied}
          />
        ) : (
          msg.content
        )}
      </span>
    </div>
  );
}

function EditorPane({
  activeTab,
  onTabChange,
  latex,
  onLatexChange,
  chatMessages,
  chatLoading,
  chatInput,
  onChatInputChange,
  onChatSend,
  pendingQuestion,
  onConsultPick,
  onConsultSkip,
  onSave,
  onRecompile,
  onUndo,
  onRedo,
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

  const chatBody = useMemo(() => {
    if (chatMessages.length === 0) {
      if (chatLoading) {
        return <LoadingBubble label="Reviewing resume…" />;
      }
      return (
        <p className="py-4 text-center text-muted-foreground text-xs">
          {job
            ? "Resume customized — ask for further changes."
            : "Describe what you'd like to change and AI will edit your LaTeX."}
        </p>
      );
    }
    return chatMessages.map((msg, i) =>
      renderMessage(msg, i, chatLoading, onConsultPick, onConsultSkip)
    );
  }, [chatMessages, chatLoading, job, onConsultPick, onConsultSkip]);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-border border-r">
      <div className="flex shrink-0 items-center border-border/50 border-b">
        {(["editor", "chat"] as const).map((tab) => (
          <button
            className={`flex items-center gap-1 border-b-2 px-3 py-2 text-xs transition-colors ${activeTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            key={tab}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab === "chat" && <Sparkles className="size-3" />}
            {tab === "editor" ? "Editor" : "AI Chat"}
          </button>
        ))}
        {activeTab === "editor" && (
          <span className="ml-auto px-3 text-muted-foreground text-xs">
            {latex.split("\n").length} lines
          </span>
        )}
      </div>

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
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {chatBody}
          {chatLoading && lastMsg?.role === "user" && <LoadingBubble />}
          <div ref={chatEndRef} />
        </div>

        <div className="flex shrink-0 items-center gap-2 border-border/50 border-t p-2">
          <input
            className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
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
            className="h-7 w-7 shrink-0 p-0"
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
      </div>
    </div>
  );
}

export default memo(EditorPane);
