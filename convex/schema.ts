import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  suggestions: defineTable({
    title: v.string(),
    // Kept in step with the votes table so the board can sort without counting.
    voteCount: v.optional(v.number()),
  }),
  votes: defineTable({
    suggestionId: v.id("suggestions"),
    // A random id the browser keeps for itself; there is no sign-in.
    voterId: v.string(),
  }).index("by_voter_and_suggestion", ["voterId", "suggestionId"]),
});
