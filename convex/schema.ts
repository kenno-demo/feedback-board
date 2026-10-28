import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  suggestions: defineTable({
    title: v.string(),
    votes: v.optional(v.number()),
  }),
  votes: defineTable({
    suggestionId: v.id("suggestions"),
    voterId: v.string(),
  })
    .index("by_voter", ["voterId"])
    .index("by_suggestion_and_voter", ["suggestionId", "voterId"]),
});
