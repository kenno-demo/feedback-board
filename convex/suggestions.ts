import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_VOTER_ID_LENGTH = 64;

function checkVoterId(voterId: string) {
  if (voterId.length === 0 || voterId.length > MAX_VOTER_ID_LENGTH) {
    throw new Error("A voter id must be 1 to 64 characters.");
  }
}

// Suggestions with their vote counts, most votes first, newest first among ties.
// When a voterId is given, each row also says whether that voter has voted for it.
export const list = query({
  args: { voterId: v.optional(v.string()) },
  handler: async (ctx, { voterId }) => {
    const suggestions = await ctx.db.query("suggestions").order("desc").take(100);
    const rows = await Promise.all(
      suggestions.map(async (suggestion) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_suggestion", (q) => q.eq("suggestionId", suggestion._id))
          .collect();
        const voted = voterId !== undefined && votes.some((vote) => vote.voterId === voterId);
        return { ...suggestion, votes: votes.length, voted };
      }),
    );
    return rows.sort((a, b) => b.votes - a.votes || b._creationTime - a._creationTime);
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

// Adds the voter's vote to a suggestion, or removes it if it is already there.
// A voter never holds more than one vote on a suggestion.
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
      .collect();
    if (existing.length > 0) {
      for (const vote of existing) await ctx.db.delete(vote._id);
      return { voted: false };
    }
    await ctx.db.insert("votes", { suggestionId, voterId });
    return { voted: true };
  },
});
