import { describe, expect, it } from "vitest";
import type { ChatMsg } from "./types";
import { buildHistory, createMsgId } from "./types";

const MSG_ID_RE = /^msg-\d+-\d+$/;

describe("buildHistory", () => {
  it("passes user and assistant messages through unchanged", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "hello" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("expands an answered question into assistant+user turns", () => {
    const msgs: ChatMsg[] = [
      {
        id: "1",
        role: "question",
        key: "k",
        question: "What stack?",
        options: ["React", "Vue"],
        answered: "React",
      },
    ];
    expect(buildHistory(msgs)).toEqual([
      { role: "assistant", content: "What stack?" },
      { role: "user", content: "React" },
    ]);
  });

  it("expands an unanswered question into only the assistant turn", () => {
    const msgs: ChatMsg[] = [
      {
        id: "1",
        role: "question",
        key: "k",
        question: "What stack?",
        options: [],
      },
    ];
    expect(buildHistory(msgs)).toEqual([
      { role: "assistant", content: "What stack?" },
    ]);
  });

  it("drops notice messages entirely", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "notice", content: "Retrying…" },
      { id: "3", role: "assistant", content: "hello" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("preserves order across a mixed sequence", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "user", content: "start" },
      {
        id: "2",
        role: "question",
        key: "k",
        question: "Which role?",
        options: [],
        answered: "Backend",
      },
      { id: "3", role: "notice", content: "ignored" },
      { id: "4", role: "assistant", content: "done" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { role: "user", content: "start" },
      { role: "assistant", content: "Which role?" },
      { role: "user", content: "Backend" },
      { role: "assistant", content: "done" },
    ]);
  });

  it("returns an empty array for an empty input", () => {
    expect(buildHistory([])).toEqual([]);
  });
});

describe("createMsgId", () => {
  it("returns a unique, non-empty id on each call", () => {
    const a = createMsgId();
    const b = createMsgId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toMatch(MSG_ID_RE);
  });
});
