"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ModelId } from "@/lib/models";
import { useAnswerQuestion, useAppendTurn } from "@/lib/queries/resume";
import type { ChatMsg, ConsultAnswer, EditorJob } from "./types";

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
  pageCount: number | null,
  fillRatio: number | null,
  chatMessages: ChatMsg[],
  setChatLoading: (v: boolean) => void,
  onConflict: () => void
) {
  const jobId = job?.id ?? null;
  const { mutateAsync: appendTurn } = useAppendTurn(jobId, { onConflict });
  const { mutateAsync: answerQuestion } = useAnswerQuestion(jobId);

  const [consultAnswers, setConsultAnswers] = useState<ConsultAnswer[]>([]);
  const [consultDone, setConsultDone] = useState(
    () => !(job && isNewJobResume)
  );
  const retryCountRef = useRef(0);

  const doConsultEdit = useCallback(
    async (answers: ConsultAnswer[]) => {
      const ctx =
        answers.length > 0
          ? `\nContext you asked for:\n${answers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}`
          : "";
      try {
        await appendTurn({
          messages: [
            { role: "user", content: "Tailor my resume for this job" },
          ],
        });
      } catch {
        return; // toasted by the mutation's onError
      }
      executeAIEdit(
        `Tailor this resume for the target job: insert required keywords naturally, strengthen bullets with metrics where possible, and mirror the job description's terminology. Do not fabricate any facts.${ctx}`,
        [],
        undefined,
        job?.description
      );
    },
    [executeAIEdit, job, appendTurn]
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
            ...(pageCount === null ? {} : { pageCount }),
            ...(fillRatio === null ? {} : { fillRatio }),
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
          await appendTurn({
            messages: [
              {
                role: "question",
                content: data.question,
                questionKey: data.key,
                questionOptions: data.options,
              },
            ],
          });
        } else {
          chain = true;
          setConsultDone(true);
          await doConsultEdit(answers);
        }
      } catch {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          await appendTurn({
            messages: [
              {
                role: "notice",
                content: `Consultation failed — retrying (${retryCountRef.current}/${MAX_RETRIES})…`,
              },
            ],
          }).catch(() => {
            // toasted by the mutation's onError
          });
          await fetchNextQuestion(answers);
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
    [
      job,
      modelId,
      doConsultEdit,
      getLatex,
      appendTurn,
      setChatLoading,
      pageCount,
      fillRatio,
    ]
  );

  const handleConsultPick = useCallback(
    (messageId: number, key: string, question: string, answer: string) => {
      const next: ConsultAnswer[] = [
        ...consultAnswers,
        { key, question, answer },
      ];
      setConsultAnswers(next);
      answerQuestion({ messageId, answer }).catch(() => {
        // toasted by the mutation's onError
      });
      fetchNextQuestion(next);
    },
    [consultAnswers, fetchNextQuestion, answerQuestion]
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
