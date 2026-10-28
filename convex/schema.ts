import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  suggestions: defineTable({
    title: v.string(),
    // Kept in step with the votes table; missing on suggestions from before voting.
    votes: v.optional(v.number()),
  }),
  // One row per browser per suggestion; voterId is a random ID the browser keeps.
  votes: defineTable({
    suggestionId: v.id("suggestions"),
    voterId: v.string(),
  }).index("by_voter_and_suggestion", ["voterId", "suggestionId"]),
});
