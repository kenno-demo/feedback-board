import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_VOTER_ID_LENGTH = 64;

// The board: most votes first, newest first among equals. Pass the browser's
// voter id to learn which suggestions it has already voted for.
export const list = query({
  args: { voterId: v.optional(v.string()) },
  handler: async (ctx, { voterId }) => {
    const newestFirst = await ctx.db.query("suggestions").order("desc").take(100);

    const mine = new Set<string>();
    if (voterId) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_voter_and_suggestion", (q) => q.eq("voterId", voterId))
        .collect();
      for (const vote of votes) mine.add(vote.suggestionId);
    }

    return newestFirst
      .map((suggestion) => ({
        _id: suggestion._id,
        _creationTime: suggestion._creationTime,
        title: suggestion.title,
        votes: suggestion.voteCount ?? 0,
        voted: mine.has(suggestion._id),
      }))
      .sort((a, b) => b.votes - a.votes); // stable, so ties stay newest first
  },
});

export const add = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const trimmed = title.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      throw new Error("A suggestion needs a title of 1 to 120 characters.");
    }
    return await ctx.db.insert("suggestions", { title: trimmed, voteCount: 0 });
  },
});

// Adds the browser's vote to a suggestion, or takes it back if it already voted.
export const toggleVote = mutation({
  args: { suggestionId: v.id("suggestions"), voterId: v.string() },
  handler: async (ctx, { suggestionId, voterId }) => {
    if (voterId.trim().length === 0 || voterId.length > MAX_VOTER_ID_LENGTH) {
      throw new Error("A vote needs a voter id.");
    }
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion) throw new Error("That suggestion no longer exists.");

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_voter_and_suggestion", (q) =>
        q.eq("voterId", voterId).eq("suggestionId", suggestionId),
      )
      .unique();
    const current = suggestion.voteCount ?? 0;

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(suggestionId, { voteCount: Math.max(0, current - 1) });
      return { voted: false };
    }
    await ctx.db.insert("votes", { suggestionId, voterId });
    await ctx.db.patch(suggestionId, { voteCount: current + 1 });
    return { voted: true };
  },
});
