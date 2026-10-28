import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  suggestions: defineTable({
    title: v.string(),
    planned: v.optional(v.boolean()),
  }),
  votes: defineTable({
    suggestionId: v.id("suggestions"),
    voter: v.string(),
  }).index("by_suggestion_voter", ["suggestionId", "voter"]),
});
