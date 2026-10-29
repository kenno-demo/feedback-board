import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// The board, most-voted first (newest first among equals). When the caller
// passes its voter id, each suggestion also says whether that voter voted for it.
export const list = query({
  args: { voterId: v.optional(v.string()) },
  handler: async (ctx, { voterId }) => {
    const suggestions = await ctx.db.query("suggestions").order("desc").take(100);
    const board = await Promise.all(
      suggestions.map(async (suggestion) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_suggestion", (q) => q.eq("suggestionId", suggestion._id))
          .collect();
        const voted = voterId !== undefined && votes.some((vote) => vote.voterId === voterId);
        return { ...suggestion, votes: votes.length, voted };
      }),
    );
    return board.sort((a, b) => b.votes - a.votes || b._creationTime - a._creationTime);
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

// Adds the voter's vote on a suggestion, or removes it if it is already there.
// Returns whether the voter has a vote on the suggestion afterwards.
export const toggleVote = mutation({
  args: { suggestionId: v.id("suggestions"), voterId: v.string() },
  handler: async (ctx, { suggestionId, voterId }) => {
    if (voterId.trim().length === 0 || voterId.length > 64) {
      throw new Error("A vote needs a voter id.");
    }
    if ((await ctx.db.get(suggestionId)) === null) {
      throw new Error("That suggestion no longer exists.");
    }
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_voter_suggestion", (q) =>
        q.eq("voterId", voterId).eq("suggestionId", suggestionId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("votes", { suggestionId, voterId });
    return true;
  },
});
