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

export function revisionIdOf(msg: ChatMsg): number | undefined {
  if (msg.role === "assistant" || msg.role === "notice") {
    return msg.revisionId;
  }
  return;
}

// Every checkpoint (a resumeRevisions row, created only by an AI edit) gets
// a stable, incrementing version number in the order it was created — V1 is
// the first checkpoint ever made for this document. Restoring re-points the
// current state at an existing checkpoint's revisionId rather than creating
// a new row, so it shows as sticking to that version instead of growing the
// sequence.
export function computeRevisionVersions(msgs: ChatMsg[]): Map<number, number> {
  const versions = new Map<number, number>();
  for (const msg of msgs) {
    const revisionId = revisionIdOf(msg);
    if (revisionId !== undefined && !versions.has(revisionId)) {
      versions.set(revisionId, versions.size + 1);
    }
  }
  return versions;
}

function lastCheckpointIndex(msgs: ChatMsg[]): number {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (revisionIdOf(msgs[i]) !== undefined) {
      return i;
    }
  }
  return -1;
}

// The most recent checkpoint is whichever one the editor currently reflects
// — the latest AI edit, or the latest restore if one happened after.
export function getCurrentRevisionId(msgs: ChatMsg[]): number | undefined {
  const i = lastCheckpointIndex(msgs);
  return i === -1 ? undefined : revisionIdOf(msgs[i]);
}

// A restore re-points current state at an earlier revision without deleting
// anything, so the messages between that revision's original creation and
// the restore describe an abandoned branch — edits the LaTeX being sent to
// the AI no longer contains. Feeding them as history would contradict the
// document, so they're dropped; the prefix through the restored point, plus
// anything chatted since, is what's actually still true.
function effectiveTimeline(msgs: ChatMsg[]): ChatMsg[] {
  const lastIdx = lastCheckpointIndex(msgs);
  if (lastIdx === -1) {
    return msgs;
  }
  const revisionId = revisionIdOf(msgs[lastIdx]);
  const firstIdx = msgs.findIndex((m) => revisionIdOf(m) === revisionId);
  if (firstIdx === lastIdx) {
    return msgs;
  }
  return [...msgs.slice(0, firstIdx + 1), ...msgs.slice(lastIdx + 1)];
}

export function buildHistory(
  msgs: ChatMsg[]
): { role: "user" | "assistant"; content: string }[] {
  return effectiveTimeline(msgs).flatMap((m) => {
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
