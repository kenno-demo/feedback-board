import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function checkVoterId(voterId: string) {
  if (voterId.length === 0 || voterId.length > 64) {
    throw new Error("A voter ID needs 1 to 64 characters.");
  }
}

export const list = query({
  args: { voterId: v.optional(v.string()) },
  handler: async (ctx, { voterId }) => {
    const suggestions = await ctx.db.query("suggestions").order("desc").take(100);
    return await Promise.all(
      suggestions.map(async (suggestion) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_suggestion_and_voter", (q) => q.eq("suggestionId", suggestion._id))
          .collect();
        return {
          ...suggestion,
          votes: votes.length,
          voted: voterId !== undefined && votes.some((vote) => vote.voterId === voterId),
        };
      }),
    );
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

// Votes for the suggestion, or takes the vote back if this browser already voted for it.
export const toggleVote = mutation({
  args: { suggestionId: v.id("suggestions"), voterId: v.string() },
  handler: async (ctx, { suggestionId, voterId }) => {
    checkVoterId(voterId);
    if (!(await ctx.db.get(suggestionId))) {
      throw new Error("That suggestion no longer exists.");
    }
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_suggestion_and_voter", (q) =>
        q.eq("suggestionId", suggestionId).eq("voterId", voterId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { voted: false };
    }
    await ctx.db.insert("votes", { suggestionId, voterId });
    return { voted: true };
  },
});
