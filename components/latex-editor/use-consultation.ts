"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ModelId } from "@/lib/models";
import type { ChatMsg, ConsultAnswer, EditorJob } from "./types";
import { createMsgId } from "./types";

function questionMsg(
  key: string,
  question: string,
  options: string[]
): ChatMsg {
  return { id: createMsgId(), role: "question", key, question, options };
}

function userMsg(content: string): ChatMsg {
  return { id: createMsgId(), role: "user", content };
}

const MAX_RETRIES = 2;

export function useConsultation(
  getLatex: () => string,
  executeAIEdit: (
    instruction: string,
    history: { role: "user" | "assistant"; content: string }[],
    noticeMsg?: string,
    jobDescription?: string
  ) => Promise<void>,
  modelId: ModelId,
  job: EditorJob | null,
  isNewJobResume: boolean,
  initialLatex: string,
  chatMessages: ChatMsg[],
  setChatMessages: (
    updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])
  ) => void,
  setChatLoading: (v: boolean) => void
) {
  const [consultAnswers, setConsultAnswers] = useState<ConsultAnswer[]>([]);
  const [consultDone, setConsultDone] = useState(
    () => !(job && isNewJobResume)
  );
  const retryCountRef = useRef(0);

  const doConsultEdit = useCallback(
    (answers: ConsultAnswer[]) => {
      const ctx =
        answers.length > 0
          ? `\nContext you asked for:\n${answers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}`
          : "";
      setChatMessages((prev) => [
        ...prev,
        userMsg("Customize my resume for this job"),
      ]);
      executeAIEdit(
        `Customize my resume for this job.${ctx}`,
        [],
        undefined,
        job?.description
      );
    },
    [executeAIEdit, job, setChatMessages]
  );

  const fetchNextQuestion = useCallback(
    async (answers: ConsultAnswer[]) => {
      setChatLoading(true);
      let chain = false;
      try {
        const res = await fetch("/api/job-customize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latex: getLatex(),
            jobDescription: job?.description,
            modelId,
            answers,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast.error(data.error ?? "Rate limit — try later");
          setConsultDone(true);
        } else if (!res.ok) {
          throw new Error(data.error ?? "Consultation failed");
        } else if (data.type === "question") {
          retryCountRef.current = 0;
          setChatMessages((prev) => [
            ...prev,
            questionMsg(data.key, data.question, data.options),
          ]);
        } else {
          chain = true;
          setConsultDone(true);
          doConsultEdit(answers);
        }
      } catch {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          setChatMessages((prev) => [
            ...prev,
            {
              id: createMsgId(),
              role: "notice",
              content: `Consultation failed — retrying (${retryCountRef.current}/${MAX_RETRIES})…`,
            },
          ]);
          fetchNextQuestion(answers);
          return;
        }
        toast.error("Consultation failed — use chat to customize");
        setConsultDone(true);
      } finally {
        if (!chain) {
          setChatLoading(false);
        }
      }
    },
    [job, modelId, doConsultEdit, getLatex, setChatMessages, setChatLoading]
  );

  const handleConsultPick = useCallback(
    (idx: number, key: string, question: string, answer: string) => {
      const next: ConsultAnswer[] = [
        ...consultAnswers,
        { key, question, answer },
      ];
      setConsultAnswers(next);
      setChatMessages((prev) => [
        ...prev.map((m, i) => (i === idx ? { ...m, answered: answer } : m)),
        userMsg(answer),
      ]);
      fetchNextQuestion(next);
    },
    [consultAnswers, fetchNextQuestion, setChatMessages]
  );

  const handleConsultSkip = useCallback(() => {
    setConsultDone(true);
    doConsultEdit(consultAnswers);
  }, [consultAnswers, doConsultEdit]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only consultation start
  useEffect(() => {
    if (job && isNewJobResume && initialLatex.trim()) {
      fetchNextQuestion([]);
    }
  }, [job, isNewJobResume, initialLatex.trim]);

  const lastMsg = chatMessages.at(-1);
  const pendingQuestion =
    !consultDone && lastMsg?.role === "question" && !lastMsg.answered;

  return {
    consultAnswers,
    consultDone,
    pendingQuestion,
    handleConsultPick,
    handleConsultSkip,
  };
}
