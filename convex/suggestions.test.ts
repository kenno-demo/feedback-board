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

test("voting twice takes the vote back", async () => {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await t.mutation(api.suggestions.vote, { suggestionId, voter: "a" });
  expect(await t.query(api.suggestions.list, { voter: "a" })).toMatchObject([
    { votes: 1, voted: true },
  ]);
  await t.mutation(api.suggestions.vote, { suggestionId, voter: "a" });
  expect(await t.query(api.suggestions.list, { voter: "a" })).toMatchObject([
    { votes: 0, voted: false },
  ]);
});

test("the board puts the most votes first", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.suggestions.add, { title: "Older, more votes" });
  const [first] = await t.query(api.suggestions.list, {});
  await t.mutation(api.suggestions.vote, { suggestionId: first._id, voter: "a" });
  await t.mutation(api.suggestions.add, { title: "Newer, no votes" });
  const board = await t.query(api.suggestions.list, {});
  expect(board.map((s) => s.title)).toEqual(["Older, more votes", "Newer, no votes"]);
});

test("a suggestion can be marked Planned and back", async () => {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  expect(await t.query(api.suggestions.list, {})).toMatchObject([{ planned: false }]);
  await t.mutation(api.suggestions.setPlanned, { suggestionId, planned: true });
  expect(await t.query(api.suggestions.list, {})).toMatchObject([{ planned: true }]);
  await t.mutation(api.suggestions.setPlanned, { suggestionId, planned: false });
  expect(await t.query(api.suggestions.list, {})).toMatchObject([{ planned: false }]);
});

test("a Planned suggestion still takes votes", async () => {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await t.mutation(api.suggestions.setPlanned, { suggestionId, planned: true });
  await t.mutation(api.suggestions.vote, { suggestionId, voter: "a" });
  expect(await t.query(api.suggestions.list, { voter: "a" })).toMatchObject([
    { planned: true, votes: 1, voted: true },
  ]);
});

test("the seed fills an empty board once", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  await t.mutation(internal.seed.run, {});
  const board = await t.query(api.suggestions.list, {});
  expect(board).toHaveLength(10);
  expect(board[0]).toMatchObject({ title: "Dark mode", votes: 42 });
});
