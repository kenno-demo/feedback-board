import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// The board, most votes first. `voter` is the browser's anonymous ID, so the board can show
// which suggestions it already voted for.
export const list = query({
  args: { voter: v.optional(v.string()) },
  handler: async (ctx, { voter }) => {
    const suggestions = await ctx.db.query("suggestions").order("desc").take(100);
    const board = await Promise.all(
      suggestions.map(async (suggestion) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_suggestion_voter", (q) => q.eq("suggestionId", suggestion._id))
          .take(1000);
        return {
          ...suggestion,
          planned: suggestion.planned ?? false,
          votes: votes.length,
          voted: voter !== undefined && votes.some((vote) => vote.voter === voter),
        };
      }),
    );
    return board.sort((a, b) => b.votes - a.votes);
  },
});

export const add = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const trimmed = title.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      throw new Error("A suggestion needs a title of 1 to 120 characters.");
    }
    return await ctx.db.insert("suggestions", { title: trimmed });
  },
});

// Anyone can mark a suggestion Planned for now; the board has no sign-in.
export const setPlanned = mutation({
  args: { suggestionId: v.id("suggestions"), planned: v.boolean() },
  handler: async (ctx, { suggestionId, planned }) => {
    await ctx.db.patch(suggestionId, { planned });
  },
});

// One vote per browser: voting again takes the vote back. Planned suggestions still take votes,
// so the count can rank which planned item ships first.
export const vote = mutation({
  args: { suggestionId: v.id("suggestions"), voter: v.string() },
  handler: async (ctx, { suggestionId, voter }) => {
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_suggestion_voter", (q) =>
        q.eq("suggestionId", suggestionId).eq("voter", voter),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("votes", { suggestionId, voter });
    }
  },
});
