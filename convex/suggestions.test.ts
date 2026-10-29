import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { voterId } from "../app/voter";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("a new suggestion appears on the board", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.suggestions.add, { title: "  Dark mode  " });
  const board = await t.query(api.suggestions.list, {});
  expect(board.map((s) => s.title)).toEqual(["Dark mode"]);
});

test("an empty title is refused", async () => {
  const t = convexTest(schema, modules);
  await expect(t.mutation(api.suggestions.add, { title: "   " })).rejects.toThrow();
});

test("the seed fills an empty board once", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  await t.mutation(internal.seed.run, {});
  expect(await t.query(api.suggestions.list, {})).toHaveLength(10);
});

async function boardWith(title: string) {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title });
  return { t, suggestionId };
}

async function entry(t: ReturnType<typeof convexTest>, voterId?: string) {
  const [suggestion] = await t.query(api.suggestions.list, { voterId });
  return suggestion;
}

test("see-counts: every visitor sees each suggestion's vote count", async () => {
  const { t, suggestionId } = await boardWith("Dark mode");
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
  expect((await entry(t)).votes).toBe(1);
  expect((await entry(t, "browser-b")).votes).toBe(1);
});

test("sign-in-by-email: voting needs no sign-in and adds one to the count", async () => {
  const { t, suggestionId } = await boardWith("Dark mode");
  expect((await entry(t, "browser-a")).votes).toBe(0);
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
  expect((await entry(t, "browser-a")).votes).toBe(1);
});

test("vote-needs-sign-in: a browser's votes still show as voted on a later visit", async () => {
  const storage = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
  };
  const firstVisit = voterId(fakeStorage);
  const { t, suggestionId } = await boardWith("Dark mode");
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: firstVisit });

  const reloaded = voterId(fakeStorage);
  expect(reloaded).toBe(firstVisit);
  expect((await entry(t, reloaded)).voted).toBe(true);
  expect((await entry(t, "another-browser")).voted).toBe(false);
});

test("one-vote-each: voting again takes the vote back", async () => {
  const { t, suggestionId } = await boardWith("Dark mode");
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
  const suggestion = await entry(t, "browser-a");
  expect(suggestion.votes).toBe(0);
  expect(suggestion.voted).toBe(false);
});

test("take-back-vote: one browser never adds more than one vote, however often it clicks", async () => {
  const { t, suggestionId } = await boardWith("Dark mode");
  for (let click = 0; click < 7; click++) {
    await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
    expect((await entry(t)).votes).toBeLessThanOrEqual(1);
  }
  await Promise.all(
    Array.from({ length: 5 }, () =>
      t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-b" }),
    ),
  );
  expect((await entry(t)).votes).toBeLessThanOrEqual(2);
});

test("sign-out: votes from different browsers count separately", async () => {
  const { t, suggestionId } = await boardWith("Dark mode");
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "laptop" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "phone" });
  expect((await entry(t)).votes).toBe(2);
});

test("a vote without a voter ID is refused", async () => {
  const { t, suggestionId } = await boardWith("Dark mode");
  await expect(
    t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "" }),
  ).rejects.toThrow();
});
