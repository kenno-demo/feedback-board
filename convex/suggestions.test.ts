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

// vote-count-visible: every suggestion shows how many votes it has, to everyone
test("everyone sees each suggestion's vote count, even without a voter id", async () => {
  const t = convexTest(schema, modules);
  const darkMode = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await t.mutation(api.suggestions.add, { title: "Public API" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: darkMode, voterId: "ana" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: darkMode, voterId: "ben" });

  const board = await t.query(api.suggestions.list, {});
  expect(board.map((s) => [s.title, s.votes])).toEqual([
    ["Dark mode", 2],
    ["Public API", 0],
  ]);
});

// vote-email-signin: voting needs no sign-in; the vote lands right away
test("a vote is recorded immediately without any signed-in identity", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Dark mode" });

  const result = await t.mutation(api.suggestions.toggleVote, {
    suggestionId: id,
    voterId: "anonymous-browser",
  });

  expect(result).toEqual({ voted: true });
  const [suggestion] = await t.query(api.suggestions.list, {});
  expect(suggestion.votes).toBe(1);
});

// vote-once: one vote per browser per suggestion; voting again takes it back
test("a browser votes once per suggestion and a second click removes the vote", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Dark mode" });

  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "ana" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "ben" });
  expect((await t.query(api.suggestions.list, {}))[0].votes).toBe(2);

  const second = await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "ana" });
  expect(second).toEqual({ voted: false });
  expect((await t.query(api.suggestions.list, {}))[0].votes).toBe(1);

  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "ana" });
  expect((await t.query(api.suggestions.list, {}))[0].votes).toBe(2);
});

// vote-mine-marked: the browser sees which suggestions it has voted for
test("a browser is shown its own votes and nobody else's", async () => {
  const t = convexTest(schema, modules);
  const darkMode = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  const publicApi = await t.mutation(api.suggestions.add, { title: "Public API" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: darkMode, voterId: "ana" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: publicApi, voterId: "ben" });

  const anaSees = await t.query(api.suggestions.list, { voterId: "ana" });
  expect(Object.fromEntries(anaSees.map((s) => [s.title, s.voted]))).toEqual({
    "Dark mode": true,
    "Public API": false,
  });

  const strangerSees = await t.query(api.suggestions.list, { voterId: "cleo" });
  expect(strangerSees.every((s) => s.voted === false)).toBe(true);
});

// vote-ordering: most votes first; ties keep the newest suggestion higher
test("the board lists most-voted first and newest first among ties", async () => {
  const t = convexTest(schema, modules);
  const oldest = await t.mutation(api.suggestions.add, { title: "Oldest" });
  const middle = await t.mutation(api.suggestions.add, { title: "Middle" });
  const newest = await t.mutation(api.suggestions.add, { title: "Newest" });

  await t.mutation(api.suggestions.toggleVote, { suggestionId: oldest, voterId: "ana" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: oldest, voterId: "ben" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: middle, voterId: "ana" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: newest, voterId: "ana" });

  const board = await t.query(api.suggestions.list, {});
  expect(board.map((s) => s.title)).toEqual(["Oldest", "Newest", "Middle"]);
});

// vote-signout: a vote stays with the browser's stored id for later visits
test("a later visit with the same stored id still shows the earlier vote", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.suggestions.add, { title: "Dark mode" });
  await t.mutation(api.suggestions.toggleVote, { suggestionId: id, voterId: "device-42" });

  const laterVisit = await t.query(api.suggestions.list, { voterId: "device-42" });
  expect(laterVisit[0]).toMatchObject({ votes: 1, voted: true });
});
