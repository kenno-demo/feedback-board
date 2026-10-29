import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  suggestions: defineTable({
    title: v.string(),
  }),
  // One row per browser that voted for a suggestion; voterId is a random ID the browser keeps.
  votes: defineTable({
    suggestionId: v.id("suggestions"),
    voterId: v.string(),
  }).index("by_suggestion_and_voter", ["suggestionId", "voterId"]),
});
