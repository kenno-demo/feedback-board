import { convexTest } from "convex-test";
import { expect, test } from "vitest";
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

// Condition vote-count-visible: anyone sees each suggestion's vote count,
// most-voted first, without identifying themselves.
test("the board shows vote counts with the most-voted suggestion first", async () => {
  const t = convexTest(schema, modules);
  const first = await t.mutation(api.suggestions.add, { title: "First" });
  const second = await t.mutation(api.suggestions.add, { title: "Second" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: first, voterId: "ann" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: first, voterId: "bob" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: second, voterId: "ann" });

  const board = await t.query(api.suggestions.list, {});
  expect(board.map((s) => [s.title, s.votes])).toEqual([
    ["First", 2],
    ["Second", 1],
  ]);
});

// Condition vote-asks-for-email (as reworded): a vote counts straight away,
// with no sign-in or email involved.
test("a vote counts straight away with no sign-in", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  const voted = await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "ann" });
  expect(voted).toBe(true);
  const [suggestion] = await t.query(api.suggestions.list, {});
  expect(suggestion.votes).toBe(1);
});

// Condition vote-link-signs-in (as reworded): the vote is still there for the
// same device when the board is loaded again.
test("a device's votes are still marked after the board is loaded again", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "device-1" });

  const [afterReload] = await t.query(api.suggestions.list, { voterId: "device-1" });
  expect(afterReload.voted).toBe(true);
  expect(afterReload.votes).toBe(1);
});

// Condition vote-once: pressing vote again removes the vote, and one device
// never adds more than one vote to a suggestion.
test("voting again removes the vote and a device never counts twice", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  const args = { suggestionId: id, voterId: "device-1" };

  expect(await t.mutation(api.suggestions.toggleVote, args)).toBe(true);
  expect((await t.query(api.suggestions.list, {}))[0].votes).toBe(1);

  expect(await t.mutation(api.suggestions.toggleVote, args)).toBe(false);
  expect((await t.query(api.suggestions.list, {}))[0].votes).toBe(0);

  await t.mutation(api.suggestions.toggleVote, args);
  await t.mutation(api.suggestions.toggleVote, args);
  await t.mutation(api.suggestions.toggleVote, args);
  expect((await t.query(api.suggestions.list, {}))[0].votes).toBe(1);
});

// Condition vote-shows-mine: a visitor sees which suggestions they voted for,
// and only theirs.
test("the board marks the suggestions this device voted for", async () => {
  const t = convexTest(schema, modules);
  const mine = await t.mutation(api.suggestions.add, { title: "Mine" });
  const theirs = await t.mutation(api.suggestions.add, { title: "Theirs" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: mine, voterId: "me" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: theirs, voterId: "someone-else" });

  const board = await t.query(api.suggestions.list, { voterId: "me" });
  expect(Object.fromEntries(board.map((s) => [s.title, s.voted]))).toEqual({
    Mine: true,
    Theirs: false,
  });
  const anonymous = await t.query(api.suggestions.list, {});
  expect(anonymous.every((s) => s.voted === false)).toBe(true);
});

test("a vote without a voter id is refused", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await expect(
    t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "  " }),
  ).rejects.toThrow();
});
