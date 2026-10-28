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

test("every suggestion shows its vote count and the most voted comes first", async () => {
  const t = convexTest(schema, modules);
  const first = await t.mutation(api.suggestions.add, { title: "First" });
  const second = await t.mutation(api.suggestions.add, { title: "Second" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: first, voterId: "a" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: first, voterId: "b" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: second, voterId: "a" });

  const board = await t.query(api.suggestions.list, {});
  expect(board.map((s) => [s.title, s.votes])).toEqual([
    ["First", 2],
    ["Second", 1],
  ]);
});

test("a voter gets one vote per suggestion and pressing again takes it back", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Export to CSV" });

  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "me" });
  let [row] = await t.query(api.suggestions.list, { voterId: "me" });
  expect(row).toMatchObject({ votes: 1, voted: true });

  // A second press is a toggle, never a second vote.
  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "me" });
  [row] = await t.query(api.suggestions.list, { voterId: "me" });
  expect(row).toMatchObject({ votes: 0, voted: false });
});

test("a voter's own votes are marked only for that voter", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Mobile app" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "me" });

  const [mine] = await t.query(api.suggestions.list, { voterId: "me" });
  const [theirs] = await t.query(api.suggestions.list, { voterId: "someone-else" });
  const [anonymous] = await t.query(api.suggestions.list, {});
  expect(mine.voted).toBe(true);
  expect(theirs.voted).toBe(false);
  expect(anonymous.voted).toBe(false);
  expect(anonymous.votes).toBe(1);
});

test("a blank voter id is refused", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Public API" });
  await expect(
    t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "" }),
  ).rejects.toThrow();
});
