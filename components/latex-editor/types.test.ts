import { describe, expect, it } from "vitest";
import type { ChatMsg } from "./types";
import {
  buildHistory,
  computeRevisionVersions,
  createMsgId,
  getCurrentRevisionId,
} from "./types";

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

  it("drops the abandoned branch after a restore to an earlier revision", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "user", content: "add a skill" },
      { id: "2", role: "assistant", content: "added", revisionId: 1 },
      { id: "3", role: "user", content: "add another skill" },
      { id: "4", role: "assistant", content: "added another", revisionId: 2 },
      { id: "5", role: "notice", content: "Restored", revisionId: 1 },
      { id: "6", role: "user", content: "now fix the summary" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { role: "user", content: "add a skill" },
      { role: "assistant", content: "added" },
      { role: "user", content: "now fix the summary" },
    ]);
  });
});

describe("computeRevisionVersions", () => {
  it("numbers checkpoints 1, 2, 3... in chronological order", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "done", revisionId: 101 },
      { id: "3", role: "user", content: "more" },
      { id: "4", role: "assistant", content: "done again", revisionId: 205 },
    ];
    expect(computeRevisionVersions(msgs)).toEqual(
      new Map([
        [101, 1],
        [205, 2],
      ])
    );
  });

  it("assigns a version to a restore notice's revisionId too", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "assistant", content: "done", revisionId: 1 },
      { id: "2", role: "notice", content: "Restored", revisionId: 2 },
    ];
    expect(computeRevisionVersions(msgs)).toEqual(
      new Map([
        [1, 1],
        [2, 2],
      ])
    );
  });

  it("ignores messages without a revisionId", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "no edits" },
      { id: "3", role: "notice", content: "Could not apply edits" },
    ];
    expect(computeRevisionVersions(msgs)).toEqual(new Map());
  });

  it("returns an empty map for an empty input", () => {
    expect(computeRevisionVersions([])).toEqual(new Map());
  });
});

describe("getCurrentRevisionId", () => {
  it("returns the most recent checkpoint's revisionId", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "assistant", content: "done", revisionId: 1 },
      { id: "2", role: "user", content: "more" },
      { id: "3", role: "assistant", content: "done again", revisionId: 2 },
    ];
    expect(getCurrentRevisionId(msgs)).toBe(2);
  });

  it("returns the restore's revisionId when a restore is the latest checkpoint", () => {
    const msgs: ChatMsg[] = [
      { id: "1", role: "assistant", content: "done", revisionId: 1 },
      { id: "2", role: "notice", content: "Restored", revisionId: 2 },
    ];
    expect(getCurrentRevisionId(msgs)).toBe(2);
  });

  it("returns undefined when no message has a revisionId", () => {
    const msgs: ChatMsg[] = [{ id: "1", role: "user", content: "hi" }];
    expect(getCurrentRevisionId(msgs)).toBeUndefined();
  });

  it("returns undefined for an empty input", () => {
    expect(getCurrentRevisionId([])).toBeUndefined();
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
