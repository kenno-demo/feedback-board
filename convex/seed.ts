import { internalMutation } from "./_generated/server";

const SUGGESTIONS = [
  "Dark mode",
  "Export to CSV",
  "Slack notifications",
  "Keyboard shortcuts",
  "Google Calendar sync",
  "Two-factor authentication",
  "Bulk edit",
  "Public API",
  "Mobile app",
  "Custom fields",
];

// Empties every table. The demo reset runs it before deploying the golden code, so leftover
// fields from a demo PR never fail the golden schema.
export const clear = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const row of await ctx.db.query("votes").take(500)) {
      await ctx.db.delete(row._id);
    }
    for (const row of await ctx.db.query("suggestions").take(500)) {
      await ctx.db.delete(row._id);
    }
  },
});

// Seeds the board once; a board that already has suggestions is left alone.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("suggestions").first()) return;
    for (const title of SUGGESTIONS) {
      await ctx.db.insert("suggestions", { title });
    }
  },
});
