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

test("someone who hasn't signed in sees every suggestion with its vote count", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  const [first] = await t.query(api.suggestions.list, {});
  await t.mutation(api.suggestions.toggleVote, { suggestionId: first._id, voterId: "browser-a" });

  const board = await t.query(api.suggestions.list, {});
  expect(board).toHaveLength(10);
  expect(board.every((s) => typeof s.votes === "number" && !s.voted)).toBe(true);
  expect(board.find((s) => s._id === first._id)?.votes).toBe(1);
});

test("every suggestion can be voted on without signing in", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  for (const suggestion of await t.query(api.suggestions.list, {})) {
    await t.mutation(api.suggestions.toggleVote, {
      suggestionId: suggestion._id,
      voterId: "browser-a",
    });
  }
  const board = await t.query(api.suggestions.list, { voterId: "browser-a" });
  expect(board.every((s) => s.votes === 1 && s.voted)).toBe(true);
});

test("voting raises the count by one and shows the suggestion as voted", async () => {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
  const [after] = await t.query(api.suggestions.list, { voterId: "browser-a" });
  expect(after).toMatchObject({ votes: 1, voted: true });
});

test("clicking vote again takes the vote back", async () => {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "browser-a" });
  const [after] = await t.query(api.suggestions.list, { voterId: "browser-a" });
  expect(after).toMatchObject({ votes: 0, voted: false });
});

test("a browser can't vote twice, keeps its vote on reload, and other votes still count", async () => {
  const t = convexTest(schema, modules);
  const darkMode = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  const csv = await t.mutation(api.suggestions.add, { title: "Export to CSV" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: darkMode, voterId: "browser-a" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: csv, voterId: "browser-a" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: darkMode, voterId: "browser-b" });

  // A fresh read with the same browser ID is what the board does after a reload.
  const board = await t.query(api.suggestions.list, { voterId: "browser-a" });
  expect(board.find((s) => s._id === darkMode)).toMatchObject({ votes: 2, voted: true });
  expect(board.find((s) => s._id === csv)).toMatchObject({ votes: 1, voted: true });

  const votes = await t.run((ctx) => ctx.db.query("votes").collect());
  const fromA = votes.filter((v) => v.voterId === "browser-a" && v.suggestionId === darkMode);
  expect(fromA).toHaveLength(1);
});

test("a vote needs a browser ID", async () => {
  const t = convexTest(schema, modules);
  const suggestionId = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await expect(
    t.mutation(api.suggestions.toggleVote, { suggestionId, voterId: "" }),
  ).rejects.toThrow();
});
