import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { voterId: v.optional(v.string()) },
  handler: async (ctx, { voterId }) => {
    const suggestions = await ctx.db.query("suggestions").order("desc").take(100);
    const voted = new Set<string>();
    if (voterId) {
      for (const vote of await ctx.db
        .query("votes")
        .withIndex("by_voter", (q) => q.eq("voterId", voterId))
        .take(500)) {
        voted.add(vote.suggestionId);
      }
    }
    return suggestions.map((suggestion) => ({
      ...suggestion,
      votes: suggestion.votes ?? 0,
      voted: voted.has(suggestion._id),
    }));
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

// Adds this voter's vote, or takes it back if they already voted. Convex runs mutations as
// serializable transactions, so concurrent toggles can't leave two votes from one voter.
export const toggleVote = mutation({
  args: { suggestionId: v.id("suggestions"), voterId: v.string() },
  handler: async (ctx, { suggestionId, voterId }) => {
    if (voterId.trim().length === 0 || voterId.length > 64) {
      throw new Error("Voting needs a browser ID.");
    }
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion) throw new Error("That suggestion no longer exists.");
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_suggestion_and_voter", (q) =>
        q.eq("suggestionId", suggestionId).eq("voterId", voterId),
      )
      .unique();
    const votes = suggestion.votes ?? 0;
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(suggestionId, { votes: Math.max(0, votes - 1) });
      return { voted: false };
    }
    await ctx.db.insert("votes", { suggestionId, voterId });
    await ctx.db.patch(suggestionId, { votes: votes + 1 });
    return { voted: true };
  },
});
