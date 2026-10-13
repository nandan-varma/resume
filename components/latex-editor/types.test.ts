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
      { content: "hi", id: "1", role: "user" },
      { content: "hello", id: "2", role: "assistant" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { content: "hi", role: "user" },
      { content: "hello", role: "assistant" },
    ]);
  });

  it("expands an answered question into assistant+user turns", () => {
    const msgs: ChatMsg[] = [
      {
        answered: "React",
        id: "1",
        key: "k",
        options: ["React", "Vue"],
        question: "What stack?",
        role: "question",
      },
    ];
    expect(buildHistory(msgs)).toEqual([
      { content: "What stack?", role: "assistant" },
      { content: "React", role: "user" },
    ]);
  });

  it("expands an unanswered question into only the assistant turn", () => {
    const msgs: ChatMsg[] = [
      {
        id: "1",
        key: "k",
        options: [],
        question: "What stack?",
        role: "question",
      },
    ];
    expect(buildHistory(msgs)).toEqual([
      { content: "What stack?", role: "assistant" },
    ]);
  });

  it("drops notice messages entirely", () => {
    const msgs: ChatMsg[] = [
      { content: "hi", id: "1", role: "user" },
      { content: "Retrying…", id: "2", role: "notice" },
      { content: "hello", id: "3", role: "assistant" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { content: "hi", role: "user" },
      { content: "hello", role: "assistant" },
    ]);
  });

  it("preserves order across a mixed sequence", () => {
    const msgs: ChatMsg[] = [
      { content: "start", id: "1", role: "user" },
      {
        answered: "Backend",
        id: "2",
        key: "k",
        options: [],
        question: "Which role?",
        role: "question",
      },
      { content: "ignored", id: "3", role: "notice" },
      { content: "done", id: "4", role: "assistant" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { content: "start", role: "user" },
      { content: "Which role?", role: "assistant" },
      { content: "Backend", role: "user" },
      { content: "done", role: "assistant" },
    ]);
  });

  it("returns an empty array for an empty input", () => {
    expect(buildHistory([])).toEqual([]);
  });

  it("drops the abandoned branch after a restore to an earlier revision", () => {
    const msgs: ChatMsg[] = [
      { content: "add a skill", id: "1", role: "user" },
      { content: "added", id: "2", revisionId: 1, role: "assistant" },
      { content: "add another skill", id: "3", role: "user" },
      { content: "added another", id: "4", revisionId: 2, role: "assistant" },
      { content: "Restored", id: "5", revisionId: 1, role: "notice" },
      { content: "now fix the summary", id: "6", role: "user" },
    ];
    expect(buildHistory(msgs)).toEqual([
      { content: "add a skill", role: "user" },
      { content: "added", role: "assistant" },
      { content: "now fix the summary", role: "user" },
    ]);
  });
});

describe("computeRevisionVersions", () => {
  it("numbers checkpoints 1, 2, 3... in chronological order", () => {
    const msgs: ChatMsg[] = [
      { content: "hi", id: "1", role: "user" },
      { content: "done", id: "2", revisionId: 101, role: "assistant" },
      { content: "more", id: "3", role: "user" },
      { content: "done again", id: "4", revisionId: 205, role: "assistant" },
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
      { content: "done", id: "1", revisionId: 1, role: "assistant" },
      { content: "Restored", id: "2", revisionId: 2, role: "notice" },
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
      { content: "hi", id: "1", role: "user" },
      { content: "no edits", id: "2", role: "assistant" },
      { content: "Could not apply edits", id: "3", role: "notice" },
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
      { content: "done", id: "1", revisionId: 1, role: "assistant" },
      { content: "more", id: "2", role: "user" },
      { content: "done again", id: "3", revisionId: 2, role: "assistant" },
    ];
    expect(getCurrentRevisionId(msgs)).toBe(2);
  });

  it("returns the restore's revisionId when a restore is the latest checkpoint", () => {
    const msgs: ChatMsg[] = [
      { content: "done", id: "1", revisionId: 1, role: "assistant" },
      { content: "Restored", id: "2", revisionId: 2, role: "notice" },
    ];
    expect(getCurrentRevisionId(msgs)).toBe(2);
  });

  it("returns undefined when no message has a revisionId", () => {
    const msgs: ChatMsg[] = [{ content: "hi", id: "1", role: "user" }];
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
