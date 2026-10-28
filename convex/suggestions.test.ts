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

async function boardWithOneSuggestion() {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  return { t, suggestionId };
}

test("a vote counts once and shows as voted for that browser only", async () => {
  const { t, suggestionId } = await boardWithOneSuggestion();
  expect(await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "a" })).toEqual({
    voted: true,
  });
  const [mine] = await t.query(api.suggestions.list, { voterId: "a" });
  expect(mine).toMatchObject({ votes: 1, voted: true });
  const [theirs] = await t.query(api.suggestions.list, { voterId: "b" });
  expect(theirs).toMatchObject({ votes: 1, voted: false });
  const [anonymous] = await t.query(api.suggestions.list, {});
  expect(anonymous).toMatchObject({ votes: 1, voted: false });
});

test("voting again takes the vote back", async () => {
  const { t, suggestionId } = await boardWithOneSuggestion();
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "a" });
  expect(await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "a" })).toEqual({
    voted: false,
  });
  const [suggestion] = await t.query(api.suggestions.list, { voterId: "a" });
  expect(suggestion).toMatchObject({ votes: 0, voted: false });
  expect(await t.run((ctx) => ctx.db.query("votes").collect())).toHaveLength(0);
});

test("concurrent votes from one browser never add a second vote", async () => {
  const { t, suggestionId } = await boardWithOneSuggestion();
  await Promise.all([
    t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "a" }),
    t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "a" }),
    t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "a" }),
  ]);
  const votes = await t.run((ctx) => ctx.db.query("votes").collect());
  expect(votes).toHaveLength(1);
  const [suggestion] = await t.query(api.suggestions.list, { voterId: "a" });
  expect(suggestion).toMatchObject({ votes: 1, voted: true });
});

test("different browsers each add a vote", async () => {
  const { t, suggestionId } = await boardWithOneSuggestion();
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "a" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "b" });
  const [suggestion] = await t.query(api.suggestions.list, {});
  expect(suggestion.votes).toBe(2);
});

test("a vote with no browser ID is refused", async () => {
  const { t, suggestionId } = await boardWithOneSuggestion();
  await expect(
    t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "" }),
  ).rejects.toThrow("browser ID");
  await expect(
    // @ts-expect-error voterId is required
    t.mutation(api.suggestions.toggleVote, { suggestionId }),
  ).rejects.toThrow();
  const [suggestion] = await t.query(api.suggestions.list, {});
  expect(suggestion.votes).toBe(0);
});
