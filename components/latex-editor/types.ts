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

export function buildHistory(
  msgs: ChatMsg[]
): { role: "user" | "assistant"; content: string }[] {
  return msgs.flatMap((m) =>
    m.role === "user" || m.role === "assistant"
      ? [{ role: m.role, content: m.content }]
      : []
  );
}
