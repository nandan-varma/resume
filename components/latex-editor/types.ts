import type { ResumeDocumentMessage } from "@/lib/queries/resume";

export type EnginePhase =
  | { phase: "idle" }
  | { phase: "loading"; label: string }
  | { phase: "ready" }
  | { phase: "compiling" }
  | { phase: "error"; message: string };

export interface ConsultAnswer {
  answer: string;
  key: string;
  question: string;
}

export type ChatMsg =
  | {
      id: string;
      role: "user";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      editsApplied?: number;
      revisionId?: number;
      streaming?: boolean;
    }
  | {
      id: string;
      role: "question";
      key: string;
      question: string;
      options: string[];
      answered?: string;
    }
  | {
      id: string;
      role: "notice";
      content: string;
      revisionId?: number;
    };

export interface EditorJob {
  description: string;
  id: number;
  title: string;
}

let msgCounter = 0;

export function createMsgId(): string {
  msgCounter++;
  return `msg-${msgCounter}-${Date.now()}`;
}

// Maps a persisted DB row to the client's chat bubble shape.
export function fromDocumentMessage(m: ResumeDocumentMessage): ChatMsg {
  const id = String(m.id);
  switch (m.role) {
    case "user":
      return { id, role: "user", content: m.content };
    case "assistant":
      return {
        id,
        role: "assistant",
        content: m.content,
        editsApplied: m.editsApplied ?? undefined,
        revisionId: m.revisionId ?? undefined,
      };
    case "notice":
      return {
        id,
        role: "notice",
        content: m.content,
        revisionId: m.revisionId ?? undefined,
      };
    case "question":
      return {
        id,
        role: "question",
        key: m.questionKey ?? "",
        question: m.content,
        options: m.questionOptions ?? [],
        answered: m.questionAnswered ?? undefined,
      };
    default:
      return { id, role: "notice", content: m.content };
  }
}

export function buildHistory(
  msgs: ChatMsg[]
): { role: "user" | "assistant"; content: string }[] {
  return msgs.flatMap((m) => {
    if (m.role === "user" || m.role === "assistant") {
      return [{ role: m.role, content: m.content }];
    }
    if (m.role === "question") {
      return [
        { role: "assistant", content: m.question },
        ...(m.answered ? [{ role: "user" as const, content: m.answered }] : []),
      ];
    }
    return [];
  });
}
