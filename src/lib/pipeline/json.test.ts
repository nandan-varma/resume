import { describe, expect, it } from "vitest";
import { z } from "zod";
import { type Ask, askJson, extractJson, PipelineError } from "./json";

describe("extractJson", () => {
  it("reads plain, fenced and chatty replies", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(
      extractJson('Sure! Here you go:\n{"a": [1, 2]}\nHope that helps.'),
    ).toEqual({ a: [1, 2] });
  });

  it("repairs the usual slips", () => {
    expect(extractJson('{"a":1,}')).toEqual({ a: 1 });
    expect(extractJson("{“a”: “smart”}")).toEqual({ a: "smart" });
    expect(extractJson('{"a":"line one\nline two"}')).toEqual({
      a: "line one\nline two",
    });
    expect(extractJson('{"a":[1,2')).toEqual({ a: [1, 2] }); // cut off
  });

  it("is not fooled by brackets inside strings", () => {
    expect(extractJson('note {"a":"x}y"} end')).toEqual({ a: "x}y" });
  });

  it("returns nothing when there is no JSON", () => {
    expect(extractJson("I cannot help with that.")).toBeUndefined();
    expect(extractJson("")).toBeUndefined();
  });
});

describe("askJson", () => {
  const schema = z.object({ n: z.number() });
  const base = {
    label: "test",
    schema,
    system: "s",
    prompt: "p",
    example: '{"n":1}',
  };
  const scripted = (replies: (string | Error)[]) => {
    const calls: Parameters<Ask>[0][] = [];
    const ask: Ask = async (request) => {
      calls.push(request);
      const next = replies[Math.min(calls.length - 1, replies.length - 1)];
      if (next instanceof Error) {
        throw next;
      }
      return next;
    };
    return { ask, calls };
  };

  it("returns a good answer straight away", async () => {
    const { ask, calls } = scripted(['{"n":3}']);
    expect(await askJson(ask, base)).toEqual({ n: 3 });
    expect(calls).toHaveLength(1);
    expect(calls[0].system).toContain("ONE JSON object");
  });

  it("shows the model its mistake and accepts the corrected answer", async () => {
    const { ask, calls } = scripted(['{"n":"three"}', '{"n":3}']);
    expect(await askJson(ask, base)).toEqual({ n: 3 });
    expect(calls[1].history?.at(-1)?.content).toContain("n:");
  });

  it("applies extra checks", async () => {
    const { ask } = scripted(['{"n":1}', '{"n":5}']);
    const value = await askJson(ask, {
      ...base,
      check: (v) => (v.n < 2 ? ["n must be at least 2"] : []),
    });
    expect(value.n).toBe(5);
  });

  it("survives a failed call and gives up cleanly", async () => {
    expect(
      await askJson(scripted([new Error("503"), '{"n":2}']).ask, base),
    ).toEqual({ n: 2 });
    await expect(
      askJson(scripted(["nonsense"]).ask, base),
    ).rejects.toBeInstanceOf(PipelineError);
    await expect(
      askJson(scripted([new Error("down")]).ask, { ...base, attempts: 2 }),
    ).rejects.toThrow("down");
  });
});
