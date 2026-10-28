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
        const vote = voterId
          ? await ctx.db
              .query("votes")
              .withIndex("by_voter_and_suggestion", (q) =>
                q.eq("voterId", voterId).eq("suggestionId", suggestion._id),
              )
              .unique()
          : null;
        return { ...suggestion, votes: suggestion.votes ?? 0, voted: vote !== null };
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
    return await ctx.db.insert("suggestions", { title: trimmed, votes: 0 });
  },
});

// Votes for the suggestion, or takes the vote back if this browser already voted.
export const toggleVote = mutation({
  args: { suggestionId: v.id("suggestions"), voterId: v.string() },
  handler: async (ctx, { suggestionId, voterId }) => {
    checkVoterId(voterId);
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion) throw new Error("That suggestion no longer exists.");
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_voter_and_suggestion", (q) =>
        q.eq("voterId", voterId).eq("suggestionId", suggestionId),
      )
      .unique();
    const votes = suggestion.votes ?? 0;
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(suggestionId, { votes: Math.max(0, votes - 1) });
      return false;
    }
    await ctx.db.insert("votes", { suggestionId, voterId });
    await ctx.db.patch(suggestionId, { votes: votes + 1 });
    return true;
  },
});
