import { internalMutation } from "./_generated/server";

// Each suggestion with the number of seeded votes it starts with.
const SUGGESTIONS: [string, number][] = [
  ["Dark mode", 42],
  ["Export to CSV", 31],
  ["Slack notifications", 27],
  ["Keyboard shortcuts", 19],
  ["Google Calendar sync", 16],
  ["Two-factor authentication", 14],
  ["Bulk edit", 9],
  ["Public API", 8],
  ["Mobile app", 5],
  ["Custom fields", 3],
];

// Empties every table. The demo reset runs it before deploying the golden code, so leftover
// fields from a demo PR never fail the golden schema.
export const clear = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["votes", "suggestions"] as const) {
      for (const row of await ctx.db.query(table).take(4000)) {
        await ctx.db.delete(row._id);
      }
    }
  },
});

// Seeds the board once; a board that already has suggestions is left alone.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("suggestions").first()) return;
    for (const [title, votes] of SUGGESTIONS) {
      const suggestionId = await ctx.db.insert("suggestions", { title });
      for (let i = 0; i < votes; i++) {
        await ctx.db.insert("votes", { suggestionId, voter: `seed-${i}` });
      }
    }
  },
});
